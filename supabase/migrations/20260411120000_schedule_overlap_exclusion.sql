begin;

create extension if not exists btree_gist;

alter table public.employee_schedule_assignments
  drop constraint if exists employee_schedule_assignments_no_time_overlap;

alter table public.employee_schedule_assignments
  add constraint employee_schedule_assignments_no_time_overlap exclude using gist (
    company_id with =,
    user_id with =,
    work_date with =,
    tsrange(
      work_date::timestamp + start_time,
      case
        when is_rest_day then work_date::timestamp + interval '1 day'
        when is_overnight or end_time < start_time then work_date::timestamp + interval '1 day' + end_time
        else work_date::timestamp + end_time
      end,
      '[)'
    ) with &&
  );

commit;
