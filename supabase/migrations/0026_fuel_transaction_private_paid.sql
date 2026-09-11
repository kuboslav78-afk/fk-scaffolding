-- Pri súkromných tankovaniach potrebujeme vedieť pre koho to bolo (napr. "dedkove tankovanie")
-- a či už bolo vyplatené, aby sa dala robiť evidencia dlhu/vyrovnania.
alter table fuel_transactions add column if not exists private_note text;
alter table fuel_transactions add column if not exists private_paid boolean not null default false;
