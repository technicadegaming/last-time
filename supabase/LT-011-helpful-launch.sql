-- Last Time LT-011: helpful launch improvements
-- Run after LT-010-family-sharing.sql.

-- User reminder preferences. Defaults are intentionally simple for launch.
alter table public.profiles
  add column if not exists email_reminders boolean not null default true;

alter table public.profiles
  add column if not exists timezone text not null default 'America/Chicago';

-- Prevent duplicate reminder emails for the same tracker/due date/recipient.
create table if not exists public.reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  tracker_id uuid not null references public.trackers(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  due_date date not null,
  sent_at timestamptz not null default now(),
  unique (tracker_id, recipient_user_id, due_date)
);

create index if not exists reminder_deliveries_recipient_idx
  on public.reminder_deliveries(recipient_user_id, sent_at desc);

alter table public.reminder_deliveries enable row level security;

drop policy if exists "Users can read their reminder deliveries" on public.reminder_deliveries;
create policy "Users can read their reminder deliveries"
on public.reminder_deliveries for select
to authenticated
using (recipient_user_id = auth.uid());

-- Browser clients may update only their own safe preferences through this RPC.
create or replace function public.set_profile_preferences(
  p_email_reminders boolean,
  p_timezone text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  update public.profiles
  set
    email_reminders = p_email_reminders,
    timezone = coalesce(nullif(trim(p_timezone), ''), timezone)
  where user_id = auth.uid();
end;
$$;

grant execute on function public.set_profile_preferences(boolean, text) to authenticated;

-- History helper for shared trackers. It reveals completion identity only to
-- people who already have access to the tracker.
create or replace function public.get_tracker_history(p_tracker_id uuid)
returns table(
  id uuid,
  completed_at timestamptz,
  note text,
  completed_by text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.trackers t
    where t.id = p_tracker_id
      and (
        t.user_id = auth.uid()
        or (t.household_id is not null and public.is_household_member(t.household_id))
      )
  ) then
    raise exception 'TRACKER_NOT_FOUND';
  end if;

  return query
  select
    o.id,
    o.completed_at,
    o.note,
    coalesce(p.email, 'Family member') as completed_by
  from public.occurrences o
  left join public.profiles p on p.user_id = o.user_id
  where o.tracker_id = p_tracker_id
  order by o.completed_at desc
  limit 50;
end;
$$;

grant execute on function public.get_tracker_history(uuid) to authenticated;
