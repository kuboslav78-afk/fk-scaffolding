-- Palivové karty (UTA) a evidencia tankovaní - prevzaté z ručne vedenej Google tabuľky.
create table if not exists fuel_cards (
  id uuid primary key default gen_random_uuid(),
  card_number int not null unique,
  holder_name text,
  card_type text,
  valid_until text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists fuel_transactions (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references fuel_cards(id) on delete cascade,
  tx_date date not null,
  place text,
  purpose text,
  vehicle text,
  gross_amount numeric(10, 2),
  net_amount numeric(10, 2),
  created_at timestamptz not null default now()
);

alter table fuel_cards enable row level security;
alter table fuel_transactions enable row level security;

create policy "fuel_cards_all_admin" on fuel_cards
  for all using (is_admin()) with check (is_admin());
create policy "fuel_transactions_all_admin" on fuel_transactions
  for all using (is_admin()) with check (is_admin());
