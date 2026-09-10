-- Posel: dogodki v koledarju (samostojni vnosi brez stranke: ime, čas od-do, opomba)
-- Zaženi ta skript v Supabase Dashboard -> SQL Editor (ali `supabase db push`, če uporabljaš CLI).

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_date date not null,
  title text not null,
  start_time time,
  end_time time,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_time_order check (
    start_time is null or end_time is null or end_time > start_time
  )
);

create index events_user_date_idx on public.events(user_id, event_date);

create trigger events_set_updated_at
  before update on public.events
  for each row
  execute function public.set_updated_at();

alter table public.events enable row level security;

create policy "events_select_own" on public.events
  for select using (user_id = auth.uid());

create policy "events_insert_own" on public.events
  for insert with check (user_id = auth.uid());

create policy "events_update_own" on public.events
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "events_delete_own" on public.events
  for delete using (user_id = auth.uid());

-- Ta Supabase projekt je skupen za več aplikacij in nima privzetih pravic
-- schema `public` za vloge PostgREST, zato jih podelimo eksplicitno.
-- Dostop do vrstic še vedno ureja RLS zgoraj (user_id = auth.uid()).
grant select, insert, update, delete on public.events to authenticated;
