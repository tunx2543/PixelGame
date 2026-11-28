# Pixel Quest Firebase dependency audit

Audit target: repository default branch as of 2026-11-28. This is a migration inventory, not a claim that Firebase has been removed.

## Current blockers

- The game still imports Firebase Auth and Firestore in both UI and service modules.
- Supabase Auth currently has 0 users; `user_profile`, `character_save`, `game_inventory`, and `legacy_identity_link` have 0 rows.
- The checked-in `firebase-applet-config.json` points to `key-generator-xzbz0`, while the earlier migration notes identify `gen-lang-client-0085175453` as the historic data-bearing project. The real source of player data must be verified before any export/import.
- The Supabase Google OAuth provider has not been configured or end-to-end tested.
- No CI workflow run was returned for the latest migration commit; this branch has not been build-verified.

## Firebase Auth / Firestore service modules

The repository search found Firebase imports in:

- `lib/firebase/client.ts`
- `lib/firebase/characters.ts`
- `lib/firebase/presence.ts`
- `lib/firebase/friends.ts`
- `lib/firebase/parties.ts`
- `lib/firebase/mmo-online.ts`
- `lib/firebase/rpg-online.ts`
- `lib/firebase/premium-ledger.ts`
- `lib/firebase/redeem-codes.ts`
- `lib/firebase/topup-requests.ts`
- `lib/firebase/gm-events.ts`
- `lib/firebase/daily-missions.ts`

## UI modules using Firebase or Firebase-backed services

- `components/game/title-screen.tsx`
- `components/game/account-panel.tsx`
- `components/game/game.tsx`
- `components/game/presence-sync.tsx`
- `components/game/chat-box.tsx`
- `components/game/social-notifications.tsx`
- `components/game/inventory-screen.tsx`
- `components/game/treasure-chest-screen.tsx`
- `components/game/tower-arena.tsx`
- `components/game/monster-encounter-arena.tsx`
- `components/game/panels/friends-panel.tsx`
- `components/game/panels/mail-panel.tsx`
- `components/game/panels/party-panel.tsx`
- `components/game/panels/trade-panel.tsx`
- `components/game/panels/market-panel.tsx`
- `components/game/panels/arena-panel.tsx`
- `components/game/panels/dungeon-panel.tsx`
- `components/game/panels/redeem-code-panel.tsx`
- `components/game/panels/premium-shop-panel.tsx`
- `components/game/panels/dev-tools-panel.tsx`
- `components/game/panels/guild-boss-panel.tsx`
- `components/game/player-action-menu.tsx`
- `components/game/online-players-popover.tsx`
- `components/game/player-inspect-modal.tsx`

## Server routes / economy paths requiring migration

The following areas must move together so no API accepts a new auth token while still trusting Firebase Firestore for authoritative balances:

- `lib/server/premium-security.ts` verifies Firebase ID tokens and reads authoritative character premium state through Firestore REST.
- `app/api/premium/*` purchase/claim paths use the Firebase-backed actor and premium snapshot.
- `app/api/topup/slip-requests/*` creates/reviews/claims top-up records through the existing store.
- `app/api/redeem/route.ts` and `app/api/version/route.ts` enforce Firebase-specific verified-email checks.
- `app/api/gm/*` contains Firebase-specific GM authorization and event persistence.
- `lib/game/permissions.ts` imports the Firebase User type and contains GM account rules.

## Migration sequence

1. Finish Google OAuth provider configuration and server-side Supabase JWT verification.
2. Export the correct Firebase Auth users and Firestore documents; produce a source-count and checksum report.
3. Import users with an explicit Supabase UUID ↔ legacy Firebase UID ↔ game UID mapping; never infer identity from email alone.
4. Move profile and character save reads/writes, then test all three character slots and local-save import.
5. Move realtime presence, chat, friends, parties, whispers, mail, trades, guilds, missions and GM events; add table-specific RLS policies before exposing each feature.
6. Move premium ledger, top-up review/claim, redeem and inventory mutations to transactional server-side Supabase operations. Do not grant clients direct balance writes.
7. Run build, typecheck, integration and economy idempotency tests; deploy staging and reconcile player/economy counts.
8. Only after verified cutover, remove Firebase runtime imports, packages, project config, rules and secrets.

## Safety posture

Firebase remains untouched as the legacy source until the cutover passes. The new identity bridge is deliberately private to service-role operations. RLS is enabled on all public tables; tables without feature-specific policies remain default-deny rather than receiving broad permissive policies.
