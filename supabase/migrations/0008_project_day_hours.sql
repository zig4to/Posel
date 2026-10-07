-- Posel: beleženje ur po dnevih projekta.
-- day_hours je objekt { "YYYY-MM-DD": ure }, npr. { "2026-10-01": 8, "2026-10-02": 4.5 }.
-- Zaženi ta skript v Supabase Dashboard -> SQL Editor.

alter table public.projects add column day_hours jsonb not null default '{}'::jsonb;
