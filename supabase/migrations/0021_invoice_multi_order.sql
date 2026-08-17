-- Jedna faktúra môže obsahovať viac objednávok naraz (jeden riadok "Z-XXX" na objednávku,
-- rovnaké číslo faktúry). Nahrádzame unique na invoice_number kompozitným unique na
-- (invoice_number, order_id), aby sa nedala tá istá dvojica faktúra+objednávka importovať dvakrát,
-- ale rovnaké číslo faktúry mohlo patriť viacerým objednávkam.
alter table invoices drop constraint if exists invoices_invoice_number_key;
alter table invoices add constraint invoices_invoice_number_order_id_key unique (invoice_number, order_id);
