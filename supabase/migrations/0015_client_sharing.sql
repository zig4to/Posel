-- Posel: deljenje strank z drugim uporabnikom (samo ogled).
-- Stranka ima seznam uporabnikov (`shared_with`), ki jo lahko vidijo skupaj
-- z vsemi njenimi projekti. Urejanje/brisanje ostane samo lastniku
-- (obstoječe politike update/delete: user_id = auth.uid()).
-- Zaženi ta skript v Supabase Dashboard -> SQL Editor.

alter table public.clients
  add column shared_with uuid[] not null default '{}';

create index clients_shared_with_idx on public.clients using gin (shared_with);

create policy "clients_select_shared" on public.clients
  for select using (auth.uid() = any (shared_with));

create policy "projects_select_shared" on public.projects
  for select using (
    exists (
      select 1
      from public.clients c
      where c.id = projects.client_id
        and auth.uid() = any (c.shared_with)
    )
  );
