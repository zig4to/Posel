-- Posel: dopusti (obseg datumov od-do, prikazan kot diagonalno šrafiran vzorec na koledarju)
-- Zaženi ta skript v Supabase Dashboard -> SQL Editor (ali `supabase db push`, če uporabljaš CLI).

create table public.leaves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date not null,
  color text not null default '#0EA5E9',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leaves_date_order check (end_date >= start_date)
);

create index leaves_user_range_idx on public.leaves(user_id, start_date, end_date);

create trigger leaves_set_updated_at
  before update on public.leaves
  for each row
  execute function public.set_updated_at();

alter table public.leaves enable row level security;

create policy "leaves_select_own" on public.leaves
  for select using (user_id = auth.uid());

create policy "leaves_insert_own" on public.leaves
  for insert with check (user_id = auth.uid());

create policy "leaves_update_own" on public.leaves
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "leaves_delete_own" on public.leaves
  for delete using (user_id = auth.uid());

-- Ta Supabase projekt je skupen za več aplikacij in nima privzetih pravic
-- schema `public` za vloge PostgREST, zato jih podelimo eksplicitno.
-- Dostop do vrstic še vedno ureja RLS zgoraj (user_id = auth.uid()).
grant select, insert, update, delete on public.leaves to authenticated;
