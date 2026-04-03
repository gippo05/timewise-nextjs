begin;

create or replace function public.is_admin_in_company(
  check_user_id uuid,
  check_company_id uuid
)
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
      and cm.company_id = check_company_id
      and cm.role = 'admin'
  );
$$;

drop policy if exists company_memberships_select_own on public.company_memberships;
drop policy if exists company_memberships_select_admin_same_company on public.company_memberships;

create policy company_memberships_select_own
on public.company_memberships
for select
to authenticated
using (user_id = auth.uid());

create policy company_memberships_select_admin_same_company
on public.company_memberships
for select
to authenticated
using (public.is_admin_in_company(auth.uid(), company_id));

drop policy if exists invitations_select_admin_same_company on public.invitations;
drop policy if exists invitations_insert_admin_same_company on public.invitations;
drop policy if exists invitations_update_admin_same_company on public.invitations;

create policy invitations_select_admin_same_company
on public.invitations
for select
to authenticated
using (public.is_admin_in_company(auth.uid(), company_id));

create policy invitations_insert_admin_same_company
on public.invitations
for insert
to authenticated
with check (
  role = 'employee'
  and status = 'pending'
  and invited_by = auth.uid()
  and expires_at > now()
  and public.is_admin_in_company(auth.uid(), company_id)
);

create policy invitations_update_admin_same_company
on public.invitations
for update
to authenticated
using (public.is_admin_in_company(auth.uid(), company_id))
with check (
  role = 'employee'
  and public.is_admin_in_company(auth.uid(), company_id)
);

commit;
