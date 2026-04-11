begin;

alter table public.employee_schedule_assignments
  drop constraint if exists employee_schedule_assignments_company_user_work_date_unique;

alter table public.employee_schedule_assignments
  add constraint employee_schedule_assignments_company_user_work_segment_unique unique (
    company_id,
    user_id,
    work_date,
    start_time,
    end_time
  );

commit;
