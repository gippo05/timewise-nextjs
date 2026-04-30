begin;

drop policy if exists attendance_select_admin_same_company_employees on public.attendance;
drop policy if exists attendance_select_admin_same_company_members on public.attendance;

create policy attendance_select_admin_same_company_members
on public.attendance
for select
to authenticated
using (
  public.is_admin_in_company(auth.uid(), attendance.company_id)
  and (
    attendance.user_id = auth.uid()
    or exists (
      select 1
      from public.company_memberships target_membership
      where target_membership.user_id = attendance.user_id
        and target_membership.company_id = attendance.company_id
        and target_membership.role = 'employee'
    )
  )
);

commit;
