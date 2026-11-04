-- Posel: projekt lahko sega čez več mesecev. Priliv in stroški projekta se v
-- mesečnem pregledu štejejo v en mesec - "mesec obračuna".
-- billing_month je "YYYY-MM"; null pomeni samodejno = mesec zadnjega delovnega dne.
-- Zaženi ta skript v Supabase Dashboard -> SQL Editor.

alter table public.projects add column billing_month text;

alter table public.projects add constraint projects_billing_month_format
  check (billing_month is null or billing_month ~ '^\d{4}-(0[1-9]|1[0-2])$');
