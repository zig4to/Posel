-- Posel: projekt postane edini vir dni na koledarju (ločeni "vnosi strank"
-- se ukinejo). Vsak dan projekta dobi čas od-do in opombo.
--   day_times: { "YYYY-MM-DD": { "start": "08:00", "end": "16:00" } }
--   day_notes: { "YYYY-MM-DD": "opomba" }
-- Obstoječi vnosi iz work_entries se prenesejo:
--   1) vnos na dan, ki je že v projektu iste stranke -> čas in opomba v ta projekt
--   2) vnos brez projekta -> nov projekt "<Partner> – <Mesec Leto>" na stranko
--      in mesec (priliv 0 €, ure iz časa od-do)
-- Tabela work_entries ostane (aplikacija je ne uporablja več); izbrišeš jo
-- kasneje, ko preveriš, da je vse prav preneseno.
-- Zaženi ta skript v Supabase Dashboard -> SQL Editor (ENKRAT).

alter table public.projects
  add column day_times jsonb not null default '{}'::jsonb,
  add column day_notes jsonb not null default '{}'::jsonb;

-- 1) Vnosi, ki pripadajo obstoječemu projektu.
with matched as (
  select
    p.id as project_id,
    jsonb_object_agg(
      e.work_date::text,
      jsonb_build_object('start', left(e.start_time::text, 5), 'end', left(e.end_time::text, 5))
    ) filter (where e.start_time is not null or e.end_time is not null) as times,
    jsonb_object_agg(e.work_date::text, btrim(e.note))
      filter (where e.note is not null and btrim(e.note) <> '') as notes
  from public.work_entries e
  join public.projects p
    on p.client_id = e.client_id and e.work_date = any (p.work_dates)
  group by p.id
)
update public.projects p
set
  day_times = coalesce(m.times, '{}'::jsonb) || p.day_times,
  day_notes = coalesce(m.notes, '{}'::jsonb) || p.day_notes
from matched m
where p.id = m.project_id;

-- 2) Vnosi brez projekta -> nov projekt na stranko in mesec.
with orphans as (
  select e.*
  from public.work_entries e
  where not exists (
    select 1 from public.projects p
    where p.client_id = e.client_id and e.work_date = any (p.work_dates)
  )
),
grouped as (
  select
    o.user_id,
    o.client_id,
    to_char(o.work_date, 'YYYY-MM') as ym,
    array_agg(distinct o.work_date order by o.work_date) as dates,
    jsonb_object_agg(
      o.work_date::text,
      jsonb_build_object('start', left(o.start_time::text, 5), 'end', left(o.end_time::text, 5))
    ) filter (where o.start_time is not null or o.end_time is not null) as times,
    jsonb_object_agg(o.work_date::text, btrim(o.note))
      filter (where o.note is not null and btrim(o.note) <> '') as notes,
    jsonb_object_agg(
      o.work_date::text,
      round((extract(epoch from (o.end_time - o.start_time)) / 3600)::numeric, 2)
    ) filter (where o.start_time is not null and o.end_time is not null) as hours
  from orphans o
  group by o.user_id, o.client_id, to_char(o.work_date, 'YYYY-MM')
)
insert into public.projects
  (user_id, client_id, name, work_dates, day_times, day_notes, day_hours, revenue)
select
  g.user_id,
  g.client_id,
  c.company_name || ' – ' ||
    (array['Januar','Februar','Marec','April','Maj','Junij','Julij','Avgust',
           'September','Oktober','November','December'])[split_part(g.ym, '-', 2)::int]
    || ' ' || split_part(g.ym, '-', 1),
  g.dates,
  coalesce(g.times, '{}'::jsonb),
  coalesce(g.notes, '{}'::jsonb),
  coalesce(g.hours, '{}'::jsonb),
  0
from grouped g
join public.clients c on c.id = g.client_id;
