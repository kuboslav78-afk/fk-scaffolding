-- "Faktúra PETER" nie je text ale príznak (Peter je hlavný fakturant, berie si 20% podiel,
-- naša faktúra = 80% ceny objednávky; tento príznak len sleduje, či sme si so splatnosťami zosúladili)
alter table orders drop column if exists subcontractor_invoice_ref;
alter table orders add column if not exists peter_invoice_issued boolean not null default false;
