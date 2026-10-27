-- Posel: dodatne storitve projekta - postavke (znesek + opis), ki se stranki
-- zaračunajo poleg osnovnega obračuna. Stolpec revenue ostane skupni priliv
-- (osnova + dodatne storitve).
-- Zaženi ta skript v Supabase Dashboard -> SQL Editor.

alter table public.projects add column extra_items jsonb not null default '[]'::jsonb;
