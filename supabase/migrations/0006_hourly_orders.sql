-- Hodinovka: naviac fakturované hodiny, samostatné od pevných objednávok montáž/demontáž
alter table orders drop constraint if exists orders_work_type_check;
alter table orders add constraint orders_work_type_check
  check (work_type in ('montaz', 'demontaz', 'hodiny'));

alter table orders add column if not exists hours numeric(6, 2);
alter table orders add column if not exists hourly_rate numeric(6, 2);

-- hodinovka nemusí mať formálneho zákazníka vyplneného (viaže sa len na stavbu)
alter table orders alter column customer_name drop not null;
