# CampusConnect Security Specification (Payload-First Security TDD)

## 1. Data Invariants

1. **Organizer RBAC Integrity**: Only verified organizers (`/organizers/{uid}` or bootstrapped verified admin `avanishpatil1234@gmail.com`) may create, edit, or mark events as completed, or read full participant rosters containing student PII.
2. **Self-Assigned Role Prevention**: Students cannot create or update `/organizers/{uid}` or assign elevated privileges in `/users/{uid}`.
3. **Atomic Seat Accounting**: A student registration (`events/{eventId}/registrations/{uid}`) can only be created atomically alongside a `+1` increment to `events/{eventId}.registeredCount`, strictly bounded by `registeredCount <= capacity`, `status == 'upcoming'`, and `request.time.toMillis() < deadlineMs`.
4. **Duplicate Prevention**: At most one registration per `uid` (`/events/{eventId}/registrations/{uid}`), per `studentId` (`/events/{eventId}/locks/sid_<hash>`), and per `email` (`/events/{eventId}/locks/eml_<hash>`) per event.
5. **Terminal State Locking**: Once an event reaches `status == 'completed'`, student seat updates are rejected; only an organizer may manage the event.
6. **PII Isolation**: Registration documents containing student emails and phone numbers can only be read (`get`/`list`) by the owning student (`request.auth.uid == userId`) or a verified organizer.
7. **Temporal & Structural Integrity**: All `createdAt`, `updatedAt`, and `registeredAt` fields must equal `request.time`. All document IDs match `^[a-zA-Z0-9_\-]+$`, and all strings/numbers enforce strict length and range bounds.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Shadow Field Injection on Event Creation**: Organizer attempts to create an event with an extra ghost field `isFeatured: true` -> Rejected by `keys().hasOnly(...)`.
2. **Student Event Tampering**: Student attempts to update `events/{eventId}` changing `capacity` or `status` instead of only `registeredCount` and `updatedAt` -> Rejected by `affectedKeys().hasOnly(['registeredCount', 'updatedAt'])`.
3. **Over-Capacity Seat Increment**: Student tries to increment `registeredCount` beyond `capacity` or by `+2` -> Rejected by `incoming().registeredCount == existing().registeredCount + 1 && incoming().registeredCount <= existing().capacity`.
4. **Registration After Deadline**: Student attempts to register when `request.time.toMillis() >= existing().deadlineMs` -> Rejected.
5. **Registration on Completed Event**: Student attempts to increment `registeredCount` when `existing().status == 'completed'` -> Rejected.
6. **Orphaned Registration Without Seat Increment**: Student creates `/events/{eventId}/registrations/{uid}` without incrementing `events/{eventId}.registeredCount` in the same transaction -> Rejected by `getAfter(...)`.
7. **Identity Spoofing on Registration**: Student creates `/events/{eventId}/registrations/other_uid` or sets `userId: 'other_uid'` -> Rejected by `regUserId == request.auth.uid && data.userId == request.auth.uid`.
8. **Self-Promotion to Organizer**: Authenticated student attempts to write `/organizers/{myUid}` -> Rejected by `!isOrganizer()` check.
9. **Cross-Student PII Scraping**: Student A attempts `get` or `list` on `/events/{eventId}/registrations/{studentB_uid}` -> Rejected by `request.auth.uid == regUserId || isOrganizer()`.
10. **Lock Enumeration / Scraping**: Student attempts `list` on `/events/{eventId}/locks` -> Rejected by `allow list: if false`.
11. **Timestamp Forgery**: Client submits `registeredAt: Timestamp.fromMillis(0)` instead of `serverTimestamp()` -> Rejected by `data.registeredAt == request.time`.
12. **Resource Poisoning / Invalid ID**: Attacker attempts write to `/events/invalid$id!with*badchars` or sends a 10KB `fullName` -> Rejected by `isValidId()` and `fullName.size() <= 80`.
