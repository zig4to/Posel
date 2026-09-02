-- Posel: doda ime projekta k tabeli projects
-- Zaženi ta skript v Supabase Dashboard -> SQL Editor (ali `supabase db push`, če uporabljaš CLI).

alter table public.projects add column name text not null default '';
alter table public.projects alter column name drop default;
