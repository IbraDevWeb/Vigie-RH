-- Vigie RH — tenant isolation policies
-- Apply after db/schema.sql.
-- The application sets vigie.organization_id inside each transaction.

create or replace function vigie_current_organization_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('vigie.organization_id', true), '')::uuid
$$;

alter table employees enable row level security;
alter table employees force row level security;
drop policy if exists employees_tenant_isolation on employees;
create policy employees_tenant_isolation on employees
  using (organization_id = vigie_current_organization_id())
  with check (organization_id = vigie_current_organization_id());

alter table employee_documents enable row level security;
alter table employee_documents force row level security;
drop policy if exists employee_documents_tenant_isolation on employee_documents;
create policy employee_documents_tenant_isolation on employee_documents
  using (organization_id = vigie_current_organization_id())
  with check (organization_id = vigie_current_organization_id());

alter table assessments enable row level security;
alter table assessments force row level security;
drop policy if exists assessments_tenant_isolation on assessments;
create policy assessments_tenant_isolation on assessments
  using (organization_id = vigie_current_organization_id())
  with check (organization_id = vigie_current_organization_id());

alter table compliance_tasks enable row level security;
alter table compliance_tasks force row level security;
drop policy if exists compliance_tasks_tenant_isolation on compliance_tasks;
create policy compliance_tasks_tenant_isolation on compliance_tasks
  using (organization_id = vigie_current_organization_id())
  with check (organization_id = vigie_current_organization_id());

alter table audit_log enable row level security;
alter table audit_log force row level security;
drop policy if exists audit_log_tenant_isolation on audit_log;
create policy audit_log_tenant_isolation on audit_log
  using (organization_id = vigie_current_organization_id())
  with check (organization_id = vigie_current_organization_id());
