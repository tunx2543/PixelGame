-- Runtime tables used by the current Supabase-backed MMO paths.
-- Additive and non-destructive. Firebase remains the primary auth/data path during migration.
create table if not exists public.game_rooms (
  room_id text primary key,
  host_id uuid not null references auth.users(id) on delete cascade,
  snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists game_rooms_updated_at_idx on public.game_rooms (updated_at desc);

create table if not exists public.private_messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 240),
  created_at timestamptz not null default now(),
  constraint private_messages_not_self check (sender_id <> recipient_id)
);
create index if not exists private_messages_recipient_id_id_idx on public.private_messages (recipient_id, id);
create index if not exists private_messages_sender_id_id_idx on public.private_messages (sender_id, id);

create table if not exists public.world_announcements (
  id bigint generated always as identity primary key,
  author_id uuid not null references auth.users(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 240),
  created_at timestamptz not null default now()
);
create index if not exists world_announcements_created_at_idx on public.world_announcements (created_at desc);

create table if not exists public.game_inventory (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null check (char_length(item_id) between 1 and 96),
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.game_rooms enable row level security;
alter table public.private_messages enable row level security;
alter table public.world_announcements enable row level security;
alter table public.game_inventory enable row level security;

revoke all on public.game_rooms, public.private_messages, public.world_announcements, public.game_inventory from anon;
revoke all on public.game_rooms, public.private_messages, public.world_announcements, public.game_inventory from authenticated;

grant select, insert, update on public.game_rooms to authenticated;
grant select, insert on public.private_messages to authenticated;
grant select on public.world_announcements to authenticated;
grant select on public.game_inventory to authenticated;
grant usage, select on sequence public.private_messages_id_seq to authenticated;
grant usage, select on sequence public.world_announcements_id_seq to authenticated;

drop policy if exists game_rooms_read_authenticated on public.game_rooms;
create policy game_rooms_read_authenticated on public.game_rooms
  for select to authenticated using (true);
drop policy if exists game_rooms_insert_owner on public.game_rooms;
create policy game_rooms_insert_owner on public.game_rooms
  for insert to authenticated with check (host_id = (select auth.uid()));
drop policy if exists game_rooms_update_owner on public.game_rooms;
create policy game_rooms_update_owner on public.game_rooms
  for update to authenticated using (host_id = (select auth.uid()))
  with check (host_id = (select auth.uid()));

drop policy if exists private_messages_read_participant on public.private_messages;
create policy private_messages_read_participant on public.private_messages
  for select to authenticated
  using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));
drop policy if exists private_messages_insert_sender on public.private_messages;
create policy private_messages_insert_sender on public.private_messages
  for insert to authenticated
  with check (sender_id = (select auth.uid()) and recipient_id <> (select auth.uid()));

drop policy if exists world_announcements_read_authenticated on public.world_announcements;
create policy world_announcements_read_authenticated on public.world_announcements
  for select to authenticated using (true);

drop policy if exists game_inventory_read_owner on public.game_inventory;
create policy game_inventory_read_owner on public.game_inventory
  for select to authenticated using (user_id = (select auth.uid()));

comment on table public.game_inventory is 'Read-only client access until item grants and spending are moved to server-authoritative RPCs.';
comment on table public.world_announcements is 'Authenticated read only; publishing requires a verified GM server-side path.';
