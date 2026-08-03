-- Zmazanie objednávky zmaže aj jej faktúry (order_id je not null, set null by porušilo constraint)
alter table invoices drop constraint if exists invoices_order_id_fkey;
alter table invoices add constraint invoices_order_id_fkey
  foreign key (order_id) references orders(id) on delete cascade;
