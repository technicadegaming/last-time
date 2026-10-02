-- Last Time LT-003/004/005 upgrade
-- Run this ONCE in Supabase -> SQL Editor after the LT-002 schema.

alter table public.trackers
  add column if not exists archived_at timestamptz;

create index if not exists trackers_user_active_idx
  on public.trackers(user_id, archived_at, last_done_at);

create table if not exists public.occurrences (
  id uuid primary key default gen_random_uuid(),
  tracker_id uuid not null references public.trackers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists occurrences_tracker_completed_idx
  on public.occurrences(tracker_id, completed_at desc);
create index if not exists occurrences_user_idx
  on public.occurrences(user_id);

alter table public.occurrences enable row level security;

drop policy if exists "Users can read their own occurrences" on public.occurrences;
drop policy if exists "Users can create their own occurrences" on public.occurrences;
drop policy if exists "Users can update their own occurrences" on public.occurrences;
drop policy if exists "Users can delete their own occurrences" on public.occurrences;

create policy "Users can read their own occurrences"
on public.occurrences for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own occurrences"
on public.occurrences for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.trackers t
    where t.id = tracker_id and t.user_id = (select auth.uid())
  )
);

create policy "Users can update their own occurrences"
on public.occurrences for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own occurrences"
on public.occurrences for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Preserve the LT-002 "last done" date as the first history entry.
insert into public.occurrences (tracker_id, user_id, completed_at)
select t.id, t.user_id, t.last_done_at
from public.trackers t
where t.last_done_at is not null
  and not exists (
    select 1 from public.occurrences o
    where o.tracker_id = t.id
  );

-- One atomic action for the app's main button.
create or replace function public.mark_tracker_done(p_tracker_id uuid)
returns timestamptz
language plpgsql
security invoker
set search_path = public
as $$
declare
  done_at timestamptz := now();
  owner_id uuid;
begin
  select user_id into owner_id
  from public.trackers
  where id = p_tracker_id and user_id = auth.uid();

  if owner_id is null then
    raise exception 'Tracker not found';
  end if;

  insert into public.occurrences (tracker_id, user_id, completed_at)
  values (p_tracker_id, owner_id, done_at);

  update public.trackers
  set last_done_at = done_at
  where id = p_tracker_id and user_id = owner_id;

  return done_at;
end;
$$;

grant execute on function public.mark_tracker_done(uuid) to authenticated;
