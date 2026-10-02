-- Last Time LT-010: Family sharing
-- Run this once in Supabase -> SQL Editor after LT-006-billing.sql.
-- One Plus household owner can create a family and invite other Last Time users.

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  owner_id uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id),
  unique (user_id)
);

alter table public.trackers
  add column if not exists household_id uuid references public.households(id) on delete set null;

create index if not exists trackers_household_active_idx
  on public.trackers(household_id, archived_at, last_done_at);

create index if not exists household_members_user_idx
  on public.household_members(user_id);

alter table public.households enable row level security;
alter table public.household_members enable row level security;

create or replace function public.is_household_member(p_household_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = p_user_id
  );
$$;

create or replace function public.is_household_owner(p_household_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.households h
    where h.id = p_household_id
      and h.owner_id = p_user_id
  );
$$;

grant execute on function public.is_household_member(uuid, uuid) to authenticated;
grant execute on function public.is_household_owner(uuid, uuid) to authenticated;

drop policy if exists "Members can view their household" on public.households;
drop policy if exists "Owners can update their household" on public.households;

create policy "Members can view their household"
on public.households for select
to authenticated
using (public.is_household_member(id));

create policy "Owners can update their household"
on public.households for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Members can view household members" on public.household_members;

create policy "Members can view household members"
on public.household_members for select
to authenticated
using (public.is_household_member(household_id));

create or replace function public.create_household(p_name text)
returns table(household_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  new_code text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'ALREADY_IN_HOUSEHOLD';
  end if;

  if not public.user_has_plus(auth.uid()) then
    raise exception 'PLUS_REQUIRED';
  end if;

  insert into public.households (name, owner_id)
  values (trim(p_name), auth.uid())
  returning id, households.invite_code into new_id, new_code;

  insert into public.household_members (household_id, user_id, role)
  values (new_id, auth.uid(), 'owner');

  return query select new_id, new_code;
end;
$$;

create or replace function public.join_household(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  target_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'ALREADY_IN_HOUSEHOLD';
  end if;

  select h.id, h.owner_id
  into target_id, target_owner
  from public.households h
  where lower(h.invite_code) = lower(trim(p_invite_code));

  if target_id is null then
    raise exception 'INVITE_NOT_FOUND';
  end if;

  if not public.user_has_plus(target_owner) then
    raise exception 'HOUSEHOLD_PLUS_REQUIRED';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (target_id, auth.uid(), 'member');

  return target_id;
end;
$$;

grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household(text) to authenticated;

-- Shared tracker access.
drop policy if exists "Users can read their own trackers" on public.trackers;
drop policy if exists "Users can create their own trackers" on public.trackers;
drop policy if exists "Users can update their own trackers" on public.trackers;
drop policy if exists "Users can delete their own trackers" on public.trackers;

create policy "Users can read accessible trackers"
on public.trackers for select
to authenticated
using (
  auth.uid() = user_id
  or (household_id is not null and public.is_household_member(household_id))
);

create policy "Users can create accessible trackers"
on public.trackers for insert
to authenticated
with check (
  auth.uid() = user_id
  and (
    household_id is null
    or public.is_household_member(household_id)
  )
);

create policy "Users can update accessible trackers"
on public.trackers for update
to authenticated
using (
  auth.uid() = user_id
  or (household_id is not null and public.is_household_member(household_id))
)
with check (
  auth.uid() = user_id
  or (household_id is not null and public.is_household_member(household_id))
);

create policy "Tracker creators can delete trackers"
on public.trackers for delete
to authenticated
using (auth.uid() = user_id);

-- Shared occurrence/history access.
drop policy if exists "Users can read their own occurrences" on public.occurrences;
drop policy if exists "Users can create their own occurrences" on public.occurrences;
drop policy if exists "Users can update their own occurrences" on public.occurrences;
drop policy if exists "Users can delete their own occurrences" on public.occurrences;

create policy "Users can read accessible occurrences"
on public.occurrences for select
to authenticated
using (
  exists (
    select 1
    from public.trackers t
    where t.id = tracker_id
      and (
        t.user_id = auth.uid()
        or (t.household_id is not null and public.is_household_member(t.household_id))
      )
  )
);

create policy "Users can create accessible occurrences"
on public.occurrences for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.trackers t
    where t.id = tracker_id
      and (
        t.user_id = auth.uid()
        or (t.household_id is not null and public.is_household_member(t.household_id))
      )
  )
);

create policy "Users can update their own occurrences"
on public.occurrences for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete their own occurrences"
on public.occurrences for delete
to authenticated
using (user_id = auth.uid());

-- Shared family members can use Did it again. The completion history records
-- the member who actually completed the task.
create or replace function public.mark_tracker_done(p_tracker_id uuid)
returns timestamptz
language plpgsql
security invoker
set search_path = public
as $$
declare
  done_at timestamptz := now();
  can_access boolean := false;
begin
  select exists (
    select 1
    from public.trackers t
    where t.id = p_tracker_id
      and (
        t.user_id = auth.uid()
        or (t.household_id is not null and public.is_household_member(t.household_id))
      )
  ) into can_access;

  if not can_access then
    raise exception 'Tracker not found';
  end if;

  insert into public.occurrences (tracker_id, user_id, completed_at)
  values (p_tracker_id, auth.uid(), done_at);

  update public.trackers
  set last_done_at = done_at
  where id = p_tracker_id;

  return done_at;
end;
$$;

grant execute on function public.mark_tracker_done(uuid) to authenticated;
