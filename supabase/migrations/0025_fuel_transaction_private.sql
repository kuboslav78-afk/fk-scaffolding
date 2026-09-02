-- Namiesto vozidla (nikdy nemalo reálne dáta) evidujeme, či išlo o súkromné alebo firemné tankovanie.
alter table fuel_transactions add column if not exists is_private boolean not null default false;
alter table fuel_transactions drop column if exists vehicle;
