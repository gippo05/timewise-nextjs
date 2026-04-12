begin;

alter table public.attendance
  add column if not exists schedule_assignment_id uuid references public.employee_schedule_assignments(id) on delete set null;

create index if not exists attendance_schedule_assignment_id_idx
  on public.attendance (schedule_assignment_id);

commit;
