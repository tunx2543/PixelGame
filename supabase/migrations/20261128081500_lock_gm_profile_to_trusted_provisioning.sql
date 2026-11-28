-- Lock the only GM identity to trusted provisioning.
-- Authenticated clients can only maintain ordinary player profiles. A verified
-- GM profile (role='gm', gameUid='0000') must be provisioned by server/service_role.

begin;

drop policy if exists user_profile_insert_own on public.user_profile;
create policy user_profile_insert_own on public.user_profile
  for insert to authenticated
  with check (
    auth_user_id = (select auth.uid())
    and role = 'player'
    and "gameUid" <> '0000'
    and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );

drop policy if exists user_profile_update_own on public.user_profile;
create policy user_profile_update_own on public.user_profile
  for update to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (
    auth_user_id = (select auth.uid())
    and role = 'player'
    and "gameUid" <> '0000'
    and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );

commit;
