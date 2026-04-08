begin;

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select cm.company_id
  from public.company_memberships cm
  where cm.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select cm.role
  from public.company_memberships cm
  where cm.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_admin_user(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_memberships cm
    where cm.user_id = check_user_id
      and cm.role = 'admin'
  );
$$;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_admin_same_company_employees on public.profiles;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy profiles_select_admin_same_company_employees
on public.profiles
for select
to authenticated
using (
  public.is_admin_user(auth.uid())
  and exists (
    select 1
    from public.company_memberships target
    where target.user_id = profiles.id
      and target.company_id is not distinct from public.current_company_id()
      and target.role = 'employee'
  )
);

commit;
