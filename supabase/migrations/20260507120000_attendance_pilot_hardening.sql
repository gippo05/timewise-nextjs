begin;

create unique index if not exists attendance_one_active_shift_per_user
  on public.attendance (user_id)
  where clock_out is null;

create index if not exists attendance_active_user_created_idx
  on public.attendance (user_id, created_at desc)
  where clock_out is null;

create index if not exists attendance_user_created_idx
  on public.attendance (user_id, created_at desc);

create index if not exists attendance_company_created_idx
  on public.attendance (company_id, created_at desc);

create or replace function public.guard_attendance_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  membership_company_id uuid;
  fallback_start_time time;
  fallback_grace_minutes integer;
  assignment_row record;
  scheduled_start timestamptz;
  computed_late_minutes integer := 0;
begin
  if actor_id is null then
    raise exception 'Attendance inserts require an authenticated user.';
  end if;

  if new.user_id is null then
    new.user_id := actor_id;
  end if;

  if new.user_id is distinct from actor_id then
    raise exception 'Users can only create their own attendance records.';
  end if;

  select cm.company_id
  into membership_company_id
  from public.company_memberships cm
  where cm.user_id = actor_id
  limit 1;

  if membership_company_id is null then
    select p.company_id, p.expected_start_time, coalesce(p.grace_minutes, 5)
    into membership_company_id, fallback_start_time, fallback_grace_minutes
    from public.profiles p
    where p.id = actor_id;
  else
    select p.expected_start_time, coalesce(p.grace_minutes, 5)
    into fallback_start_time, fallback_grace_minutes
    from public.profiles p
    where p.id = actor_id;
  end if;

  if membership_company_id is null then
    raise exception 'Attendance requires company membership.';
  end if;

  new.company_id := membership_company_id;

  if new.clock_in is null then
    new.clock_in := now();
  end if;

  if new.break is not null
    or new.end_break is not null
    or new.second_break is not null
    or new.end_second_break is not null
    or new.clock_out is not null
    or new.last_edited_by is not null
    or new.last_edited_at is not null
  then
    raise exception 'Attendance rows must start with clock-in only.';
  end if;

  if new.schedule_assignment_id is not null then
    select
      esa.id,
      esa.company_id,
      esa.user_id,
      esa.work_date,
      esa.start_time,
      esa.grace_minutes,
      esa.is_rest_day
    into assignment_row
    from public.employee_schedule_assignments esa
    where esa.id = new.schedule_assignment_id;

    if assignment_row.id is null
      or assignment_row.company_id is distinct from new.company_id
      or assignment_row.user_id is distinct from new.user_id
    then
      raise exception 'Attendance schedule assignment must belong to the same user and company.';
    end if;

    if not assignment_row.is_rest_day then
      scheduled_start :=
        (assignment_row.work_date::timestamp + assignment_row.start_time) at time zone 'UTC';
      computed_late_minutes := greatest(
        floor(
          extract(epoch from (
            new.clock_in
            - scheduled_start
            - make_interval(mins => coalesce(assignment_row.grace_minutes, 5))
          )) / 60
        )::integer,
        0
      );
    end if;
  elsif fallback_start_time is not null then
    scheduled_start :=
      ((new.clock_in at time zone 'UTC')::date::timestamp + fallback_start_time) at time zone 'UTC';
    computed_late_minutes := greatest(
      floor(
        extract(epoch from (
          new.clock_in
          - scheduled_start
          - make_interval(mins => coalesce(fallback_grace_minutes, 5))
        )) / 60
      )::integer,
      0
    );
  end if;

  new.late_minutes := computed_late_minutes;
  return new;
end;
$$;

drop trigger if exists trg_validate_attendance_insert on public.attendance;
create trigger trg_validate_attendance_insert
before insert on public.attendance
for each row
execute function public.guard_attendance_insert();

commit;
