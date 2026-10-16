-- Globálne nastavenia aplikácie (key/value). Zatiaľ: predvolená splatnosť faktúr v dňoch.
create table if not exists app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table app_settings enable row level security;

create policy "app_settings_select_authenticated" on app_settings
  for select using (auth.uid() is not null);

create policy "app_settings_write_admin" on app_settings
  for all using (is_admin()) with check (is_admin());

insert into app_settings (key, value) values ('payment_term_days', '21')
  on conflict (key) do nothing;
