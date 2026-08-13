alter table invoices add column if not exists pdf_path text;

-- prístup k súborom je len cez server actions so service role kľúčom (žiadna klientská RLS politika), rovnako ako order-pdfs
insert into storage.buckets (id, name, public)
values ('invoice-pdfs', 'invoice-pdfs', false)
on conflict (id) do nothing;
