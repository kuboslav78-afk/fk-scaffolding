alter table orders add column if not exists pdf_path text;

-- prístup k súborom je len cez server actions so service role kľúčom (žiadna klientská RLS politika), rovnako ako diary-photos
insert into storage.buckets (id, name, public)
values ('order-pdfs', 'order-pdfs', false)
on conflict (id) do nothing;
