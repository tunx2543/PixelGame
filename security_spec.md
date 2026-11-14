# Firestore Security Specification (Pixel Quest Character Login)

## 1. Data Invariants
1. **Account Isolation**: Every `/users/{userId}` document belongs strictly to `request.auth.uid == userId` with verified email (`request.auth.token.email_verified == true`). No user can read, list, create, update, or delete another user's profile or PII (`email`).
2. **Character Ownership & Parent Gate**: Every `/users/{userId}/characters/{characterId}` document requires the parent `/users/{userId}` document to exist and belong to `request.auth.uid`, and `ownerId == request.auth.uid` on both creation and updates (`ownerId` and `id` and `createdAt` are immutable).
3. **Strict Schema & Bounds**: All strings enforce `.size()` limits, all IDs match `^[a-zA-Z0-9_\-]+$`, numeric stats (`level`, `exp`, `hp`, `mp`, `gold`, `diamonds`, `playTime`) have bounded ranges, and timestamps must equal `request.time`.
4. **No Shadow Fields**: `hasAll` + `hasOnly` on create and `affectedKeys().hasOnly(...)` on update block arbitrary injected fields (e.g., `isAdmin`, `role`).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Cross-user profile read**: Authenticated as `userB`, `get(/users/userA)` -> `PERMISSION_DENIED`.
2. **Unverified email write**: Authenticated with `email_verified: false`, `set(/users/userA)` -> `PERMISSION_DENIED`.
3. **UID spoofing on profile create**: `uid: "other_uid"` != `request.auth.uid` -> `PERMISSION_DENIED`.
4. **Privilege escalation shadow field**: Create `/users/userA` with extra field `{ role: "admin" }` -> `PERMISSION_DENIED`.
5. **Orphan character create (missing parent)**: Create `/users/userA/characters/slot1` before `/users/userA` exists -> `PERMISSION_DENIED`.
6. **Character ownerId spoofing**: Create `/users/userA/characters/slot1` with `ownerId: "userB"` -> `PERMISSION_DENIED`.
7. **Oversized ID poisoning**: Create `/users/userA/characters/${'a'.repeat(200)}` -> `PERMISSION_DENIED`.
8. **Invalid character ID characters**: Create `/users/userA/characters/slot$1` -> `PERMISSION_DENIED`.
9. **Client-forged timestamp**: Create character with `createdAt: Timestamp.now()` instead of `request.time` -> `PERMISSION_DENIED`.
10. **Immutable field tampering on update**: Update character attempting to change `ownerId`, `id`, or `createdAt` -> `PERMISSION_DENIED`.
11. **Type/Range poisoning on update**: Update character with `level: -99` or `name: 12345` or `name: "x".repeat(100)` -> `PERMISSION_DENIED`.
12. **Unauthorized character list**: Authenticated as `userB`, `list(/users/userA/characters)` -> `PERMISSION_DENIED`.
