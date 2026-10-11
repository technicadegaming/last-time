-- Reserve a reminder before sending. Existing rows represent delivered reminders.
alter table public.reminder_deliveries
  add column if not exists delivery_status text not null default 'sent'
  check (delivery_status in ('pending','sent'));
create index if not exists reminder_deliveries_pending_idx
  on public.reminder_deliveries(sent_at) where delivery_status='pending';
