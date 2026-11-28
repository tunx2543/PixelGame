# Firebase to Supabase migration — Pixel Quest

## Status

This branch starts the Supabase Auth foundation. It does **not** switch the live game yet.

- Supabase project: `fzyvkuvndeinywphtior` (Sydney / ap-southeast-2)
- Supabase schema scaffold: 38 public tables with RLS enabled
- Current Supabase Auth users: 0
- Current `public.user_profile` rows: 0
- Current `public.character_save` rows: 0
- Existing game still has Firebase Auth and Firestore dependencies across character saves, social features, presence, chat, mail, parties, trading, GM tools, premium shop, top-ups and payment verification.

## Migration rules

1. Supabase Auth becomes the only sign-in/session provider after cutover.
2. Preserve each player's existing game UID and character/save data. A Supabase UUID must not be substituted for a legacy Firebase UID without an explicit mapping.
3. Do not delete or disable either Firebase project until export, import, account linking, and end-to-end verification are complete.
4. Keep all premium balances, top-up approvals, redeem grants and inventory grants server-authoritative. Never allow browser clients to write balances directly.
5. Keep Firebase data read-only during the migration window; do not dual-write sensitive game-economy records.
6. The old data-bearing Firebase project was previously identified as `gen-lang-client-0085175453`; `key-generator-xzbz0` is a separate project. Export must target the project that actually contains the live player data.

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
- Add an identity-link table that maps Supabase Auth UUIDs to legacy Firebase UIDs and existing game UIDs.
- Export the live Firebase Auth user list and Firestore documents from the data-bearing Firebase project, then import with idempotent checks and reconciliation reports.
- Replace Firebase-dependent character/profile persistence and all Firebase client auth subscriptions.
- Migrate presence, chat, friends, parties, mail, trades, guilds, missions, GM events and announcements to Supabase Realtime/RPC with owner-scoped RLS.
- Rebuild premium/top-up/payment APIs to verify Supabase JWTs and use trusted server-side database transactions.
- Remove Firebase packages, config files, rules and secrets only after repository-wide search and end-to-end tests show no remaining Firebase runtime dependency.
- Deploy to a staging URL, test account creation/login, character load/save, reconnect, social features and economy flows, then schedule the production cutover.
