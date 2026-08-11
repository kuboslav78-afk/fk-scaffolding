alter table orders add column if not exists display_month text;

update orders set display_month = to_char(order_date, 'YYYY-MM') where display_month is null;

alter table orders alter column display_month set not null;
