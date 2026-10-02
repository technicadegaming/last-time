-- Last Time LT-002
-- Run this entire file once in Supabase -> SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.trackers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  category text not null default 'other',
  emoji text not null default '↺',
  frequency_unit text not null default 'none' check (frequency_unit in ('none','day','week','month','year')),
  frequency_value integer not null default 0 check (frequency_value >= 0),
  last_done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trackers_user_id_idx on public.trackers(user_id);
create index if not exists trackers_user_created_idx on public.trackers(user_id, created_at desc);

alter table public.trackers enable row level security;

-- Re-running this file is safe.
drop policy if exists "Users can read their own trackers" on public.trackers;
drop policy if exists "Users can create their own trackers" on public.trackers;
drop policy if exists "Users can update their own trackers" on public.trackers;
drop policy if exists "Users can delete their own trackers" on public.trackers;

create policy "Users can read their own trackers"
on public.trackers for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own trackers"
on public.trackers for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own trackers"
on public.trackers for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own trackers"
on public.trackers for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trackers_set_updated_at on public.trackers;
create trigger trackers_set_updated_at
before update on public.trackers
for each row execute procedure public.set_updated_at();
