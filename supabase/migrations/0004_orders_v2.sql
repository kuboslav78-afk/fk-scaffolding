-- Stavby: číslo projektu (na párovanie s objednávkami od zákazníka)
alter table sites add column if not exists project_number text;

-- Objednávky: rozšírenie o polia z reálnych podkladov (Auftrag PDF / Excel evidencia)
alter table orders add column if not exists order_number text;
alter table orders add column if not exists site_id uuid references sites(id);
alter table orders add column if not exists work_type text check (work_type in ('montaz', 'demontaz'));
alter table orders add column if not exists start_date date;
alter table orders add column if not exists handover_date date;
alter table orders add column if not exists price numeric(10, 2);
alter table orders add column if not exists contribution_amount numeric(10, 2);
alter table orders add column if not exists subcontractor_invoice_ref text;
alter table orders add column if not exists note text;
alter table orders drop column if exists site_name;

create unique index if not exists orders_order_number_key on orders (order_number) where order_number is not null;

-- Faktúry: viazané na objednávku, zákazník sa odvodzuje z nej
alter table invoices add column if not exists sent boolean not null default false;
alter table invoices drop column if exists customer_name;
alter table invoices alter column order_id set not null;
