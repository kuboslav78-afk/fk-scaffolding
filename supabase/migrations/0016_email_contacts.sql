create table if not exists email_contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

alter table email_contacts enable row level security;

create policy "email_contacts_all_admin" on email_contacts
  for all using (is_admin()) with check (is_admin());
