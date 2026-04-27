begin;

alter table public.attendance
  add column if not exists last_edited_by uuid references public.profiles(id) on delete set null,
  add column if not exists last_edited_at timestamptz;

create index if not exists attendance_last_edited_by_idx
  on public.attendance (last_edited_by);

drop policy if exists attendance_update_admin_same_company on public.attendance;

create policy attendance_update_admin_same_company
on public.attendance
for update
to authenticated
using (
  public.is_admin_in_company(auth.uid(), company_id)
  and exists (
    select 1
    from public.company_memberships target_membership
    where target_membership.user_id = attendance.user_id
      and target_membership.company_id = attendance.company_id
      and target_membership.role = 'employee'
  )
)
with check (
  public.is_admin_in_company(auth.uid(), company_id)
  and exists (
    select 1
    from public.company_memberships target_membership
    where target_membership.user_id = attendance.user_id
      and target_membership.company_id = attendance.company_id
      and target_membership.role = 'employee'
  )
);

create or replace function public.guard_attendance_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_is_self boolean;
  actor_is_admin_for_employee boolean;
  previous_time timestamptz;
  previous_label text;
begin
  if actor_id is null then
    raise exception 'Attendance updates require an authenticated user.';
  end if;

  if new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.company_id is distinct from old.company_id
    or new.created_at is distinct from old.created_at
    or new.schedule_assignment_id is distinct from old.schedule_assignment_id
    or new.late_minutes is distinct from old.late_minutes
  then
    raise exception 'Attendance identity, tenant, schedule, and late-minute fields cannot be changed here.';
  end if;

  if new.clock_in is null then
    raise exception 'Clock in is required.';
  end if;

  if new.end_break is not null and new.break is null then
    raise exception 'Break start is required when break end is set.';
  end if;

  if new.end_second_break is not null and new.second_break is null then
    raise exception 'Second break start is required when second break end is set.';
  end if;

  previous_time := new.clock_in;
  previous_label := 'Clock in';

  if new.break is not null then
    if new.break < previous_time then
      raise exception 'Break start cannot be earlier than %.', previous_label;
    end if;
    previous_time := new.break;
    previous_label := 'Break start';
  end if;

  if new.end_break is not null then
    if new.end_break < previous_time then
      raise exception 'Break end cannot be earlier than %.', previous_label;
    end if;
    previous_time := new.end_break;
    previous_label := 'Break end';
  end if;

  if new.second_break is not null then
    if new.second_break < previous_time then
      raise exception 'Second break start cannot be earlier than %.', previous_label;
    end if;
    previous_time := new.second_break;
    previous_label := 'Second break start';
  end if;

  if new.end_second_break is not null then
    if new.end_second_break < previous_time then
      raise exception 'Second break end cannot be earlier than %.', previous_label;
    end if;
    previous_time := new.end_second_break;
    previous_label := 'Second break end';
  end if;

  if new.clock_out is not null and new.clock_out < previous_time then
    raise exception 'Clock out cannot be earlier than %.', previous_label;
  end if;

  actor_is_self := actor_id = old.user_id;

  actor_is_admin_for_employee := public.is_admin_in_company(actor_id, old.company_id)
    and exists (
      select 1
      from public.company_memberships target_membership
      where target_membership.user_id = old.user_id
        and target_membership.company_id = old.company_id
        and target_membership.role = 'employee'
    );

  if actor_is_admin_for_employee then
    new.last_edited_by := actor_id;
    new.last_edited_at := now();
    return new;
  end if;

  if actor_is_self then
    if new.last_edited_by is distinct from old.last_edited_by
      or new.last_edited_at is distinct from old.last_edited_at
    then
      raise exception 'Attendance edit audit fields are managed by admin corrections.';
    end if;

    return new;
  end if;

  raise exception 'Only admins can edit employee attendance in their own company.';
end;
$$;

drop trigger if exists trg_guard_attendance_update on public.attendance;
create trigger trg_guard_attendance_update
before update on public.attendance
for each row
execute function public.guard_attendance_update();

commit;
