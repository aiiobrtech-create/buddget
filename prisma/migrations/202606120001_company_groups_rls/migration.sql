-- RLS em company_groups (tabela criada depois das policies iniciais)
drop policy if exists p_company_groups_service_all on public.company_groups;
drop policy if exists p_company_groups_read_auth on public.company_groups;
drop policy if exists p_company_groups_write_admin on public.company_groups;

create policy p_company_groups_service_all on public.company_groups
  for all using (public.is_service_role_claim()) with check (public.is_service_role_claim());

create policy p_company_groups_read_auth on public.company_groups
  for select using (auth.role() = 'authenticated' or public.is_admin_claim());

create policy p_company_groups_write_admin on public.company_groups
  for all using (public.is_admin_claim()) with check (public.is_admin_claim());
