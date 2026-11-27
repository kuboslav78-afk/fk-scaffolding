-- Rovnaké číslo objednávky sa smie opakovať (napr. hodinovky). Pri importe faktúr sa vtedy
-- objednávka vyberá ručne.
drop index if exists orders_order_number_key;
