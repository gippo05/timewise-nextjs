begin;

drop policy if exists attendance_select_own_tenant on public.attendance;
drop policy if exists attendance_select_admin_same_company_employees on public.attendance;
drop policy if exists attendance_insert_own_tenant on public.attendance;
drop policy if exists attendance_update_own_tenant on public.attendance;

create policy attendance_select_own_tenant
on public.attendance
for select
to authenticated
using (auth.uid() = user_id);

create policy attendance_insert_own_tenant
on public.attendance
for insert
to authenticated
with check (auth.uid() = user_id);

create policy attendance_update_own_tenant
on public.attendance
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy attendance_select_admin_same_company_employees
on public.attendance
for select
to authenticated
using (
  public.is_admin_user(auth.uid())
  and exists (
    select 1
    from public.profiles me
    join public.profiles target on target.id = attendance.user_id
    where me.id = auth.uid()
      and target.company_id is not distinct from me.company_id
      and (target.role = 'employee' or target.id = auth.uid())
  )
);

commit;
