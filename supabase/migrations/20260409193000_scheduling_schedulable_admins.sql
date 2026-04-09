begin;

create or replace function public.guard_employee_schedule_assignment_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.notes := nullif(btrim(coalesce(new.notes, '')), '');

  if not exists (
    select 1
    from public.company_memberships target_membership
    where target_membership.user_id = new.user_id
      and target_membership.company_id = new.company_id
      and target_membership.role in ('admin', 'employee')
  ) then
    raise exception 'Schedule assignments can only target eligible company members.';
  end if;

  if not exists (
    select 1
    from public.company_memberships creator_membership
    where creator_membership.user_id = new.created_by
      and creator_membership.company_id = new.company_id
      and creator_membership.role = 'admin'
  ) then
    raise exception 'Schedule assignments must be created by an admin in the same company.';
  end if;

  if new.shift_template_id is not null and not exists (
    select 1
    from public.shift_templates template_row
    where template_row.id = new.shift_template_id
      and template_row.company_id = new.company_id
  ) then
    raise exception 'Schedule assignments must use a shift template from the same company.';
  end if;

  return new;
end;
$$;

drop policy if exists profiles_select_admin_same_company_employees on public.profiles;
drop policy if exists profiles_select_admin_same_company_schedulable_members on public.profiles;

create policy profiles_select_admin_same_company_schedulable_members
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships target_membership
    where target_membership.user_id = profiles.id
      and target_membership.role in ('admin', 'employee')
      and public.is_admin_in_company(auth.uid(), target_membership.company_id)
  )
);

commit;
