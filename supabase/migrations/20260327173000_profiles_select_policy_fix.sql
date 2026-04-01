begin;

drop policy if exists profiles_select_tenant_scoped on public.profiles;
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
  and role = 'employee'
  and exists (
    select 1
    from public.profiles me
    where me.id = auth.uid()
      and me.company_id is not distinct from profiles.company_id
  )
);

commit;
