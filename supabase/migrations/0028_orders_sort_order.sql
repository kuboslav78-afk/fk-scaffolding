-- Ručné poradie objednávok (drag & drop). NULL = zatiaľ neusporiadané, radí sa podľa created_at na koniec.
alter table orders add column if not exists sort_order integer;
