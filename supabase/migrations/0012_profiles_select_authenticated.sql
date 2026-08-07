-- Vedúci stavby potrebuje vidieť meno zamestnanca pri schvaľovaní hodín,
-- čo predtým blokovala RLS (profiles_select_own_or_admin videla len vlastný profil).
create policy "profiles_select_authenticated" on profiles
  for select using (auth.uid() is not null);
