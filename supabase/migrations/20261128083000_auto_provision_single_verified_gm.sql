-- Automatically provision the one permitted GM identity after Supabase Auth
-- confirms the exact Google account email. No browser client can assign GM.

begin;

create or replace function public.provision_pixelquest_gm_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if lower(coalesce(new.email, '')) = 'ffsmilepay53@gmail.com'
     and new.email_confirmed_at is not null then
    insert into public.user_profile (
      uid, email, "displayName", "gameUid", role,
      "createdAt", "updatedAt", auth_user_id
    )
    values (
      new.id::text,
      'ffsmilepay53@gmail.com',
      coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'Pixel Quest GM'),
      '0000',
      'gm',
      now(),
      now(),
      new.id
    )
    on conflict (auth_user_id) where auth_user_id is not null
    do update set
      email = excluded.email,
      "displayName" = excluded."displayName",
      "gameUid" = '0000',
      role = 'gm',
      "updatedAt" = now();
  end if;
  return new;
end;
$$;

revoke all on function public.provision_pixelquest_gm_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_pixelquest_gm_profile on auth.users;
create trigger on_auth_user_pixelquest_gm_profile
  after insert or update of email, email_confirmed_at on auth.users
  for each row execute function public.provision_pixelquest_gm_profile();

commit;
