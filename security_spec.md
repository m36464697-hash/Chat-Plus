# Chat Plus Security Specification

## 1. Data Invariants
1. **Strict PII Isolation**: A user's `/users/{userId}` document (containing email, phone, and private preferences) is readable and writable exclusively by `request.auth.uid == userId`. No blanket `list` or cross-user `get` is permitted.
2. **Membership-Gated Chat & Safe Member Directory**: Access to `/chats/{chatId}`, `/chats/{chatId}/members`, `/chats/{chatId}/messages`, and `/chats/{chatId}/typing` requires verified authentication (`request.auth.token.email_verified == true`) and active membership in `/chats/{chatId}/members/{request.auth.uid}`. Public member profiles under `/chats/{chatId}/members/{memberId}` intentionally expose only non-PII presence metadata (`name`, `username`, `avatar`, `bio`, `status`, `statusMessage`, `role`, `joinedAt`, `lastActiveAt`).
3. **Secret Room Code Isolation**: `/roomCodes/{code}` forbids `allow list` to prevent scraping/enumerating active room codes; only `get` with the exact room code is allowed.
4. **Identity Integrity**: Every created chat (`createdBy`), joined ref (`userId`), member (`userId`), message (`senderId`), and typing state (`userId`) must strictly equal `request.auth.uid`. Self-escalation of `role` to `'owner'` on join is blocked, and members may only update their own presence fields (`memberId == request.auth.uid`).
5. **Temporal Integrity & Immutability**: `createdAt`, `updatedAt`, `joinedAt`, and `lastActiveAt` (when set) must match `request.time`. `createdBy`, `createdAt`, `code`, `encryptionSalt`, and `senderId` are immutable after creation.
6. **Strict Schema & Size Guards**: Every document enforces exact `hasAll` / `hasOnly` keys (including the 20 allowlisted `UserPreferences` keys), type checks, ID regex guards (`^[a-zA-Z0-9_\\-]+$`), and strict byte/length bounds (`avatar <= 500000`, `mediaUrl <= 850000`, `content <= 20000`).

## 2. The Dirty Dozen+ Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated User Read**: `GET /users/user123` with `auth = null`.
2. **Cross-User PII Read**: `GET /users/userB` signed in as `userA`.
3. **Users Collection Scrape**: `LIST /users` signed in as any user.
4. **Shadow Field Injection on User Profile**: `CREATE /users/userA` with extra ghost field `{ ..., isAdmin: true }`.
5. **Unverified Email Write**: `CREATE /chats/chat1` with `email_verified: false`.
6. **Sender Spoofing in Message**: `CREATE /chats/chat1/messages/m1` signed in as `userA` with `senderId: "userB"`.
7. **Non-Member Message Read**: `LIST /chats/chat1/messages` signed in as `userC` who is not in `/chats/chat1/members/userC`.
8. **Room Code Enumeration**: `LIST /roomCodes` signed in as any user.
9. **Owner Escalation on Join**: `CREATE /chats/chat1/members/userB` with `role: "owner"` when `chats/chat1.createdBy == "userA"`.
10. **Immutable Field Tampering**: `UPDATE /chats/chat1` attempting to alter `createdBy` or `encryptionSalt`.
11. **Oversized ID / Resource Poisoning**: `CREATE /chats/` + `'a'.repeat(500)` bypassing `isValidId()`.
12. **Client-Forged Timestamp**: `CREATE /chats/chat1/messages/m2` with `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`.
13. **Outsider Member Directory Enumeration**: `LIST /chats/chat1/members` signed in as an outsider not in `/chats/chat1/members`.
14. **Cross-Member Presence Spoofing**: `UPDATE /chats/chat1/members/userB` signed in as `userA`.
