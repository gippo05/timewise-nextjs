begin;

create extension if not exists pgcrypto;

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;

update public.profiles p
set email = lower(u.email)
from auth.users u
where u.id = p.id
  and u.email is not null
  and p.email is null;

update public.profiles p
set full_name = nullif(trim(concat_ws(' ', p.first_name, p.last_name)), '')
where p.full_name is null;

create unique index if not exists profiles_email_lower_unique
  on public.profiles (lower(email))
  where email is not null;

create table if not exists public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'employee')),
  created_at timestamptz not null default now(),
  constraint company_memberships_company_user_unique unique (company_id, user_id),
  constraint company_memberships_user_unique unique (user_id)
);

create index if not exists company_memberships_company_role_idx
  on public.company_memberships (company_id, role);
create index if not exists company_memberships_user_role_idx
  on public.company_memberships (user_id, role);

insert into public.company_memberships (company_id, user_id, role)
select
  p.company_id,
  p.id,
  case when p.role = 'admin' then 'admin' else 'employee' end
from public.profiles p
where p.company_id is not null
on conflict (user_id) do update
set
  company_id = excluded.company_id,
  role = excluded.role;

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role text not null default 'employee' check (role = 'employee'),
  invited_by uuid not null references public.profiles(id) on delete restrict,
  token_hash text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists invitations_token_hash_unique
  on public.invitations (token_hash);

create unique index if not exists invitations_one_pending_per_company_email
  on public.invitations (company_id, lower(email))
  where status = 'pending';

create index if not exists invitations_company_status_created_idx
  on public.invitations (company_id, status, created_at desc);

create index if not exists invitations_company_email_idx
  on public.invitations (company_id, lower(email));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name, email, full_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    lower(new.email),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name);
  return new;
end;
$$;

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select cm.company_id
      from public.company_memberships cm
      where cm.user_id = auth.uid()
      limit 1
    ),
    (
      select p.company_id
      from public.profiles p
      where p.id = auth.uid()
      limit 1
    )
  );
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select cm.role
      from public.company_memberships cm
      where cm.user_id = auth.uid()
      limit 1
    ),
    (
      select p.role
      from public.profiles p
      where p.id = auth.uid()
      limit 1
    )
  );
$$;

create or replace function public.is_admin_user(check_user_id uuid)
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
      and cm.role = 'admin'
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = check_user_id
      and p.role = 'admin'
  );
$$;

create or replace function public.normalize_invitation_row()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.email := lower(trim(new.email));
  new.role := 'employee';
  return new;
end;
$$;

create or replace function public.sync_profile_from_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    company_id = new.company_id,
    role = new.role
  where id = new.user_id;

  return new;
end;
$$;

drop trigger if exists trg_normalize_invitation_row on public.invitations;
create trigger trg_normalize_invitation_row
before insert or update of email, role on public.invitations
for each row
execute function public.normalize_invitation_row();

drop trigger if exists trg_sync_profile_from_membership on public.company_memberships;
create trigger trg_sync_profile_from_membership
after insert or update of company_id, role on public.company_memberships
for each row
execute function public.sync_profile_from_membership();

alter table public.company_memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.profiles enable row level security;

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
using (
  exists (
    select 1
    from public.company_memberships me
    where me.user_id = auth.uid()
      and me.role = 'admin'
      and me.company_id = company_memberships.company_id
  )
);

drop policy if exists invitations_select_admin_same_company on public.invitations;
drop policy if exists invitations_insert_admin_same_company on public.invitations;
drop policy if exists invitations_update_admin_same_company on public.invitations;

create policy invitations_select_admin_same_company
on public.invitations
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships me
    where me.user_id = auth.uid()
      and me.role = 'admin'
      and me.company_id = invitations.company_id
  )
);

create policy invitations_insert_admin_same_company
on public.invitations
for insert
to authenticated
with check (
  role = 'employee'
  and status = 'pending'
  and invited_by = auth.uid()
  and expires_at > now()
  and exists (
    select 1
    from public.company_memberships me
    where me.user_id = auth.uid()
      and me.role = 'admin'
      and me.company_id = invitations.company_id
  )
);

create policy invitations_update_admin_same_company
on public.invitations
for update
to authenticated
using (
  exists (
    select 1
    from public.company_memberships me
    where me.user_id = auth.uid()
      and me.role = 'admin'
      and me.company_id = invitations.company_id
  )
)
with check (
  role = 'employee'
  and exists (
    select 1
    from public.company_memberships me
    where me.user_id = auth.uid()
      and me.role = 'admin'
      and me.company_id = invitations.company_id
  )
);

grant select on public.company_memberships to authenticated;
grant select, insert, update on public.invitations to authenticated;
grant all on public.company_memberships to service_role;
grant all on public.invitations to service_role;

commit;
