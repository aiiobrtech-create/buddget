drop policy if exists p_auth_sessions_service_all on public.auth_sessions;
drop policy if exists p_auth_sessions_select_self_admin on public.auth_sessions;
drop policy if exists p_auth_sessions_write_self_admin on public.auth_sessions;

create policy p_auth_sessions_service_all on public.auth_sessions
for all
using (public.is_service_role_claim())
with check (public.is_service_role_claim());

create policy p_auth_sessions_select_self_admin on public.auth_sessions
for select
using (public.is_admin_claim() or user_id = public.current_user_id());

create policy p_auth_sessions_write_self_admin on public.auth_sessions
for all
using (public.is_admin_claim() or user_id = public.current_user_id())
with check (public.is_admin_claim() or user_id = public.current_user_id());

create or replace function public.jwt_claim_text(key text)
returns text
language sql
stable
set search_path = public, pg_catalog
as $$
  select coalesce(
    auth.jwt() ->> key,
    auth.jwt() -> 'app_metadata' ->> key,
    auth.jwt() -> 'user_metadata' ->> key
  );
$$;

create or replace function public.current_role_code()
returns text
language sql
stable
set search_path = public, pg_catalog
as $$
  select upper(coalesce(
    public.jwt_claim_text('role_code'),
    public.jwt_claim_text('role')
  ));
$$;

create or replace function public.current_company_id()
returns uuid
language sql
stable
set search_path = public, pg_catalog
as $$
  select nullif(coalesce(
    public.jwt_claim_text('company_id'),
    public.jwt_claim_text('companyId')
  ), '')::uuid;
$$;

create or replace function public.current_user_id()
returns uuid
language sql
stable
set search_path = public, pg_catalog
as $$
  select nullif(coalesce(
    public.jwt_claim_text('user_id'),
    public.jwt_claim_text('sub')
  ), '')::uuid;
$$;

create or replace function public.is_admin_claim()
returns boolean
language sql
stable
set search_path = public, pg_catalog
as $$
  select public.current_role_code() = 'ADMIN';
$$;

create or replace function public.is_controller_claim()
returns boolean
language sql
stable
set search_path = public, pg_catalog
as $$
  select public.current_role_code() = 'CONTROLLER';
$$;

create or replace function public.is_service_role_claim()
returns boolean
language sql
stable
set search_path = public, pg_catalog
as $$
  select auth.role() = 'service_role';
$$;

create or replace function public.can_access_company(target_company_id uuid)
returns boolean
language sql
stable
set search_path = public, pg_catalog
as $$
  select
    public.is_service_role_claim()
    or public.is_admin_claim()
    or (public.current_company_id() is not null and public.current_company_id() = target_company_id);
$$;

create or replace function public.cost_center_scope_ids()
returns uuid[]
language sql
stable
set search_path = public, pg_catalog
as $$
  with claim as (
    select coalesce(
      auth.jwt() -> 'cost_center_ids',
      auth.jwt() -> 'costCenterIds',
      auth.jwt() -> 'app_metadata' -> 'cost_center_ids',
      auth.jwt() -> 'app_metadata' -> 'costCenterIds',
      '[]'::jsonb
    ) as v
  )
  select coalesce(array_agg((x)::uuid), array[]::uuid[])
  from claim, jsonb_array_elements_text(claim.v) as x;
$$;

create or replace function public.can_access_cost_center(target_company_id uuid, target_cost_center_id uuid)
returns boolean
language sql
stable
set search_path = public, pg_catalog
as $$
  select
    public.is_service_role_claim()
    or public.is_admin_claim()
    or (
      public.can_access_company(target_company_id)
      and (
        public.is_controller_claim()
        or target_cost_center_id = any(public.cost_center_scope_ids())
      )
    );
$$;
