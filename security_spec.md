# Firestore Security Specification (Pixel Quest Character Login)

## 1. Data Invariants
1. **Account Isolation**: Every `/users/{userId}` document belongs strictly to `request.auth.uid == userId` with verified email (`request.auth.token.email_verified == true`). No user can read, list, create, update, or delete another user's profile or PII (`email`).
2. **Character Ownership & Parent Gate**: Every `/users/{userId}/characters/{characterId}` document requires the parent `/users/{userId}` document to exist and belong to `request.auth.uid`, and `ownerId == request.auth.uid` on both creation and updates (`ownerId` and `id` and `createdAt` are immutable).
3. **Strict Schema & Bounds**: All strings enforce `.size()` limits, all IDs match `^[a-zA-Z0-9_\-]+$`, numeric stats (`level`, `exp`, `hp`, `mp`, `gold`, `diamonds`, `playTime`) have bounded ranges, and timestamps must equal `request.time`.
4. **No Shadow Fields**: `hasAll` + `hasOnly` on create and `affectedKeys().hasOnly(...)` on update block arbitrary injected fields (e.g., `isAdmin`, `role`).
5. **Sole GM & UID `0000` Reservation**: Only `request.auth.token.email_verified == true && request.auth.token.email == 'ffsmilepay53@gmail.com'` can hold `role: 'gm'`, claim `/playerUids/0000`, set `isGm: true`, or delete their own `dailyMissions` doc for Dev testing. All other users must hold `role: 'player'`, `isGm: false`, and a non-`0000` numeric `gameUid`.
6. **PII Isolation in UID Directory**: `/playerUids/{gameUid}` stores zero PII (`email` forbidden) and disables `list` queries (`allow list: if false`) to prevent player enumeration while supporting exact `get` lookup by Game UID.
7. **Bilateral Friend Integrity**: `/friendRequests/{requestId}` requires `requestId == fromUid + '__' + toUid`, prevents self-requests, verifies both `fromGameUid` and `toGameUid` exist in `/playerUids` matching `fromUid`/`toUid`, restricts `list` to `fromUid == request.auth.uid || toUid == request.auth.uid`, and enforces terminal state locking (`accepted`/`declined` cannot revert to `pending`).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Cross-user profile read**: Authenticated as `userB`, `get(/users/userA)` -> `PERMISSION_DENIED`.
2. **Unverified email write**: Authenticated with `email_verified: false`, `set(/users/userA)` -> `PERMISSION_DENIED`.
3. **UID spoofing on profile create**: `uid: "other_uid"` != `request.auth.uid` -> `PERMISSION_DENIED`.
4. **Privilege escalation shadow field**: Create `/users/userA` with extra field `{ isAdmin: true }` -> `PERMISSION_DENIED`.
5. **Orphan character create (missing parent)**: Create `/users/userA/characters/slot1` before `/users/userA` exists -> `PERMISSION_DENIED`.
6. **Character ownerId spoofing**: Create `/users/userA/characters/slot1` with `ownerId: "userB"` -> `PERMISSION_DENIED`.
7. **Oversized ID poisoning**: Create `/users/userA/characters/${'a'.repeat(200)}` -> `PERMISSION_DENIED`.
8. **Invalid character ID characters**: Create `/users/userA/characters/slot$1` -> `PERMISSION_DENIED`.
9. **Client-forged timestamp**: Create character with `createdAt: Timestamp.now()` instead of `request.time` -> `PERMISSION_DENIED`.
10. **Immutable field tampering on update**: Update character attempting to change `ownerId`, `id`, or `createdAt` -> `PERMISSION_DENIED`.
11. **Type/Range poisoning on update**: Update character with `level: -99` or `name: 12345` or `name: "x".repeat(100)` -> `PERMISSION_DENIED`.
12. **Unauthorized character list**: Authenticated as `userB`, `list(/users/userA/characters)` -> `PERMISSION_DENIED`.
13. **Daily mission double-claim / tamper**: Update `/users/userA/dailyMissions/2026-11-14` setting `claimed: false` after it was `true`, or increasing `rewardDiamonds`, or claiming when `progress < target` -> `PERMISSION_DENIED`.
14. **Daily mission dateKey mismatch**: Create `/users/userA/dailyMissions/invalid_date` or with `dateKey != docId` -> `PERMISSION_DENIED`.
15. **Non-GM claiming UID 0000 or GM role**: Authenticated as `other@gmail.com`, create `/playerUids/0000` or set `role: 'gm'` in `/users/userB` -> `PERMISSION_DENIED`.
16. **UID directory scraping**: Authenticated user calls `list(/playerUids)` -> `PERMISSION_DENIED`.
17. **Self-friend or forged friend request**: Create `/friendRequests/userA__userA` or spoof `fromUid: "userB"` or accept own outgoing request -> `PERMISSION_DENIED`.

