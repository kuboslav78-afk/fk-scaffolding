alter table profiles add column if not exists hourly_rate numeric(6, 2);

create table if not exists accommodation_costs (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles(id) on delete cascade,
  month date not null,
  amount numeric(8, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (employee_id, month)
);

alter table accommodation_costs enable row level security;

create policy "accommodation_costs_all_admin" on accommodation_costs
  for all using (is_admin()) with check (is_admin());
