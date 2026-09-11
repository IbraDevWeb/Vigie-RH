-- Vigie RH — PostgreSQL production data model
-- Deliberately framework-agnostic: usable with Prisma, Drizzle, Kysely or raw SQL.

create extension if not exists pgcrypto;

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  siren text,
  timezone text not null default 'Europe/Paris',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('owner','hr','advisor','readonly')),
  primary key (organization_id, user_id)
);

create table employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  nationality_code char(2),
  role_title text,
  work_site text,
  contract_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, organization_id)
);
create index employees_organization_idx on employees(organization_id);

create table employee_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  employee_id uuid not null,
  document_type text not null,
  label text not null,
  storage_key text,
  issued_at date,
  valid_until date,
  is_current boolean not null default false,
  extracted_fields jsonb not null default '{}'::jsonb,
  extraction_confidence numeric(5,4) check (extraction_confidence between 0 and 1),
  confirmed_by_user_id uuid references users(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (employee_id, organization_id)
    references employees(id, organization_id)
    on delete cascade
);
create index employee_documents_expiry_idx on employee_documents(organization_id, valid_until);
create index employee_documents_employee_idx on employee_documents(organization_id, employee_id, created_at desc);
create index employee_documents_current_idx on employee_documents(organization_id, employee_id, document_type, valid_until)
  where is_current;

create table legal_sources (
  id text primary key,
  title text not null,
  authority text not null,
  url text not null,
  effective_from date,
  effective_to date,
  last_reviewed date not null,
  content_hash text,
  metadata jsonb not null default '{}'::jsonb
);

create table legal_rule_versions (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null,
  version integer not null,
  effective_from date not null,
  effective_to date,
  status text not null check (status in ('draft','review','active','retired')),
  definition jsonb not null,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(rule_key, version)
);
create index legal_rule_active_idx on legal_rule_versions(rule_key, status, effective_from);

create table assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  employee_id uuid,
  action_type text not null,
  input_snapshot jsonb not null,
  result_snapshot jsonb not null,
  rule_versions jsonb not null,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  unique(id, organization_id),
  foreign key (employee_id, organization_id)
    references employees(id, organization_id)
    on delete set null (employee_id)
);
create index assessments_org_created_idx on assessments(organization_id, created_at desc);

create table compliance_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  employee_id uuid,
  assessment_id uuid,
  title text not null,
  due_at timestamptz,
  status text not null check (status in ('todo','doing','done','cancelled')) default 'todo',
  severity text not null check (severity in ('info','warning','critical')) default 'info',
  assigned_to uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  foreign key (employee_id, organization_id)
    references employees(id, organization_id)
    on delete cascade,
  foreign key (assessment_id, organization_id)
    references assessments(id, organization_id)
    on delete set null (assessment_id),
  foreign key (organization_id, assigned_to)
    references organization_members(organization_id, user_id)
    on delete set null (assigned_to)
);
create index compliance_tasks_due_idx on compliance_tasks(organization_id, status, due_at);
create index compliance_tasks_employee_idx on compliance_tasks(organization_id, employee_id, status, due_at);

create table audit_log (
  id bigint generated always as identity primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_user_id uuid references users(id),
  event_type text not null,
  entity_type text not null,
  entity_id text not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index audit_log_org_idx on audit_log(organization_id, occurred_at desc);
