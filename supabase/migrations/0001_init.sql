-- Profily zamestnancov (rozširujú auth.users o meno a rolu)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'employee' check (role in ('admin', 'employee')),
  created_at timestamptz not null default now()
);

-- Evidencia odpracovaných hodín
create table if not exists work_hours (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles(id) on delete cascade,
  work_date date not null,
  hours_worked numeric(4, 2) not null check (hours_worked > 0),
  site_name text,
  description text,
  created_at timestamptz not null default now()
);

-- Stavebný denník
create table if not exists site_diary_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles(id) on delete cascade,
  entry_date date not null,
  site_name text not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- Objednávky
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  site_name text,
  description text,
  order_date date not null default current_date,
  status text not null default 'new' check (status in ('new', 'in_progress', 'done', 'cancelled')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Faktúry
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete set null,
  invoice_number text not null unique,
  customer_name text not null,
  amount numeric(10, 2) not null,
  issued_date date not null default current_date,
  due_date date,
  paid boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table work_hours enable row level security;
alter table site_diary_entries enable row level security;
alter table orders enable row level security;
alter table invoices enable row level security;

create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- profiles: každý vidí svoj profil, admin vidí všetky
create policy "profiles_select_own_or_admin" on profiles
  for select using (auth.uid() = id or is_admin());
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- work_hours: zamestnanec vidí/zapisuje len svoje záznamy, admin vidí všetko
create policy "work_hours_select" on work_hours
  for select using (auth.uid() = employee_id or is_admin());
create policy "work_hours_insert" on work_hours
  for insert with check (auth.uid() = employee_id);
create policy "work_hours_update_own" on work_hours
  for update using (auth.uid() = employee_id);

-- site_diary_entries: zamestnanec vidí/zapisuje len svoje záznamy, admin vidí všetko
create policy "site_diary_select" on site_diary_entries
  for select using (auth.uid() = employee_id or is_admin());
create policy "site_diary_insert" on site_diary_entries
  for insert with check (auth.uid() = employee_id);
create policy "site_diary_update_own" on site_diary_entries
  for update using (auth.uid() = employee_id);

-- orders: len admin
create policy "orders_all_admin" on orders
  for all using (is_admin()) with check (is_admin());

-- invoices: len admin
create policy "invoices_all_admin" on invoices
  for all using (is_admin()) with check (is_admin());

-- pri registrácii nového užívateľa automaticky vytvor profil
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
