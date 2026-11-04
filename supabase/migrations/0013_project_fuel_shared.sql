-- Posel: deljeni stroški goriva - dnevi, ko se v službo pelješ skupaj s
-- kolegom in si strošek goriva razdelita na pol.
-- Zaženi ta skript v Supabase Dashboard -> SQL Editor.

alter table public.projects
  add column fuel_shared_dates date[] not null default '{}';
