-- Identity bridge for the Firebase -> Supabase cutover.
-- Safe to apply more than once. Existing Firebase UID and game UID remain intact.

begin;

create table if not exists public.legacy_identity_link (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  legacy_firebase_uid text not null unique,
  game_uid text not null unique,
  linked_at timestamptz not null default now(),
  constraint legacy_identity_link_firebase_uid_nonempty
    check (length(btrim(legacy_firebase_uid)) between 1 and 128),
  constraint legacy_identity_link_game_uid_nonempty
    check (length(btrim(game_uid)) between 1 and 16)
);

alter table public.legacy_identity_link enable row level security;
revoke all on public.legacy_identity_link from public, anon, authenticated;
grant all on public.legacy_identity_link to service_role;

alter table public.user_profile
  add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;

create unique index if not exists user_profile_auth_user_id_uidx
  on public.user_profile(auth_user_id) where auth_user_id is not null;

alter table public.character_save
  add column if not exists owner_auth_id uuid references auth.users(id) on delete cascade;

create index if not exists character_save_owner_auth_id_idx
  on public.character_save(owner_auth_id);

create unique index if not exists character_save_owner_slot_uidx
  on public.character_save(owner_auth_id, id) where owner_auth_id is not null;

drop policy if exists user_profile_select_own on public.user_profile;
create policy user_profile_select_own on public.user_profile
  for select to authenticated using (auth_user_id = (select auth.uid()));

drop policy if exists user_profile_insert_own on public.user_profile;
create policy user_profile_insert_own on public.user_profile
  for insert to authenticated with check (auth_user_id = (select auth.uid()));

drop policy if exists user_profile_update_own on public.user_profile;
create policy user_profile_update_own on public.user_profile
  for update to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

drop policy if exists character_save_select_own on public.character_save;
create policy character_save_select_own on public.character_save
  for select to authenticated using (owner_auth_id = (select auth.uid()));

drop policy if exists character_save_insert_own on public.character_save;
create policy character_save_insert_own on public.character_save
  for insert to authenticated with check (owner_auth_id = (select auth.uid()));

drop policy if exists character_save_update_own on public.character_save;
create policy character_save_update_own on public.character_save
  for update to authenticated
  using (owner_auth_id = (select auth.uid()))
  with check (owner_auth_id = (select auth.uid()));

drop policy if exists character_save_delete_own on public.character_save;
create policy character_save_delete_own on public.character_save
  for delete to authenticated using (owner_auth_id = (select auth.uid()));

commit;
