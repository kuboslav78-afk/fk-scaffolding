-- Mazanie hodín: vlastník kým nie sú schválené, alebo admin/vedúci stavby
create policy "work_hours_delete" on work_hours
  for delete using (
    (auth.uid() = employee_id and approved = false) or is_admin() or is_site_foreman(site_id)
  );

-- Mazanie zápisov do denníka: vlastník, alebo admin/vedúci stavby
create policy "site_diary_delete" on site_diary_entries
  for delete using (
    auth.uid() = employee_id or is_admin() or is_site_foreman(site_id)
  );
