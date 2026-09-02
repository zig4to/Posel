-- Posel: mesečne davčne obveznosti (prispevki za s.p.), odštete od dobička meseca
-- Zaženi ta skript v Supabase Dashboard -> SQL Editor (ali `supabase db push`, če uporabljaš CLI).

create table public.monthly_taxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  year integer not null,
  month integer not null check (month >= 1 and month <= 12),
  amount numeric(10, 2) not null default 0 check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, year, month)
);

create index monthly_taxes_user_id_idx on public.monthly_taxes(user_id);

create trigger monthly_taxes_set_updated_at
  before update on public.monthly_taxes
  for each row
  execute function public.set_updated_at();

alter table public.monthly_taxes enable row level security;

create policy "monthly_taxes_select_own" on public.monthly_taxes
  for select using (user_id = auth.uid());

create policy "monthly_taxes_insert_own" on public.monthly_taxes
  for insert with check (user_id = auth.uid());

create policy "monthly_taxes_update_own" on public.monthly_taxes
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "monthly_taxes_delete_own" on public.monthly_taxes
  for delete using (user_id = auth.uid());

-- Ta Supabase projekt je skupen za več aplikacij in nima privzetih pravic
-- schema `public` za vloge PostgREST, zato jih podelimo eksplicitno.
-- Dostop do vrstic še vedno ureja RLS zgoraj (user_id = auth.uid()).
grant select, insert, update, delete on public.monthly_taxes to authenticated;
