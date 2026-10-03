-- Last Time LT-012: production security hardening
-- Run after LT-010 and LT-011. Safe to re-run.

-- Family membership is an active Plus feature. The household owner can still
-- inspect/manage the household after cancellation, but invited members lose
-- shared access until the owner has active Plus again.
create or replace function public.is_household_member(
  p_household_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    join public.households h on h.id = hm.household_id
    where hm.household_id = p_household_id
      and hm.user_id = p_user_id
      and public.user_has_plus(h.owner_id)
  );
$$;

revoke all on function public.is_household_member(uuid, uuid) from public;
grant execute on function public.is_household_member(uuid, uuid) to authenticated;

-- Keep household owners able to see/manage their family even if Plus lapses.
drop policy if exists "Members can view their household" on public.households;
create policy "Members can view their household"
on public.households for select
to authenticated
using (
  owner_id = auth.uid()
  or public.is_household_member(id)
);

drop policy if exists "Members can view household members" on public.household_members;
create policy "Members can view household members"
on public.household_members for select
to authenticated
using (
  public.is_household_owner(household_id)
  or public.is_household_member(household_id)
);

-- Never let browser users transfer tracker ownership. Only the creator may
-- change whether a tracker belongs to a household.
create or replace function public.guard_tracker_identity()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'TRACKER_OWNER_IMMUTABLE' using errcode = 'P0001';
  end if;

  if new.household_id is distinct from old.household_id
     and auth.uid() is distinct from old.user_id then
    raise exception 'TRACKER_SHARING_CREATOR_ONLY' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trackers_guard_identity on public.trackers;
create trigger trackers_guard_identity
before update of user_id, household_id on public.trackers
for each row execute procedure public.guard_tracker_identity();

-- A non-owner can leave a family without needing the owner's intervention.
create or replace function public.leave_household()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  membership_role text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select hm.role into membership_role
  from public.household_members hm
  where hm.user_id = auth.uid();

  if membership_role is null then
    return;
  end if;

  if membership_role = 'owner' then
    raise exception 'OWNER_CANNOT_LEAVE';
  end if;

  delete from public.household_members
  where user_id = auth.uid();
end;
$$;

revoke all on function public.leave_household() from public;
grant execute on function public.leave_household() to authenticated;

-- Owners can remove invited members but cannot remove themselves.
create or replace function public.remove_household_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_household uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select h.id into target_household
  from public.households h
  where h.owner_id = auth.uid()
  limit 1;

  if target_household is null then
    raise exception 'OWNER_REQUIRED';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'OWNER_CANNOT_REMOVE_SELF';
  end if;

  delete from public.household_members
  where household_id = target_household
    and user_id = p_user_id;
end;
$$;

revoke all on function public.remove_household_member(uuid) from public;
grant execute on function public.remove_household_member(uuid) to authenticated;

-- Owners can dissolve the family. Shared trackers remain with their original
-- creators and become private because the FK uses ON DELETE SET NULL.
create or replace function public.delete_household()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  delete from public.households
  where owner_id = auth.uid();

  if not found then
    raise exception 'OWNER_REQUIRED';
  end if;
end;
$$;

revoke all on function public.delete_household() from public;
grant execute on function public.delete_household() to authenticated;


-- Return a minimal member list to people in the same household.
create or replace function public.get_household_members()
returns table(
  user_id uuid,
  role text,
  email text,
  joined_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_household uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select hm.household_id into target_household
  from public.household_members hm
  where hm.user_id = auth.uid()
  limit 1;

  if target_household is null then
    return;
  end if;

  if not (
    public.is_household_owner(target_household)
    or public.is_household_member(target_household)
  ) then
    raise exception 'HOUSEHOLD_ACCESS_REQUIRED';
  end if;

  return query
  select hm.user_id, hm.role, p.email, hm.joined_at
  from public.household_members hm
  left join public.profiles p on p.user_id = hm.user_id
  where hm.household_id = target_household
  order by case when hm.role = 'owner' then 0 else 1 end, hm.joined_at asc;
end;
$$;

revoke all on function public.get_household_members() from public;
grant execute on function public.get_household_members() to authenticated;
