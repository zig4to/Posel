-- Posel: urna postavka projekta (EUR/h). Vrednost projekta = urna postavka × seštevek ur.
-- null = projekt nima urne postavke.
-- Zaženi ta skript v Supabase Dashboard -> SQL Editor.

alter table public.projects add column hourly_rate numeric(10, 2);
alter table public.projects add constraint projects_hourly_rate_nonnegative
  check (hourly_rate is null or hourly_rate >= 0);
