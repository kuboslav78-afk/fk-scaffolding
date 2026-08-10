-- Týždenný rozpis: admin prideľuje zamestnanca na stavbu pre konkrétny deň
create table if not exists site_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  work_date date not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (employee_id, work_date)
);

alter table site_assignments enable row level security;

create policy "site_assignments_select" on site_assignments
  for select using (
    auth.uid() = employee_id or is_admin() or is_site_foreman(site_id)
  );

create policy "site_assignments_all_admin" on site_assignments
  for all using (is_admin()) with check (is_admin());

-- Dostupnosť: zamestnanec si sám značí, či chce byť v robote alebo doma
create table if not exists availability (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles(id) on delete cascade,
  work_date date not null,
  status text not null check (status in ('work', 'off')),
  created_at timestamptz not null default now(),
  unique (employee_id, work_date)
);

alter table availability enable row level security;

create policy "availability_select" on availability
  for select using (auth.uid() = employee_id or is_admin());

create policy "availability_insert_own" on availability
  for insert with check (auth.uid() = employee_id);

create policy "availability_update_own" on availability
  for update using (auth.uid() = employee_id) with check (auth.uid() = employee_id);

create policy "availability_delete_own" on availability
  for delete using (auth.uid() = employee_id);

create policy "availability_all_admin" on availability
  for all using (is_admin()) with check (is_admin());
