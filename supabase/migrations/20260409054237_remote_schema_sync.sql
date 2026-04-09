set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.current_company_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select cm.company_id
  from public.company_memberships cm
  where cm.user_id = auth.uid()
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select cm.role
  from public.company_memberships cm
  where cm.user_id = auth.uid()
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin_in_company(check_user_id uuid, check_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.company_memberships cm
    where cm.user_id = check_user_id
      and cm.company_id = check_company_id
      and cm.role = 'admin'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin_user(check_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.company_memberships cm
    where cm.user_id = check_user_id
      and cm.role = 'admin'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.normalize_invitation_row()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.email := lower(trim(new.email));
  new.role := 'employee';
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_profile_from_membership()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.profiles
  set
    company_id = new.company_id,
    role = new.role
  where id = new.user_id;

  return new;
end;
$function$
;


