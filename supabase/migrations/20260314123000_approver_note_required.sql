begin;

update public.leave_requests
set approver_note = 'Legacy decision note unavailable.'
where status in ('approved', 'rejected')
  and (approver_note is null or btrim(approver_note) = '');

alter table public.leave_requests
drop constraint if exists leave_requests_admin_decision_note_check;

alter table public.leave_requests
add constraint leave_requests_admin_decision_note_check
check (
  status not in ('approved', 'rejected')
  or char_length(trim(coalesce(approver_note, ''))) > 0
);

commit;
