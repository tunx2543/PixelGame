# Firebase to Supabase migration — Pixel Quest

## Status

This branch builds the Supabase Auth foundation. It does **not** switch the live game yet.

- Supabase project: `fzyvkuvndeinywphtior` (Sydney / ap-southeast-2)
- Supabase schema scaffold: 38 public tables with RLS enabled
- Current Supabase Auth users: 0
- Current `public.user_profile` rows: 0
- Current `public.character_save` rows: 0
- Identity bridge migration `firebase_to_supabase_identity_bridge` is applied and committed.
- GM profile hardening migration `lock_gm_profile_to_trusted_provisioning` is applied and committed.
- GM auto-provision trigger `on_auth_user_pixelquest_gm_profile` is applied and verified on `auth.users`.
- The only configured GM/top-up administrator email is `ffsmilepay53@gmail.com`; permanent GM Game UID remains `0000` (numeric UID 0).
- Once that exact email signs in through Supabase and Supabase marks the email verified, a database trigger provisions the GM profile with role `gm` and Game UID `0000`. Browser clients cannot self-assign GM privileges or reserve that UID.
- Existing game still has Firebase Auth and Firestore dependencies across character saves, social features, presence, chat, mail, parties, trading, GM tools, premium shop, top-ups and payment verification.

## Migration rules

1. Supabase Auth becomes the only sign-in/session provider after cutover.
2. Preserve each player's existing game UID and character/save data. A Supabase UUID must not be substituted for a legacy Firebase UID without an explicit mapping.
3. Do not delete or disable either Firebase project until export, import, account linking, and end-to-end verification are complete.
4. Keep all premium balances, top-up approvals, redeem grants and inventory grants server-authoritative. Never allow browser clients to write balances directly.
5. Keep Firebase data read-only during the migration window; do not dual-write sensitive game-economy records.
6. The historical data source previously identified is `gen-lang-client-0085175453`; the committed app config currently points at `key-generator-xzbz0`. This discrepancy must be resolved against the live Firebase console before exporting or disabling anything.

## Completed database foundation

- Added `public.legacy_identity_link`: maps a Supabase Auth UUID to the original Firebase UID and stable game UID. It is not exposed to browser roles; service-role access only.
- Added `auth_user_id` to `public.user_profile` and `owner_auth_id` to `public.character_save`.
- Added owner-scoped RLS policies for profile and character read/write/delete.
- Restricted browser profile insert/update to the signed-in user's own ordinary player profile, matching the verified JWT email, with `role='player'` and Game UID other than `0000`.
- Added a security-definer trigger that creates/updates the GM profile only for the exact verified GM email. The trigger is not executable by browser roles.
- The new mapping and owner columns are nullable so the empty Supabase project can accept the migration without fabricating users or changing old IDs.
- Existing user/profile/character tables remain empty; no Firebase data has been imported.

## Supabase Auth setup required

Configure Google as an external provider in the Supabase Dashboard:

- Provider: Google
- Supabase callback URL: `https://fzyvkuvndeinywphtior.supabase.co/auth/v1/callback`
- Add the deployed game origin to Supabase Auth URL Configuration / Redirect URLs, including `https://pixelgame.ffsmilepay53.workers.dev/auth/callback`
- Add the Supabase callback URL to the Google OAuth Web client authorized redirect URIs.
- Store the Google OAuth client secret in Supabase provider settings only. Never commit it or expose it as a `NEXT_PUBLIC_*` variable.

Application environment:

- `NEXT_PUBLIC_SUPABASE_URL=https://fzyvkuvndeinywphtior.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Supabase publishable key>`

## Remaining work before production cutover

- Complete Google OAuth provider setup and test PKCE callback/session refresh.
- Export the actual live Firebase Auth user list and Firestore documents from the correct data-bearing project, then import with idempotent checks and reconciliation reports.
- Replace Firebase-dependent character/profile persistence and all Firebase client auth subscriptions.
- Migrate presence, chat, friends, parties, mail, trades, guilds, missions, GM events and announcements to Supabase Realtime/RPC with owner-scoped RLS.
- Rebuild premium/top-up/payment APIs to verify Supabase JWTs and use trusted server-side database transactions.
- Add tests for signup/login, character load/save, account-link collision handling, reconnect and economy transaction idempotency.
- Only after all consumers have moved and end-to-end tests pass, delete the obsolete `lib/firebase/` modules, Firebase config, rules, Firebase ESLint plugin and Firebase npm dependency.
- Deploy to a staging URL, test the full game, then schedule production cutover.
