-- Posel: začetna shema (stranke + delovni vnosi)
-- Zaženi ta skript v Supabase Dashboard -> SQL Editor (ali `supabase db push`, če uporabljaš CLI).

create extension if not exists pgcrypto;

-- posodobi `updated_at` ob vsakem UPDATE
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============ clients ============

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  color text not null default '#3B82F6',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_user_id_idx on public.clients(user_id);

create trigger clients_set_updated_at
  before update on public.clients
  for each row
  execute function public.set_updated_at();

alter table public.clients enable row level security;

create policy "clients_select_own" on public.clients
  for select using (user_id = auth.uid());

create policy "clients_insert_own" on public.clients
  for insert with check (user_id = auth.uid());

create policy "clients_update_own" on public.clients
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "clients_delete_own" on public.clients
  for delete using (user_id = auth.uid());

-- Ta Supabase projekt je skupen za več aplikacij in nima privzetih pravic
-- schema `public` za vloge PostgREST, zato jih podelimo eksplicitno.
-- Dostop do vrstic še vedno ureja RLS zgoraj (user_id = auth.uid()).
grant select, insert, update, delete on public.clients to authenticated;

-- ============ work_entries ============

create table public.work_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  work_date date not null,
  start_time time,
  end_time time,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_entries_time_order check (
    start_time is null or end_time is null or end_time > start_time
  )
);

create index work_entries_user_date_idx on public.work_entries(user_id, work_date);
create index work_entries_client_id_idx on public.work_entries(client_id);

create trigger work_entries_set_updated_at
  before update on public.work_entries
  for each row
  execute function public.set_updated_at();

alter table public.work_entries enable row level security;

create policy "work_entries_select_own" on public.work_entries
  for select using (user_id = auth.uid());

create policy "work_entries_insert_own" on public.work_entries
  for insert with check (user_id = auth.uid());

create policy "work_entries_update_own" on public.work_entries
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "work_entries_delete_own" on public.work_entries
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.work_entries to authenticated;
