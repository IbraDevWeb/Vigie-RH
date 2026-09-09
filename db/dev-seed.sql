-- Local development seed only. Never use these identifiers as production credentials.

insert into organizations (id, name)
values ('00000000-0000-4000-8000-000000000001', 'Vigie RH Demo')
on conflict (id) do nothing;

insert into users (id, email, display_name)
values ('00000000-0000-4000-8000-000000000002', 'demo@vigie.local', 'Utilisateur Démo')
on conflict (id) do nothing;

insert into organization_members (organization_id, user_id, role)
values (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  'owner'
)
on conflict (organization_id, user_id) do update set role = excluded.role;
