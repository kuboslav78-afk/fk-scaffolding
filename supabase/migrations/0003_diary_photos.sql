-- Fotky v stavebnom denníku (nahráva vedúci stavby alebo admin, cez server action so service role kľúčom)
create table if not exists diary_photos (
  id uuid primary key default gen_random_uuid(),
  diary_entry_id uuid not null references site_diary_entries(id) on delete cascade,
  storage_path text not null,
  uploaded_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

alter table diary_photos enable row level security;

-- prístup k tabuľke je len cez server actions so service role kľúčom (žiadna klientská RLS politika)

insert into storage.buckets (id, name, public)
values ('diary-photos', 'diary-photos', false)
on conflict (id) do nothing;
