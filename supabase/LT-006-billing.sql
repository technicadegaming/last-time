-- Last Time LT-006: plans, Stripe subscription state, and a hard 5-active-tracker free limit.
-- Run this once in Supabase -> SQL Editor after LT-003-history.sql.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free','plus')),
  subscription_status text,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = user_id);

-- Billing fields are intentionally not writable by browser clients.
-- The Stripe webhook updates them with the server-only service role key.

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_last_time on auth.users;
create trigger on_auth_user_created_last_time
after insert or update of email on auth.users
for each row execute procedure public.handle_new_user_profile();

-- Backfill accounts that already existed before LT-006.
insert into public.profiles (user_id, email)
select id, email from auth.users
on conflict (user_id) do update set email = excluded.email;

create or replace function public.profile_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.profile_set_updated_at();

create or replace function public.user_has_plus(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = p_user_id
      and p.plan = 'plus'
      and p.subscription_status in ('active','trialing')
  );
$$;

revoke all on function public.user_has_plus(uuid) from public;
revoke all on function public.user_has_plus(uuid) from authenticated;

create or replace function public.enforce_free_tracker_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_count integer;
  activating boolean := false;
begin
  if tg_op = 'INSERT' then
    activating := new.archived_at is null;
  elsif tg_op = 'UPDATE' then
    activating := old.archived_at is not null and new.archived_at is null;
  end if;

  if activating and not public.user_has_plus(new.user_id) then
    select count(*) into active_count
    from public.trackers t
    where t.user_id = new.user_id
      and t.archived_at is null
      and t.id is distinct from new.id;

    if active_count >= 5 then
      raise exception 'FREE_LIMIT_REACHED' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trackers_enforce_free_limit on public.trackers;
create trigger trackers_enforce_free_limit
before insert or update of archived_at on public.trackers
for each row execute procedure public.enforce_free_tracker_limit();

create index if not exists profiles_stripe_customer_idx on public.profiles(stripe_customer_id);
create index if not exists profiles_stripe_subscription_idx on public.profiles(stripe_subscription_id);
