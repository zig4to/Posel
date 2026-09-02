-- Posel: stroški projekta postanejo seznam postavk z opombo
-- (namesto ene skupne številke), da je na pregledu projektov vidno,
-- za kaj je bil posamezen strošek.
-- Zaženi ta skript v Supabase Dashboard -> SQL Editor (ali `supabase db push`, če uporabljaš CLI).

alter table public.projects add column cost_items jsonb not null default '[]'::jsonb;

-- Obstoječe vrstice: en sam strošek (skupni znesek) brez opombe.
update public.projects
set cost_items = case
  when costs > 0 then jsonb_build_array(jsonb_build_object('amount', costs, 'note', null))
  else '[]'::jsonb
end;

alter table public.projects drop constraint projects_amounts_nonnegative;
alter table public.projects drop column costs;
alter table public.projects add constraint projects_revenue_nonnegative check (revenue >= 0);
