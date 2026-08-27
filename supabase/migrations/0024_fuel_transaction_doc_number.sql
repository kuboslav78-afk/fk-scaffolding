-- Umožňuje automatický import PDF výkazu od UTA. Jedno číslo dokladu (účtenka) môže obsahovať
-- viac riadkov (napr. nafta + AdBlue na jednej tankovacej transakcii), preto sa duplicita pri
-- opakovanom importe kontroluje až podľa trojice (karta, doklad, produkt), nie len podľa dokladu.
alter table fuel_transactions add column if not exists doc_number text;
alter table fuel_transactions add constraint fuel_transactions_card_doc_product_uniq unique (card_id, doc_number, purpose);
