begin;

create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.attendance enable row level security;

alter table public.profiles add column if not exists company_id uuid;
alter table public.attendance add column if not exists company_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    join pg_attribute a on a.attrelid = t.oid and a.attnum = any(c.conkey)
    where n.nspname = 'public'
      and t.relname = 'profiles'
      and c.contype = 'f'
      and c.confrelid = 'public.companies'::regclass
      and a.attname = 'company_id'
  ) then
    alter table public.profiles
      add constraint profiles_company_id_fkey
      foreign key (company_id) references public.companies(id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    join pg_attribute a on a.attrelid = t.oid and a.attnum = any(c.conkey)
    where n.nspname = 'public'
      and t.relname = 'attendance'
      and c.contype = 'f'
      and c.confrelid = 'public.companies'::regclass
      and a.attname = 'company_id'
  ) then
    alter table public.attendance
      add constraint attendance_company_id_fkey
      foreign key (company_id) references public.companies(id);
  end if;
end
$$;

create index if not exists profiles_company_id_idx on public.profiles (company_id);
create index if not exists attendance_company_id_idx on public.attendance (company_id);
create index if not exists attendance_user_id_company_id_idx on public.attendance (user_id, company_id);

update public.attendance a
set company_id = p.company_id
from public.profiles p
where p.id = a.user_id
  and a.company_id is distinct from p.company_id;

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.company_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

create or replace function public.sync_attendance_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_company_id uuid;
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;

  select p.company_id
  into profile_company_id
  from public.profiles p
  where p.id = new.user_id;

  new.company_id := profile_company_id;
  return new;
end;
$$;

drop trigger if exists trg_sync_attendance_company_id on public.attendance;
create trigger trg_sync_attendance_company_id
before insert or update of user_id, company_id on public.attendance
for each row
execute function public.sync_attendance_company_id();

grant select on public.companies to authenticated;
grant all on public.companies to service_role;

drop policy if exists companies_select_own on public.companies;
create policy companies_select_own
on public.companies
for select
to authenticated
using (id = public.current_company_id());

drop policy if exists "Enable read access for all users" on public.profiles;
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_select_tenant_scoped on public.profiles;

drop policy if exists "Allow Users to update their profile" on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_update_own_tenant on public.profiles;

drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_insert_own_tenant on public.profiles;

create policy profiles_select_tenant_scoped
on public.profiles
for select
to authenticated
using (
  company_id is not distinct from public.current_company_id()
  and (
    id = auth.uid()
    or (public.is_admin_user(auth.uid()) and role = 'employee')
  )
);

create policy profiles_insert_own_tenant
on public.profiles
for insert
to authenticated
with check (
  auth.uid() = id
  and (company_id is null or company_id is not distinct from public.current_company_id())
);

create policy profiles_update_own_tenant
on public.profiles
for update
to authenticated
using (
  auth.uid() = id
  and company_id is not distinct from public.current_company_id()
)
with check (
  auth.uid() = id
  and company_id is not distinct from public.current_company_id()
  and role = public.current_user_role()
);

drop policy if exists "Admins view all attendance" on public.attendance;
drop policy if exists "Enable users to view their own data only" on public.attendance;
drop policy if exists attendance_select_own_tenant on public.attendance;
drop policy if exists attendance_select_admin_same_company_employees on public.attendance;

drop policy if exists "Enable insert for users based on user_id" on public.attendance;
drop policy if exists attendance_insert_own_tenant on public.attendance;

drop policy if exists "Users can update their attendance" on public.attendance;
drop policy if exists attendance_update_own_tenant on public.attendance;

create policy attendance_select_own_tenant
on public.attendance
for select
to authenticated
using (
  auth.uid() = user_id
  and company_id is not distinct from public.current_company_id()
);

create policy attendance_select_admin_same_company_employees
on public.attendance
for select
to authenticated
using (
  public.is_admin_user(auth.uid())
  and company_id is not distinct from public.current_company_id()
  and (
    user_id = auth.uid()
    or exists (
      select 1
      from public.profiles target
      where target.id = user_id
        and target.company_id is not distinct from public.current_company_id()
        and target.role = 'employee'
    )
  )
);

create policy attendance_insert_own_tenant
on public.attendance
for insert
to authenticated
with check (
  auth.uid() = user_id
  and company_id is not distinct from public.current_company_id()
);

create policy attendance_update_own_tenant
on public.attendance
for update
to authenticated
using (
  auth.uid() = user_id
  and company_id is not distinct from public.current_company_id()
)
with check (
  auth.uid() = user_id
  and company_id is not distinct from public.current_company_id()
);

do $$
begin
  if to_regclass('public.leave_requests') is not null then
    execute 'drop policy if exists leave_requests_select_own on public.leave_requests';
    execute 'drop policy if exists leave_requests_select_admin on public.leave_requests';
    execute 'drop policy if exists leave_requests_insert_employee on public.leave_requests';
    execute 'drop policy if exists leave_requests_insert_admin on public.leave_requests';
    execute 'drop policy if exists leave_requests_update_employee_cancel on public.leave_requests';
    execute 'drop policy if exists leave_requests_update_admin on public.leave_requests';

    execute $pol$
      create policy leave_requests_select_own
      on public.leave_requests
      for select
      to authenticated
      using (auth.uid() = user_id)
    $pol$;

    execute $pol$
      create policy leave_requests_select_admin
      on public.leave_requests
      for select
      to authenticated
      using (
        public.is_admin_user(auth.uid())
        and exists (
          select 1
          from public.profiles me
          join public.profiles target on target.id = user_id
          where me.id = auth.uid()
            and target.company_id is not distinct from me.company_id
            and (target.role = 'employee' or target.id = auth.uid())
        )
      )
    $pol$;

    execute $pol$
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
      )
    $pol$;

    execute $pol$
      create policy leave_requests_insert_admin
      on public.leave_requests
      for insert
      to authenticated
      with check (
        public.is_admin_user(auth.uid())
        and exists (
          select 1
          from public.profiles me
          join public.profiles target on target.id = user_id
          where me.id = auth.uid()
            and target.company_id is not distinct from me.company_id
            and (target.role = 'employee' or target.id = auth.uid())
        )
      )
    $pol$;

    execute $pol$
      create policy leave_requests_update_employee_cancel
      on public.leave_requests
      for update
      to authenticated
      using (auth.uid() = user_id and status = 'pending')
      with check (auth.uid() = user_id and status = 'cancelled')
    $pol$;

    execute $pol$
      create policy leave_requests_update_admin
      on public.leave_requests
      for update
      to authenticated
      using (
        public.is_admin_user(auth.uid())
        and exists (
          select 1
          from public.profiles me
          join public.profiles target on target.id = user_id
          where me.id = auth.uid()
            and target.company_id is not distinct from me.company_id
            and (target.role = 'employee' or target.id = auth.uid())
        )
      )
      with check (
        public.is_admin_user(auth.uid())
        and exists (
          select 1
          from public.profiles me
          join public.profiles target on target.id = user_id
          where me.id = auth.uid()
            and target.company_id is not distinct from me.company_id
            and (target.role = 'employee' or target.id = auth.uid())
        )
      )
    $pol$;
  end if;
end
$$;

commit;
