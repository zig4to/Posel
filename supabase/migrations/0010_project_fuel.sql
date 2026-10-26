-- Posel: strošek goriva (dizel) na projektu, km po dnevih.
-- day_km je objekt { "YYYY-MM-DD": km }, npr. { "2026-10-01": 84, "2026-10-02": 120 }.
-- Strošek = seštevek km × fuel_consumption / 100 × fuel_price.
-- Poraba in cena se shranita ob vnosu, da se stari projekti ne spremenijo,
-- ko se cena dizla spremeni. null = projekt nima stroška goriva.
-- Zaženi ta skript v Supabase Dashboard -> SQL Editor.

alter table public.projects add column day_km jsonb not null default '{}'::jsonb;
alter table public.projects add column fuel_consumption numeric(4, 1);
alter table public.projects add column fuel_price numeric(6, 3);
alter table public.projects add constraint projects_fuel_nonnegative check (
  (fuel_consumption is null or fuel_consumption >= 0)
  and (fuel_price is null or fuel_price >= 0)
);
