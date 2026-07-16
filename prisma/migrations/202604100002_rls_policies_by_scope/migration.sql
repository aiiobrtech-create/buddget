-- Helper functions for claim-based scope checks
create or replace function public.jwt_claim_text(key text)
returns text
language sql
stable
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
as $$
  select public.current_role_code() = 'ADMIN';
$$;

create or replace function public.is_controller_claim()
returns boolean
language sql
stable
as $$
  select public.current_role_code() = 'CONTROLLER';
$$;

create or replace function public.is_service_role_claim()
returns boolean
language sql
stable
as $$
  select auth.role() = 'service_role';
$$;

create or replace function public.can_access_company(target_company_id uuid)
returns boolean
language sql
stable
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

-- Companies
drop policy if exists p_companies_service_all on public.companies;
drop policy if exists p_companies_select_scope on public.companies;
drop policy if exists p_companies_write_admin on public.companies;
create policy p_companies_service_all on public.companies for all using (public.is_service_role_claim()) with check (public.is_service_role_claim());
create policy p_companies_select_scope on public.companies for select using (public.is_admin_claim() or id = public.current_company_id());
create policy p_companies_write_admin on public.companies for all using (public.is_admin_claim()) with check (public.is_admin_claim());

-- Cost Centers
drop policy if exists p_cost_centers_service_all on public.cost_centers;
drop policy if exists p_cost_centers_select_scope on public.cost_centers;
drop policy if exists p_cost_centers_write_scope on public.cost_centers;
create policy p_cost_centers_service_all on public.cost_centers for all using (public.is_service_role_claim()) with check (public.is_service_role_claim());
create policy p_cost_centers_select_scope on public.cost_centers for select using (public.can_access_cost_center(company_id, id));
create policy p_cost_centers_write_scope on public.cost_centers for all using (public.is_admin_claim() or public.is_controller_claim()) with check (public.can_access_company(company_id) and (public.is_admin_claim() or public.is_controller_claim()));

-- Users
drop policy if exists p_users_service_all on public.users;
drop policy if exists p_users_select_scope on public.users;
drop policy if exists p_users_update_self_or_admin on public.users;
drop policy if exists p_users_insert_admin on public.users;
drop policy if exists p_users_delete_admin on public.users;
create policy p_users_service_all on public.users for all using (public.is_service_role_claim()) with check (public.is_service_role_claim());
create policy p_users_select_scope on public.users for select using (public.is_admin_claim() or (company_id is not null and public.can_access_company(company_id)) or id = public.current_user_id());
create policy p_users_update_self_or_admin on public.users for update using (public.is_admin_claim() or id = public.current_user_id()) with check (public.is_admin_claim() or id = public.current_user_id());
create policy p_users_insert_admin on public.users for insert with check (public.is_admin_claim());
create policy p_users_delete_admin on public.users for delete using (public.is_admin_claim());

-- Roles / permissions / role_permissions
drop policy if exists p_roles_service_all on public.roles;
drop policy if exists p_roles_read_auth on public.roles;
drop policy if exists p_roles_write_admin on public.roles;
create policy p_roles_service_all on public.roles for all using (public.is_service_role_claim()) with check (public.is_service_role_claim());
create policy p_roles_read_auth on public.roles for select using (auth.role() = 'authenticated' or public.is_admin_claim());
create policy p_roles_write_admin on public.roles for all using (public.is_admin_claim()) with check (public.is_admin_claim());

drop policy if exists p_permissions_service_all on public.permissions;
drop policy if exists p_permissions_read_auth on public.permissions;
drop policy if exists p_permissions_write_admin on public.permissions;
create policy p_permissions_service_all on public.permissions for all using (public.is_service_role_claim()) with check (public.is_service_role_claim());
create policy p_permissions_read_auth on public.permissions for select using (auth.role() = 'authenticated' or public.is_admin_claim());
create policy p_permissions_write_admin on public.permissions for all using (public.is_admin_claim()) with check (public.is_admin_claim());

drop policy if exists p_role_permissions_service_all on public.role_permissions;
drop policy if exists p_role_permissions_read_auth on public.role_permissions;
drop policy if exists p_role_permissions_write_admin on public.role_permissions;
create policy p_role_permissions_service_all on public.role_permissions for all using (public.is_service_role_claim()) with check (public.is_service_role_claim());
create policy p_role_permissions_read_auth on public.role_permissions for select using (auth.role() = 'authenticated' or public.is_admin_claim());
create policy p_role_permissions_write_admin on public.role_permissions for all using (public.is_admin_claim()) with check (public.is_admin_claim());

-- Taxonomy
drop policy if exists p_budget_categories_service_all on public.budget_categories;
drop policy if exists p_budget_categories_read_auth on public.budget_categories;
drop policy if exists p_budget_categories_write_admin on public.budget_categories;
create policy p_budget_categories_service_all on public.budget_categories for all using (public.is_service_role_claim()) with check (public.is_service_role_claim());
create policy p_budget_categories_read_auth on public.budget_categories for select using (auth.role() = 'authenticated' or public.is_admin_claim());
create policy p_budget_categories_write_admin on public.budget_categories for all using (public.is_admin_claim()) with check (public.is_admin_claim());

drop policy if exists p_budget_classes_service_all on public.budget_classes;
drop policy if exists p_budget_classes_read_auth on public.budget_classes;
drop policy if exists p_budget_classes_write_admin on public.budget_classes;
create policy p_budget_classes_service_all on public.budget_classes for all using (public.is_service_role_claim()) with check (public.is_service_role_claim());
create policy p_budget_classes_read_auth on public.budget_classes for select using (auth.role() = 'authenticated' or public.is_admin_claim());
create policy p_budget_classes_write_admin on public.budget_classes for all using (public.is_admin_claim()) with check (public.is_admin_claim());

drop policy if exists p_budget_natures_service_all on public.budget_natures;
drop policy if exists p_budget_natures_read_auth on public.budget_natures;
drop policy if exists p_budget_natures_write_admin on public.budget_natures;
create policy p_budget_natures_service_all on public.budget_natures for all using (public.is_service_role_claim()) with check (public.is_service_role_claim());
create policy p_budget_natures_read_auth on public.budget_natures for select using (auth.role() = 'authenticated' or public.is_admin_claim());
create policy p_budget_natures_write_admin on public.budget_natures for all using (public.is_admin_claim()) with check (public.is_admin_claim());

-- Suppliers
drop policy if exists p_suppliers_service_all on public.suppliers;
drop policy if exists p_suppliers_read_scope on public.suppliers;
drop policy if exists p_suppliers_write_scope on public.suppliers;
create policy p_suppliers_service_all on public.suppliers for all using (public.is_service_role_claim()) with check (public.is_service_role_claim());
create policy p_suppliers_read_scope on public.suppliers for select using (public.is_admin_claim() or public.current_company_id() is not null);
create policy p_suppliers_write_scope on public.suppliers for all using (public.is_admin_claim() or public.is_controller_claim()) with check (public.is_admin_claim() or public.is_controller_claim());

-- Projects
drop policy if exists p_projects_service_all on public.projects;
drop policy if exists p_projects_select_scope on public.projects;
drop policy if exists p_projects_write_scope on public.projects;
create policy p_projects_service_all on public.projects for all using (public.is_service_role_claim()) with check (public.is_service_role_claim());
create policy p_projects_select_scope on public.projects for select using (public.can_access_company(company_id));
create policy p_projects_write_scope on public.projects for all using (public.is_admin_claim() or public.is_controller_claim()) with check (public.can_access_company(company_id) and (public.is_admin_claim() or public.is_controller_claim()));

-- Budgets
drop policy if exists p_budgets_service_all on public.budgets;
drop policy if exists p_budgets_select_scope on public.budgets;
drop policy if exists p_budgets_write_scope on public.budgets;
create policy p_budgets_service_all on public.budgets for all using (public.is_service_role_claim()) with check (public.is_service_role_claim());
create policy p_budgets_select_scope on public.budgets for select using (public.can_access_company(company_id));
create policy p_budgets_write_scope on public.budgets for all using (public.is_admin_claim() or public.is_controller_claim()) with check (public.can_access_company(company_id) and (public.is_admin_claim() or public.is_controller_claim()));

-- Budget Versions
drop policy if exists p_budget_versions_service_all on public.budget_versions;
drop policy if exists p_budget_versions_select_scope on public.budget_versions;
drop policy if exists p_budget_versions_write_scope on public.budget_versions;
create policy p_budget_versions_service_all on public.budget_versions for all using (public.is_service_role_claim()) with check (public.is_service_role_claim());
create policy p_budget_versions_select_scope on public.budget_versions for select using (exists (select 1 from public.budgets b where b.id = budget_id and public.can_access_company(b.company_id)));
create policy p_budget_versions_write_scope on public.budget_versions for all using (public.is_admin_claim() or public.is_controller_claim()) with check ((public.is_admin_claim() or public.is_controller_claim()) and exists (select 1 from public.budgets b where b.id = budget_id and public.can_access_company(b.company_id)));

-- Budget Lines
drop policy if exists p_budget_lines_service_all on public.budget_lines;
drop policy if exists p_budget_lines_select_scope on public.budget_lines;
drop policy if exists p_budget_lines_write_scope on public.budget_lines;
create policy p_budget_lines_service_all on public.budget_lines for all using (public.is_service_role_claim()) with check (public.is_service_role_claim());
create policy p_budget_lines_select_scope on public.budget_lines for select using (public.can_access_cost_center(company_id, cost_center_id));
create policy p_budget_lines_write_scope on public.budget_lines for all using (public.is_admin_claim() or public.is_controller_claim()) with check (public.can_access_cost_center(company_id, cost_center_id) and (public.is_admin_claim() or public.is_controller_claim()));

-- Actuals
drop policy if exists p_actuals_service_all on public.actuals;
drop policy if exists p_actuals_select_scope on public.actuals;
drop policy if exists p_actuals_write_scope on public.actuals;
create policy p_actuals_service_all on public.actuals for all using (public.is_service_role_claim()) with check (public.is_service_role_claim());
create policy p_actuals_select_scope on public.actuals for select using (public.can_access_cost_center(company_id, cost_center_id));
create policy p_actuals_write_scope on public.actuals for all using (public.is_admin_claim() or public.is_controller_claim()) with check (public.can_access_cost_center(company_id, cost_center_id) and (public.is_admin_claim() or public.is_controller_claim()));

-- Forecasts
drop policy if exists p_forecasts_service_all on public.forecasts;
drop policy if exists p_forecasts_select_scope on public.forecasts;
drop policy if exists p_forecasts_write_scope on public.forecasts;
create policy p_forecasts_service_all on public.forecasts for all using (public.is_service_role_claim()) with check (public.is_service_role_claim());
create policy p_forecasts_select_scope on public.forecasts for select using (exists (select 1 from public.budgets b where b.id = budget_id and public.can_access_company(b.company_id)));
create policy p_forecasts_write_scope on public.forecasts for all using (public.is_admin_claim() or public.is_controller_claim()) with check ((public.is_admin_claim() or public.is_controller_claim()) and exists (select 1 from public.budgets b where b.id = budget_id and public.can_access_company(b.company_id)));

-- Budget Requests
drop policy if exists p_budget_requests_service_all on public.budget_requests;
drop policy if exists p_budget_requests_select_scope on public.budget_requests;
drop policy if exists p_budget_requests_write_scope on public.budget_requests;
create policy p_budget_requests_service_all on public.budget_requests for all using (public.is_service_role_claim()) with check (public.is_service_role_claim());
create policy p_budget_requests_select_scope on public.budget_requests for select using (public.can_access_cost_center(company_id, cost_center_id));
create policy p_budget_requests_write_scope on public.budget_requests for all using (public.is_admin_claim() or public.is_controller_claim()) with check (public.can_access_cost_center(company_id, cost_center_id) and (public.is_admin_claim() or public.is_controller_claim()));

-- Transfers
drop policy if exists p_transfers_service_all on public.transfers;
drop policy if exists p_transfers_select_scope on public.transfers;
drop policy if exists p_transfers_write_scope on public.transfers;
create policy p_transfers_service_all on public.transfers for all using (public.is_service_role_claim()) with check (public.is_service_role_claim());
create policy p_transfers_select_scope on public.transfers for select using (exists (select 1 from public.budget_lines bl where bl.id = source_budget_line_id and public.can_access_cost_center(bl.company_id, bl.cost_center_id)));
create policy p_transfers_write_scope on public.transfers for all using (public.is_admin_claim() or public.is_controller_claim()) with check ((public.is_admin_claim() or public.is_controller_claim()) and exists (select 1 from public.budget_lines bl where bl.id = source_budget_line_id and public.can_access_cost_center(bl.company_id, bl.cost_center_id)));

-- Import/Export/Audit/File Attachments
drop policy if exists p_import_batches_service_all on public.import_batches;
drop policy if exists p_import_batches_scope on public.import_batches;
create policy p_import_batches_service_all on public.import_batches for all using (public.is_service_role_claim()) with check (public.is_service_role_claim());
create policy p_import_batches_scope on public.import_batches for all using (public.is_admin_claim() or public.is_controller_claim()) with check (public.is_admin_claim() or public.is_controller_claim());

drop policy if exists p_export_jobs_service_all on public.export_jobs;
drop policy if exists p_export_jobs_scope on public.export_jobs;
create policy p_export_jobs_service_all on public.export_jobs for all using (public.is_service_role_claim()) with check (public.is_service_role_claim());
create policy p_export_jobs_scope on public.export_jobs for all using (public.is_admin_claim() or public.is_controller_claim()) with check (public.is_admin_claim() or public.is_controller_claim());

drop policy if exists p_audit_logs_service_all on public.audit_logs;
drop policy if exists p_audit_logs_scope on public.audit_logs;
create policy p_audit_logs_service_all on public.audit_logs for all using (public.is_service_role_claim()) with check (public.is_service_role_claim());
create policy p_audit_logs_scope on public.audit_logs for select using (public.is_admin_claim() or public.is_controller_claim());

drop policy if exists p_file_attachments_service_all on public.file_attachments;
drop policy if exists p_file_attachments_scope on public.file_attachments;
create policy p_file_attachments_service_all on public.file_attachments for all using (public.is_service_role_claim()) with check (public.is_service_role_claim());
create policy p_file_attachments_scope on public.file_attachments for all using (public.is_admin_claim() or public.is_controller_claim()) with check (public.is_admin_claim() or public.is_controller_claim());

-- Prisma migrations table
drop policy if exists p_prisma_migrations_service_only on public._prisma_migrations;
create policy p_prisma_migrations_service_only on public._prisma_migrations for all using (public.is_service_role_claim()) with check (public.is_service_role_claim());
