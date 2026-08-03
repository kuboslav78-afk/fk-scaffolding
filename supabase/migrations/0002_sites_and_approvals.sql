-- Rozšírenie rolí o vedúceho stavby
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('admin', 'foreman', 'employee'));

-- Stavby
create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  foreman_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table sites enable row level security;

create policy "sites_select_authenticated" on sites
  for select using (auth.uid() is not null);
create policy "sites_all_admin" on sites
  for all using (is_admin()) with check (is_admin());

create or replace function is_site_foreman(check_site_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from sites where id = check_site_id and foreman_id = auth.uid()
  );
$$;

-- work_hours: naviazať na stavby + schvaľovanie vedúcim
alter table work_hours drop column if exists site_name;
alter table work_hours add column if not exists site_id uuid references sites(id);
alter table work_hours add column if not exists approved boolean not null default false;
alter table work_hours add column if not exists approved_by uuid references profiles(id);
alter table work_hours add column if not exists approved_at timestamptz;

drop policy if exists "work_hours_select" on work_hours;
create policy "work_hours_select" on work_hours
  for select using (
    auth.uid() = employee_id or is_admin() or is_site_foreman(site_id)
  );

drop policy if exists "work_hours_update_own" on work_hours;
create policy "work_hours_update_own" on work_hours
  for update using (
    (auth.uid() = employee_id and approved = false) or is_admin() or is_site_foreman(site_id)
  );

-- site_diary_entries: naviazať na stavby
alter table site_diary_entries drop column if exists site_name;
alter table site_diary_entries add column if not exists site_id uuid references sites(id);
alter table site_diary_entries alter column site_id set not null;

drop policy if exists "site_diary_select" on site_diary_entries;
create policy "site_diary_select" on site_diary_entries
  for select using (
    auth.uid() = employee_id or is_admin() or is_site_foreman(site_id)
  );
