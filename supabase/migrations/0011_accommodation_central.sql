alter table accommodation_costs drop constraint if exists accommodation_costs_employee_id_month_key;
alter table accommodation_costs drop column if exists employee_id;
alter table accommodation_costs add column if not exists note text;
