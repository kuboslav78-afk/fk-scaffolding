create table if not exists admin_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  done boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  done_at timestamptz
);

alter table admin_tasks enable row level security;

create policy "admin_tasks_all_admin" on admin_tasks
  for all using (is_admin()) with check (is_admin());
