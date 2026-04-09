begin;

create extension if not exists pgcrypto;

create table if not exists public.shift_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  start_time time not null,
  end_time time not null,
  grace_minutes integer not null default 0,
  break_minutes integer not null default 0,
  second_break_minutes integer not null default 0,
  is_overnight boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shift_templates_name_not_blank check (char_length(btrim(name)) > 0),
  constraint shift_templates_grace_minutes_nonnegative check (grace_minutes >= 0),
  constraint shift_templates_break_minutes_nonnegative check (break_minutes >= 0),
  constraint shift_templates_second_break_minutes_nonnegative check (
    second_break_minutes >= 0
  )
);

create index if not exists shift_templates_company_id_idx
  on public.shift_templates (company_id);

create table if not exists public.employee_schedule_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  shift_template_id uuid references public.shift_templates(id) on delete set null,
  work_date date not null,
  start_time time not null,
  end_time time not null,
  grace_minutes integer not null default 0,
  break_minutes integer not null default 0,
  second_break_minutes integer not null default 0,
  is_rest_day boolean not null default false,
  is_overnight boolean not null default false,
  source text not null default 'manual',
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_schedule_assignments_grace_minutes_nonnegative check (
    grace_minutes >= 0
  ),
  constraint employee_schedule_assignments_break_minutes_nonnegative check (
    break_minutes >= 0
  ),
  constraint employee_schedule_assignments_second_break_minutes_nonnegative check (
    second_break_minutes >= 0
  ),
  constraint employee_schedule_assignments_source_valid check (
    source in ('manual', 'batch', 'template')
  ),
  constraint employee_schedule_assignments_company_user_work_date_unique unique (
    company_id,
    user_id,
    work_date
  )
);

create index if not exists employee_schedule_assignments_company_work_date_idx
  on public.employee_schedule_assignments (company_id, work_date);

create index if not exists employee_schedule_assignments_shift_template_id_idx
  on public.employee_schedule_assignments (shift_template_id);

create or replace function public.set_schedule_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.normalize_shift_template_row()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.name := btrim(new.name);
  return new;
end;
$$;

create or replace function public.guard_employee_schedule_assignment_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.notes := nullif(btrim(coalesce(new.notes, '')), '');

  if not exists (
    select 1
    from public.company_memberships employee_membership
    where employee_membership.user_id = new.user_id
      and employee_membership.company_id = new.company_id
      and employee_membership.role = 'employee'
  ) then
    raise exception 'Schedule assignments can only target employees in the same company.';
  end if;

  if not exists (
    select 1
    from public.company_memberships creator_membership
    where creator_membership.user_id = new.created_by
      and creator_membership.company_id = new.company_id
      and creator_membership.role = 'admin'
  ) then
    raise exception 'Schedule assignments must be created by an admin in the same company.';
  end if;

  if new.shift_template_id is not null and not exists (
    select 1
    from public.shift_templates template_row
    where template_row.id = new.shift_template_id
      and template_row.company_id = new.company_id
  ) then
    raise exception 'Schedule assignments must use a shift template from the same company.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_normalize_shift_template_row on public.shift_templates;
create trigger trg_normalize_shift_template_row
before insert or update of name on public.shift_templates
for each row
execute function public.normalize_shift_template_row();

drop trigger if exists trg_set_shift_template_updated_at on public.shift_templates;
create trigger trg_set_shift_template_updated_at
before update on public.shift_templates
for each row
execute function public.set_schedule_updated_at();

drop trigger if exists trg_guard_employee_schedule_assignment_mutation on public.employee_schedule_assignments;
create trigger trg_guard_employee_schedule_assignment_mutation
before insert or update on public.employee_schedule_assignments
for each row
execute function public.guard_employee_schedule_assignment_mutation();

drop trigger if exists trg_set_employee_schedule_assignment_updated_at on public.employee_schedule_assignments;
create trigger trg_set_employee_schedule_assignment_updated_at
before update on public.employee_schedule_assignments
for each row
execute function public.set_schedule_updated_at();

alter table public.shift_templates enable row level security;
alter table public.employee_schedule_assignments enable row level security;

drop policy if exists shift_templates_select_admin_same_company on public.shift_templates;
drop policy if exists shift_templates_insert_admin_same_company on public.shift_templates;
drop policy if exists shift_templates_update_admin_same_company on public.shift_templates;

create policy shift_templates_select_admin_same_company
on public.shift_templates
for select
to authenticated
using (public.is_admin_in_company(auth.uid(), company_id));

create policy shift_templates_insert_admin_same_company
on public.shift_templates
for insert
to authenticated
with check (public.is_admin_in_company(auth.uid(), company_id));

create policy shift_templates_update_admin_same_company
on public.shift_templates
for update
to authenticated
using (public.is_admin_in_company(auth.uid(), company_id))
with check (public.is_admin_in_company(auth.uid(), company_id));

drop policy if exists employee_schedule_assignments_select_own on public.employee_schedule_assignments;
drop policy if exists employee_schedule_assignments_select_admin_same_company on public.employee_schedule_assignments;
drop policy if exists employee_schedule_assignments_insert_admin_same_company on public.employee_schedule_assignments;
drop policy if exists employee_schedule_assignments_update_admin_same_company on public.employee_schedule_assignments;

create policy employee_schedule_assignments_select_own
on public.employee_schedule_assignments
for select
to authenticated
using (
  user_id = auth.uid()
  and company_id is not distinct from public.current_company_id()
);

create policy employee_schedule_assignments_select_admin_same_company
on public.employee_schedule_assignments
for select
to authenticated
using (public.is_admin_in_company(auth.uid(), company_id));

create policy employee_schedule_assignments_insert_admin_same_company
on public.employee_schedule_assignments
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_admin_in_company(auth.uid(), company_id)
);

create policy employee_schedule_assignments_update_admin_same_company
on public.employee_schedule_assignments
for update
to authenticated
using (public.is_admin_in_company(auth.uid(), company_id))
with check (
  created_by = auth.uid()
  and public.is_admin_in_company(auth.uid(), company_id)
);

grant select, insert, update on public.shift_templates to authenticated;
grant select, insert, update on public.employee_schedule_assignments to authenticated;
grant all on public.shift_templates to service_role;
grant all on public.employee_schedule_assignments to service_role;

commit;
