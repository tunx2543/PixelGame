# PixelGame Supabase integration

This directory contains migrations for the Supabase project `fzyvkuvndeinywphtior`.

## Current deployment state
- The baseline and runtime migrations below have already been applied to the connected Supabase project.
- Firebase Auth/Firestore remain the active identity and persistence path for existing players. Do not disable Firebase until the account/data migration and end-to-end tests are complete.
- The blueprint tables are currently default-deny for `anon` and `authenticated`; privileged server operations use the service role only from trusted server code.
- Runtime tables support the existing Supabase-only paths when a player has a Supabase Auth session. They do not migrate Firebase users.

## Environment
Set these in the Cloudflare Worker/Pages environment (never commit real secrets):
- `NEXT_PUBLIC_SUPABASE_URL=https://fzyvkuvndeinywphtior.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = the project's publishable key
- Keep `PREMIUM_TX_SECRET` configured as a persistent secret before enabling premium transactions.

Never expose a service-role/secret key through a `NEXT_PUBLIC_*` variable.

## Migrations
- `20261128071107_pixelgame_firebase_blueprint_baseline.sql`: additive table baseline derived from `firebase-blueprint.json`.
- `20261128071423_pixelgame_runtime_tables_v1.sql`: runtime tables and narrow RLS policies for game rooms, private messages, announcements, and inventory reads.

The baseline is a schema scaffold, not a completed Firebase data migration. Several nested document fields remain JSONB by design.
