-- Posel: projekti (mesečni arhiv stroškov/priliva po projektu)
-- Zaženi ta skript v Supabase Dashboard -> SQL Editor (ali `supabase db push`, če uporabljaš CLI).

-- ============ projects ============

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  work_dates date[] not null,
  costs numeric(10, 2) not null default 0,
  revenue numeric(10, 2) not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_dates_not_empty check (array_length(work_dates, 1) > 0),
  constraint projects_amounts_nonnegative check (costs >= 0 and revenue >= 0)
);

create index projects_user_id_idx on public.projects(user_id);
create index projects_client_id_idx on public.projects(client_id);

create trigger projects_set_updated_at
  before update on public.projects
  for each row
  execute function public.set_updated_at();

alter table public.projects enable row level security;

create policy "projects_select_own" on public.projects
  for select using (user_id = auth.uid());

create policy "projects_insert_own" on public.projects
  for insert with check (user_id = auth.uid());

create policy "projects_update_own" on public.projects
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "projects_delete_own" on public.projects
  for delete using (user_id = auth.uid());

-- Ta Supabase projekt je skupen za več aplikacij in nima privzetih pravic
-- schema `public` za vloge PostgREST, zato jih podelimo eksplicitno.
-- Dostop do vrstic še vedno ureja RLS zgoraj (user_id = auth.uid()).
grant select, insert, update, delete on public.projects to authenticated;
