begin;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'leave_status') then
    create type public.leave_status as enum ('pending', 'approved', 'rejected', 'cancelled');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'leave_duration') then
    create type public.leave_duration as enum ('full_day', 'half_day');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'half_day_session') then
    create type public.half_day_session as enum ('am', 'pm');
  end if;
end
$$;

create table if not exists public.leave_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_paid boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id),
  start_date date not null,
  end_date date not null,
  duration public.leave_duration not null default 'full_day',
  half_day_session public.half_day_session,
  reason text not null,
  status public.leave_status not null default 'pending',
  approver_id uuid references auth.users(id),
  approver_note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leave_requests_date_range_check check (start_date <= end_date),
  constraint leave_requests_reason_length_check check (char_length(trim(reason)) >= 10),
  constraint leave_requests_half_day_validity_check check (
    (
      duration = 'half_day'
      and start_date = end_date
      and half_day_session is not null
    )
    or
    (
      duration = 'full_day'
      and half_day_session is null
    )
  )
);

create index if not exists leave_requests_user_created_at_idx
  on public.leave_requests (user_id, created_at desc);

create index if not exists leave_requests_status_submitted_at_idx
  on public.leave_requests (status, submitted_at asc);

create index if not exists leave_requests_start_end_date_idx
  on public.leave_requests (start_date, end_date);

create or replace function public.is_admin_user(check_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  is_admin boolean := false;
begin
  if check_user_id is null then
    return false;
  end if;

  if to_regclass('public.profiles') is null then
    return false;
  end if;

  execute
    'select exists (
       select 1
       from public.profiles
       where id = $1
         and role = ''admin''
     )'
  into is_admin
  using check_user_id;

  return coalesce(is_admin, false);
end;
$$;

create or replace function public.set_leave_request_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.guard_leave_request_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requester uuid := auth.uid();
  requester_is_admin boolean := public.is_admin_user(requester);
begin
  if tg_op = 'INSERT' then
    if requester is not null and not requester_is_admin and new.start_date < current_date then
      raise exception 'Past-date leave requests are only allowed for admins.';
    end if;

    if requester is not null and not requester_is_admin then
      if new.status <> 'pending' then
        raise exception 'Employees can only create pending leave requests.';
      end if;

      if new.approver_id is not null or new.approver_note is not null or new.reviewed_at is not null then
        raise exception 'Employees cannot set approval fields.';
      end if;
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if requester is not null and not requester_is_admin then
      if old.user_id <> requester then
        raise exception 'You can only update your own leave requests.';
      end if;

      if old.status <> 'pending' then
        raise exception 'Only pending leave requests can be updated.';
      end if;

      if new.status <> 'cancelled' then
        raise exception 'Employees can only cancel pending requests.';
      end if;

      if new.user_id <> old.user_id
        or new.leave_type_id <> old.leave_type_id
        or new.start_date <> old.start_date
        or new.end_date <> old.end_date
        or new.duration <> old.duration
        or coalesce(new.half_day_session::text, '') <> coalesce(old.half_day_session::text, '')
        or new.reason <> old.reason
      then
        raise exception 'Employees cannot edit leave details when cancelling.';
      end if;

      if new.approver_id is not null or new.approver_note is not null or new.reviewed_at is not null then
        raise exception 'Employees cannot set approval fields.';
      end if;

      if new.cancelled_at is null then
        new.cancelled_at := now();
      end if;
    elsif requester is not null and requester_is_admin then
      if new.status in ('approved', 'rejected') and new.reviewed_at is null then
        new.reviewed_at := now();
      end if;

      if new.status in ('approved', 'rejected') and new.approver_id is null then
        new.approver_id := requester;
      end if;
    end if;

    if requester is not null and not requester_is_admin and new.start_date < current_date then
      raise exception 'Past-date leave requests are only allowed for admins.';
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_leave_request_mutation on public.leave_requests;
create trigger trg_guard_leave_request_mutation
before insert or update on public.leave_requests
for each row
execute function public.guard_leave_request_mutation();

drop trigger if exists trg_set_leave_request_updated_at on public.leave_requests;
create trigger trg_set_leave_request_updated_at
before update on public.leave_requests
for each row
execute function public.set_leave_request_updated_at();

alter table public.leave_types enable row level security;
alter table public.leave_requests enable row level security;

drop policy if exists leave_types_select_active on public.leave_types;
create policy leave_types_select_active
on public.leave_types
for select
to authenticated
using (is_active = true);

drop policy if exists leave_requests_select_own on public.leave_requests;
create policy leave_requests_select_own
on public.leave_requests
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists leave_requests_select_admin on public.leave_requests;
create policy leave_requests_select_admin
on public.leave_requests
for select
to authenticated
using (public.is_admin_user(auth.uid()));

drop policy if exists leave_requests_insert_employee on public.leave_requests;
create policy leave_requests_insert_employee
on public.leave_requests
for insert
to authenticated
with check (
  auth.uid() = user_id
  and status = 'pending'
  and approver_id is null
  and approver_note is null
  and reviewed_at is null
  and (start_date >= current_date or public.is_admin_user(auth.uid()))
);

drop policy if exists leave_requests_insert_admin on public.leave_requests;
create policy leave_requests_insert_admin
on public.leave_requests
for insert
to authenticated
with check (public.is_admin_user(auth.uid()));

drop policy if exists leave_requests_update_employee_cancel on public.leave_requests;
create policy leave_requests_update_employee_cancel
on public.leave_requests
for update
to authenticated
using (auth.uid() = user_id and status = 'pending')
with check (auth.uid() = user_id and status = 'cancelled');

drop policy if exists leave_requests_update_admin on public.leave_requests;
create policy leave_requests_update_admin
on public.leave_requests
for update
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

grant select on public.leave_types to authenticated;
grant select, insert, update on public.leave_requests to authenticated;

insert into public.leave_types (code, name, description, is_paid, is_active, sort_order)
values
  ('sick', 'Sick Leave', 'Leave used for health-related recovery or appointments.', true, true, 1),
  ('vacation', 'Vacation Leave', 'Planned personal vacation or rest leave.', true, true, 2),
  ('emergency', 'Emergency Leave', 'Unexpected urgent personal or family events.', true, true, 3),
  ('unpaid', 'Unpaid Leave', 'Extended leave without paid allowance.', false, true, 4)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  is_paid = excluded.is_paid,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

commit;
