# REST API Design Document

## VisuaLinux — Interactive Visual Linux Learning Platform

| Field | Value |
|---|---|
| Document Version | 1.0 (Draft) |
| Companion Documents | PRD v1.0, Architecture v1.0, Database Design v1.0 |
| Author | Lead Software Architect / API Design |
| Scope | Complete REST surface for MVP, expressed as request/response field specifications — no code, no implementation |

---

## 0. API-Wide Conventions

Stated once here rather than repeated on every endpoint.

**Base path & versioning:** All endpoints are prefixed `/api/v1/`. Versioning lives in the URL path rather than a header — simpler for clients, easier to reason about during a breaking change, and lets two versions run side-by-side during a migration window.

**Authentication:** Unless explicitly marked "No auth required," every endpoint requires a bearer access token in the `Authorization` header, issued per the Authentication API (Section 1). Tokens are short-lived; expiry is handled via the refresh endpoint, not by extending token lifetime.

**Standard error envelope:** Every non-2xx response returns the same shape, so clients handle errors uniformly regardless of endpoint:

| Field | Type | Description |
|---|---|---|
| error.code | string | Machine-readable error identifier (e.g. `VALIDATION_FAILED`, `SANDBOX_NOT_FOUND`) |
| error.message | string | Human-readable description, safe to show a developer, not necessarily the end user |
| error.details | array, optional | Field-level validation failures, where applicable |

**Pagination:** All list endpoints use **cursor-based pagination** (`cursor`, `limit` query parameters; response includes `nextCursor`), not offset-based (`page`/`offset`). *Reasoning:* offset pagination degrades badly on the large, continuously-growing tables identified in the Database Design document (`command_history`, `xp_ledger`) — a `LIMIT 20 OFFSET 40000` query gets slower as the offset grows, while cursor pagination stays flat-cost regardless of how deep into the list a client pages. This is the same "design for the scale trigger before it arrives" reasoning applied consistently from the Architecture and Database documents.

**Status code philosophy — the important nuance:** A command that *fails as a Linux command* (unrecognized command, permission denied, file not found) is a **successful API interaction** describing an unsuccessful shell result — it returns `200 OK` with a response body indicating `success: false`, exactly the way a real terminal returns a non-zero exit code without the terminal itself crashing. HTTP error status codes (`4xx`/`5xx`) are reserved for problems with the *API request itself* — bad auth, malformed input, a sandbox that doesn't exist or isn't yours, a rate limit, a server fault. This distinction is applied consistently across every domain below, most visibly in the Terminal API (Section 9).

**Rate limiting:** Enforced per-user (and per-IP for unauthenticated endpoints) at the API Gateway (Architecture §4/§17). Rate-limited responses return `429 Too Many Requests` with a `Retry-After` header. AI Tutor endpoints have their own, separate, tier-based rate limit on top of the general one (Section 11).

**Idempotency:** State-mutating `POST` endpoints that are safe to retry (e.g., command execution, where a dropped response shouldn't risk double-applying a filesystem change) accept an optional `Idempotency-Key` header; a repeated request with the same key returns the original result rather than re-executing.

**Common status codes used throughout** (domain-specific exceptions called out per endpoint):
- `200 OK` — successful GET, or a successful action with a response body
- `201 Created` — successful resource creation
- `204 No Content` — successful action with no response body
- `400 Bad Request` — request validation failure
- `401 Unauthorized` — missing/invalid/expired auth token
- `403 Forbidden` — authenticated, but not permitted (wrong owner, insufficient role)
- `404 Not Found` — resource doesn't exist, or exists but isn't visible to this caller
- `409 Conflict` — a uniqueness/state conflict (e.g., certificate already issued)
- `429 Too Many Requests` — rate limit exceeded
- `500 Internal Server Error` — unexpected server fault
- `503 Service Unavailable` — a degraded-but-handled dependency failure (e.g., AI provider down)

---

## 1. Authentication API

Thin wrapper around the managed identity provider (Architecture §5) — our API never stores raw passwords.

### `POST /auth/signup`
**Purpose:** Create a new account.
**Auth:** No auth required.
**Request Body:**
| Field | Type | Required | Validation |
|---|---|---|---|
| email | string | Yes | Valid email format; must not already exist |
| password | string | Yes | Minimum length/complexity per provider policy |
| displayName | string | Yes | 1–50 characters |
| timezone | string | No | Valid IANA timezone; defaults to UTC if omitted |

**Success Response — `201 Created`:**
| Field | Type | Description |
|---|---|---|
| userId | string (UUID) | |
| accessToken | string | Short-lived JWT |
| refreshToken | string | Set as httpOnly cookie, not returned in body |

**Error Responses:** `400` (validation failure), `409` (email already registered)

### `POST /auth/login`
**Purpose:** Authenticate with email/password.
**Auth:** No auth required.
**Request Body:** `email`, `password` (both required)
**Success Response — `200 OK`:** `userId`, `accessToken` (refreshToken set as httpOnly cookie)
**Error Responses:** `400` (missing fields), `401` (invalid credentials)

### `POST /auth/refresh`
**Purpose:** Exchange a valid refresh token (cookie) for a new access token.
**Auth:** Requires valid refresh token cookie, not an access token.
**Request Body:** none
**Success Response — `200 OK`:** `accessToken`
**Error Responses:** `401` (refresh token invalid, expired, or revoked)

### `POST /auth/logout`
**Purpose:** Revoke the current session.
**Auth:** Required.
**Success Response — `204 No Content`**

### `POST /auth/logout-all`
**Purpose:** Revoke all sessions for the account (e.g., "log out everywhere").
**Auth:** Required.
**Success Response — `204 No Content`**

### `GET /auth/sso/{provider}/redirect`
**Purpose:** Initiate an SSO login flow.
**Auth:** No auth required.
**Path Parameters:** `provider` (enum: `google`) — additional providers added additively later
**Success Response:** `302 Found` redirect to the provider's consent screen

### `GET /auth/sso/{provider}/callback`
**Purpose:** Complete an SSO flow.
**Auth:** No auth required (validated via provider-issued state/code).
**Query Parameters:** `code`, `state` (provider-issued)
**Success Response — `200 OK`:** same shape as `/auth/login`
**Error Responses:** `400` (invalid/expired code or state mismatch — possible CSRF attempt)

### `POST /auth/password-reset/request`
**Purpose:** Trigger a password reset email.
**Auth:** No auth required.
**Request Body:** `email` (required)
**Success Response — `202 Accepted`** *(always returned regardless of whether the email exists, to avoid leaking account existence)*

### `POST /auth/password-reset/confirm`
**Purpose:** Complete a password reset.
**Request Body:** `resetToken` (required), `newPassword` (required, same complexity validation as signup)
**Success Response — `204 No Content`**
**Error Responses:** `400` (invalid/expired reset token, weak password)

### `GET /auth/sessions`
**Purpose:** List active sessions for the current account (maps to `user_sessions`).
**Auth:** Required.
**Success Response — `200 OK`:** array of `{ sessionId, deviceInfo, issuedAt, expiresAt, isCurrent }`

### `DELETE /auth/sessions/{sessionId}`
**Purpose:** Revoke a specific session (e.g., "log out this device").
**Auth:** Required. **Ownership check:** the session must belong to the caller.
**Success Response — `204 No Content`**
**Error Responses:** `403` (session belongs to another user), `404` (session not found)

---

## 2. Users API

### `GET /users/me`
**Purpose:** Get the current user's own profile.
**Auth:** Required.
**Success Response — `200 OK`:** `userId`, `email`, `displayName`, `role`, `timezone`, `accountStatus`, `createdAt`

### `PATCH /users/me`
**Purpose:** Update mutable profile fields.
**Auth:** Required.
**Request Body:**
| Field | Type | Required | Validation |
|---|---|---|---|
| displayName | string | No | 1–50 characters |
| timezone | string | No | Valid IANA timezone |

**Success Response — `200 OK`:** updated profile object
**Error Responses:** `400` (validation)

### `DELETE /users/me`
**Purpose:** Request account deletion (soft delete, per Database Design §2 — `deleted_at`).
**Auth:** Required.
**Success Response — `202 Accepted`** *(deletion processed asynchronously, respecting any grace-period policy)*

### `GET /users/{userId}/public-profile`
**Purpose:** Fetch the limited public-facing profile shown on leaderboards/certificates (never exposes email or account status).
**Auth:** Required (any authenticated user may view another's public profile).
**Success Response — `200 OK`:** `displayName`, `level`, `badgeCount`, `joinedMonth` *(coarse join date, not exact — a small privacy-preserving default)*
**Error Responses:** `404` (user not found or deleted)

---

## 3. Settings API

### `GET /settings`
**Purpose:** Get the current user's settings.
**Auth:** Required.
**Success Response — `200 OK`:** `experienceMode`, `animationSpeed`, `reducedMotion`, `notificationOptIn`, `preferredLanguage`

### `PATCH /settings`
**Purpose:** Update one or more settings.
**Auth:** Required.
**Request Body:** any subset of the fields above
| Field | Type | Validation |
|---|---|---|
| experienceMode | enum(beginner, advanced) | must be one of the enum values |
| animationSpeed | enum(slow, normal, fast) | |
| reducedMotion | boolean | |
| notificationOptIn | boolean | |
| preferredLanguage | string | must be a supported language code (currently only `en` in MVP) |

**Success Response — `200 OK`:** the full updated settings object
**Error Responses:** `400` (invalid enum value or unsupported language)

---

## 4. Lessons (Curriculum) API

### `GET /tracks`
**Purpose:** List all published tracks.
**Auth:** Required.
**Query Parameters:** `cursor`, `limit` (default 20, max 50)
**Success Response — `200 OK`:** array of `{ trackId, slug, title, description, orderIndex, lessonCount }`, plus `nextCursor`

### `GET /tracks/{trackId}`
**Purpose:** Track detail including its ordered lesson list.
**Auth:** Required.
**Success Response — `200 OK`:** track fields + array of `{ lessonId, slug, title, orderIndex, difficulty, estimatedMinutes }`
**Error Responses:** `404` (track not found or not published)

### `GET /lessons/{lessonId}`
**Purpose:** Lesson detail — metadata and step overview (step *titles*, not full content, so a user can see progress structure without spoiling upcoming steps).
**Auth:** Required.
**Success Response — `200 OK`:** `lessonId`, `title`, `difficulty`, array of `{ stepId, stepType, orderIndex }`
**Error Responses:** `404`

### `GET /lessons/{lessonId}/steps/{stepId}`
**Purpose:** Full content for a specific step — only returned if the preceding step in sequence is already completed (or this is the user's `current_step_id`), preventing content-skipping via direct URL access.
**Auth:** Required.
**Success Response — `200 OK`:** `stepType`, `content` (shape varies by `stepType`, per Database Design §3), `maxHintLevel`
**Error Responses:** `403` (step not yet unlocked for this user), `404`

### `POST /lessons/{lessonId}/steps/{stepId}/hint`
**Purpose:** Request the next escalating hint (PRD's hint-escalation requirement).
**Auth:** Required.
**Success Response — `200 OK`:** `hintLevel` (new level), `hintText`
**Error Responses:** `409` (already at `maxHintLevel`)

### `POST /lessons/{lessonId}/steps/{stepId}/quiz-answer`
**Purpose:** Submit an answer to a quiz step.
**Auth:** Required.
**Request Body:**
| Field | Type | Required | Validation |
|---|---|---|---|
| answer | string or array | Yes | Shape depends on `question_type` (choice ID, free text, or command string) |

**Success Response — `200 OK`:** `correct` (boolean), `explanation` (string), `stepStatus` (enum: in_progress, completed)
**Error Responses:** `400` (malformed answer shape for this question type), `404`

*Note: a wrong quiz answer is not an HTTP error — same status-code philosophy as command execution (Section 0). The response body communicates the outcome.*

### `POST /lessons/{lessonId}/complete`
**Purpose:** Explicit transition marking a lesson complete once its final step is done — a deliberate, atomic trigger point for awarding XP and updating `user_lesson_progress`, rather than inferring completion implicitly.
**Auth:** Required.
**Success Response — `200 OK`:** `xpAwarded`, `newBadges` (array, possibly empty), `nextLessonId` (nullable if this was the track's last lesson)
**Error Responses:** `409` (final step not yet actually completed — prevents a client from calling this out of order)

---

## 5. Progress API

### `GET /progress/summary`
**Purpose:** Dashboard summary — the single call a dashboard screen needs.
**Auth:** Required.
**Success Response — `200 OK`:** `tracksCompleted`, `lessonsCompleted`, `totalXp`, `level`, `currentStreakDays`, `longestStreakDays`

### `GET /progress/tracks`
**Purpose:** Per-track progress status for all tracks the user has engaged with.
**Auth:** Required.
**Success Response — `200 OK`:** array of `{ trackId, status, startedAt, completedAt }`

### `GET /progress/tracks/{trackId}`
**Purpose:** Lesson-by-lesson progress detail within one track (drives the "next incomplete lesson recommended" UI from the PRD's Lesson Flow).
**Auth:** Required.
**Success Response — `200 OK`:** array of `{ lessonId, status, attemptsCount, completedAt }`
**Error Responses:** `404`

### `GET /progress/lessons/{lessonId}`
**Purpose:** Fine-grained state for a single lesson, including current step and hint level (useful for resuming a lesson mid-step exactly where left off).
**Auth:** Required.
**Success Response — `200 OK`:** `status`, `currentStepId`, `currentHintLevel`, `failedAttempts`
**Error Responses:** `404`

---

## 6. Achievements (Gamification) API

### `GET /achievements/badges`
**Purpose:** Full badge catalog (for a "browse all achievements" screen).
**Auth:** Required.
**Success Response — `200 OK`:** array of `{ badgeId, key, category, title, description, iconKey, earnedByMe }`

### `GET /achievements/me`
**Purpose:** The user's own gamification state and earned badges in one call.
**Auth:** Required.
**Success Response — `200 OK`:** `totalXp`, `level`, `currentStreakDays`, `longestStreakDays`, `streakFreezesAvailable`, `badges` (array of `{ badgeId, earnedAt }`)

### `GET /achievements/certificates`
**Purpose:** The user's own issued certificates.
**Auth:** Required.
**Success Response — `200 OK`:** array of `{ certificateId, trackId, issuedAt, verificationCode, pdfAssetUrl }`

### `GET /certificates/{verificationCode}`
**Purpose:** Public certificate verification page data — anyone with the link can confirm a certificate is genuine.
**Auth:** **No auth required.** Rate-limited by IP specifically to prevent enumeration scraping of verification codes.
**Success Response — `200 OK`:** `displayName`, `trackTitle`, `issuedAt` *(deliberately minimal fields — no email, no internal IDs)*
**Error Responses:** `404` (invalid code), `429`

### `GET /leaderboard`
**Purpose:** Current leaderboard standings (backed by the Redis ZSET per Architecture §14, not a live DB query).
**Auth:** Required.
**Query Parameters:** `period` (enum: `weekly`, `all_time`; default `weekly`), `limit` (default 50, max 100)
**Success Response — `200 OK`:** array of `{ rank, userId, displayName, xp }`

### `GET /leaderboard/me`
**Purpose:** The current user's own rank, even if outside the top-N returned by the main leaderboard call.
**Auth:** Required.
**Success Response — `200 OK`:** `rank`, `xp`, `period`

---

## 7. Commands (Registry) API

Read-heavy, low-write reference data (Database Design §4) — cached aggressively at the gateway layer.

### `GET /commands`
**Purpose:** Full command reference list (powers a "browse all commands" help screen).
**Auth:** Required.
**Query Parameters:** `category` (optional filter), `difficulty` (optional filter)
**Success Response — `200 OK`:** array of `{ name, category, difficulty, shortDescription, iconKey }`

### `GET /commands/{name}`
**Purpose:** Full detail for a single command, including flags.
**Auth:** Required.
**Success Response — `200 OK`:** `name`, `longDescription`, `exampleUsage`, `animationType`, `flags` (array of `{ flag, description }`)
**Error Responses:** `404`

### `GET /commands/autocomplete`
**Purpose:** Powers the live-typing autocomplete dropdown (PRD FR-5).
**Auth:** Required.
**Query Parameters:** `prefix` (required, the partial text typed so far)
**Success Response — `200 OK`:** array (max 10) of `{ name, iconKey, shortDescription, exampleUsage, difficulty, category }`
**Validation:** `prefix` — 1–30 characters; empty prefix returns `400` rather than the full command list, to keep this endpoint's response always small and fast

---

## 8. Filesystem API

Deliberately **read-only** at the REST layer. There are no `PUT`/`DELETE` endpoints on filesystem nodes directly — every mutation must flow through command execution (Section 9), because that's the only path that produces a validated diff, an animation event sequence, and a command-history record. A direct "edit this node" endpoint would let a client silently bypass the entire simulation/animation pipeline that is this product's core value.

### `GET /sandboxes/{sandboxId}/filesystem`
**Purpose:** Full tree snapshot, used to (re)render the visual filesystem panel, e.g., on page load.
**Auth:** Required. **Ownership check:** sandbox must belong to the caller.
**Success Response — `200 OK`:** array of nodes: `{ nodeId, parentId, nodeType, name, permissions, owner, hasContent, currentDirectory: boolean }` *(file `content` itself is intentionally excluded from this bulk response to keep it lightweight for large sandboxes — fetched per-node on demand below)*
**Error Responses:** `403` (not the sandbox owner), `404`

### `GET /sandboxes/{sandboxId}/filesystem/nodes/{nodeId}`
**Purpose:** Detail for a single node, including file content (e.g., a user clicking a file in the visual panel to preview it).
**Auth:** Required. **Ownership check** as above.
**Success Response — `200 OK`:** full node fields including `content` (for files) or `symlinkTargetId` (for symlinks)
**Error Responses:** `403`, `404`

---

## 9. Terminal (Command Execution) API

The single most important endpoint in the system.

### `POST /sandboxes/{sandboxId}/commands`
**Purpose:** Execute a command against the sandbox's filesystem state.
**Auth:** Required. **Ownership check:** sandbox must belong to the caller.
**Headers:** optional `Idempotency-Key` (Section 0)
**Request Body:**
| Field | Type | Required | Validation |
|---|---|---|---|
| rawInput | string | Yes | 1–1000 characters after trimming whitespace; empty string rejected at `400` rather than silently treated as a no-op, so the client can distinguish "nothing submitted" from "the empty command executed" |

**Success Response — `200 OK`** *(returned whether or not the command succeeded as a Linux command — see Section 0):*
| Field | Type | Description |
|---|---|---|
| success | boolean | Whether the command executed successfully as valid Linux behavior |
| outputText | string | Text to render in the terminal, formatted like real Linux output |
| errorType | string, nullable | e.g. `unrecognized_command`, `permission_denied`, `not_found` — null when `success: true` |
| suggestion | object, nullable | `{ suggestedCommand, description }` — populated for likely-typo unrecognized commands (PRD's "did you mean") |
| diff | object | `{ nodesCreated: [], nodesDeleted: [], nodesMoved: [], nodesModified: [] }` — empty arrays if nothing changed |
| animationEvents | array | Ordered list of `{ type, nodeId, metadata }` events, consumed by the frontend Animation Engine (Architecture §8) |
| lessonStepResult | object, nullable | Present only when the sandbox is lesson-scoped: `{ stepId, completed, currentHintLevel }` |
| commandHistoryId | string | Reference to the persisted `command_history` row |
| newCurrentDirectoryId | string, nullable | *Added in Milestone 4.* Set only when the command changed the current directory (a successful `cd`). Discovered as a real gap while building the frontend orchestrator: without this field, the client had no reliable way to know what directory a successful `cd` actually landed on. |

**Error Responses (true API-level failures, distinct from a "failed" Linux command):**
- `400` — `rawInput` missing, empty, or exceeds length limit
- `403` — sandbox belongs to another user
- `404` — sandbox does not exist
- `409` — a **confirmed-destructive command was submitted without the required confirmation flag** (see Validation below)
- `429` — command submission rate exceeded (protects against scripted/rapid-fire abuse independent of normal typing speed)

**Validation — destructive command confirmation:** For recognized destructive commands (`rm`, `rm -r`, `rmdir` on a non-empty directory) while the user's `experienceMode` is `beginner` (Database Design/Settings), the request body additionally requires a `confirmed: true` field; omitting it returns `409 Conflict` with the response body describing the consequence, which the frontend renders as the confirmation dialog (PRD FR-10.4) — the client then resubmits with `confirmed: true` once the user accepts.

### `GET /sandboxes/{sandboxId}/commands/history`
**Purpose:** Fetch command history — for reloading terminal scrollback on session resume, and as the data source for the AI tutor's context assembly.
**Auth:** Required. Ownership check as above.
**Query Parameters:** `cursor`, `limit` (default 50, max 200)
**Success Response — `200 OK`:** array of `{ commandHistoryId, rawInput, commandName, wasSuccessful, executedAt }`, plus `nextCursor`

---

## 10. Practice API

### `GET /practice/sandbox`
**Purpose:** Get the user's current Practice Mode sandbox state (creates it on first call if none exists yet — get-or-create semantics, since the Database Design enforces exactly one practice sandbox per user).
**Auth:** Required.
**Success Response — `200 OK`:** `sandboxId`, `createdAt`, `lastResetAt`
**Notes:** This endpoint is intentionally idempotent-on-creation — calling it repeatedly never creates duplicate sandboxes, enforced both by the database's partial unique constraint (Database Design §5) and by this endpoint's get-or-create logic.

### `POST /practice/sandbox/reset`
**Purpose:** Reset the practice sandbox to its default seeded state.
**Auth:** Required.
**Request Body:**
| Field | Type | Required | Validation |
|---|---|---|---|
| confirmed | boolean | Yes | Must be `true` — this is a destructive, irreversible action and requires explicit confirmation regardless of experience mode |

**Success Response — `200 OK`:** `sandboxId`, `resetAt`
**Error Responses:** `400` (missing/false `confirmed`)

---

## 11. AI Tutor API

### `POST /ai/conversations`
**Purpose:** Start a new AI tutor conversation.
**Auth:** Required.
**Request Body:** `lessonId` (optional — links the conversation to lesson context, if relevant)
**Success Response — `201 Created`:** `conversationId`, `startedAt`

### `GET /ai/conversations`
**Purpose:** List the user's own conversations.
**Auth:** Required.
**Query Parameters:** `cursor`, `limit`
**Success Response — `200 OK`:** array of `{ conversationId, lessonId, lastMessageAt }`, plus `nextCursor`

### `GET /ai/conversations/{conversationId}`
**Purpose:** Fetch a conversation with its full message history.
**Auth:** Required. Ownership check.
**Success Response — `200 OK`:** array of `{ messageId, role, content, createdAt }`
**Error Responses:** `403`, `404`

### `POST /ai/conversations/{conversationId}/messages`
**Purpose:** Send a message and receive the AI tutor's response.
**Auth:** Required. Ownership check.
**Request Body:** `content` (string, required, 1–2000 characters)
**Response type:** `text/event-stream` (Server-Sent Events, per Architecture §11) rather than a single JSON body, so the response streams token-by-token for perceived responsiveness.
**SSE Event Shape (described, not coded):**
| Event Field | Description |
|---|---|
| type | `token` (a partial chunk) or `done` (stream complete) |
| delta | The next text chunk, present on `token` events |
| messageId | Present on the final `done` event, referencing the persisted `ai_messages` row |

**Error Responses:** `403`, `404`, `429` (AI-specific rate limit exhausted — see below), `503` (LLM provider degraded; response body/event includes a fallback static-help suggestion per Architecture §11's graceful-degradation requirement, rather than simply erroring out silently)
**Validation:** during an active quiz step (tracked via the conversation's linked lesson context), the server-side guardrail (Architecture §11) restricts response style to guided/Socratic mode — this is enforced server-side and is not a client-controllable parameter, specifically so it can't be bypassed from the frontend.

### `POST /ai/explain-error`
**Purpose:** A convenience, one-tap "explain this error" action tied to the user's most recent command (PRD's contextual error-explanation requirement), without requiring the client to manually assemble conversation context.
**Auth:** Required.
**Request Body:** `commandHistoryId` (required — references the specific command execution to explain)
**Response type:** `text/event-stream`, same shape as above.
**Error Responses:** `404` (referenced command history not found or not owned by caller)

### `GET /ai/usage`
**Purpose:** Let the client show remaining AI tutor quota (relevant under a tiered/rate-limited model).
**Auth:** Required.
**Success Response — `200 OK`:** `tier`, `requestsUsedToday`, `requestsRemainingToday`, `resetsAt`

---

## 12. Admin API

**A necessary authorization note before the endpoints themselves:** these operations are performed by internal content/engineering staff, not by any customer-facing `role` (`learner`/`instructor`/`org_admin` — Database Design §2). Gating admin endpoints behind a customer-facing role would conflate "a customer who happens to run a classroom" with "an internal operator who can edit curriculum content platform-wide" — a common and risky authorization anti-pattern. Admin endpoints are instead gated by a separate internal authorization mechanism (e.g., a distinct `is_platform_admin` flag or a wholly separate internal-only auth realm), noted here as a requirement for whoever implements auth, not solved by the customer-facing role schema.

### `POST /admin/tracks`
**Purpose:** Create a new track (as `draft`).
**Auth:** Required, platform-admin only.
**Request Body:** `slug`, `title`, `description`, `orderIndex` (all required, same validation as Database Design §3)
**Success Response — `201 Created`:** full track object
**Error Responses:** `403` (not a platform admin), `409` (slug already exists)

### `PATCH /admin/tracks/{trackId}`
**Purpose:** Update track metadata or status (`draft` → `published` → `archived`).
**Auth:** Platform-admin only.
**Success Response — `200 OK`:** updated track object
**Error Responses:** `403`, `404`

### `POST /admin/lessons`
**Purpose:** Create a new lesson (with its steps) under a track.
**Auth:** Platform-admin only.
**Request Body:** `trackId`, `slug`, `title`, `orderIndex`, `difficulty`, `steps` (array of step definitions per Database Design §3)
**Success Response — `201 Created`:** full lesson object with step IDs
**Error Responses:** `400` (malformed step content for a given `stepType`), `403`, `404` (track not found)

### `PATCH /admin/lessons/{lessonId}`
**Purpose:** Edit an existing lesson's content — writes a **new draft version**, does not overwrite the currently published version live.
**Auth:** Platform-admin only.
**Success Response — `200 OK`:** updated lesson object, `version` incremented
**Error Responses:** `403`, `404`

### `POST /admin/lessons/{lessonId}/publish`
**Purpose:** Publish the current draft version live — writes a `lesson_content_history` snapshot row (Database Design §3) and bumps the cache-invalidation version key.
**Auth:** Platform-admin only.
**Success Response — `200 OK`:** `publishedVersion`, `publishedAt`
**Error Responses:** `403`, `404`, `409` (no pending draft changes to publish)

### `POST /admin/commands`
**Purpose:** Add a new command to the registry.
**Auth:** Platform-admin only.
**Request Body:** all `commands` table fields (Database Design §4) — `name`, `category`, `difficulty`, `shortDescription`, `longDescription`, `exampleUsage`, `iconKey`, `animationType`, `grammarSpec`, plus optional `flags` array
**Success Response — `201 Created`:** full command object
**Error Responses:** `400` (malformed `grammarSpec`), `403`, `409` (command name already exists)

### `PATCH /admin/commands/{name}`
**Purpose:** Update an existing command's metadata/behavior definition, or toggle `isActive`.
**Auth:** Platform-admin only.
**Success Response — `200 OK`:** updated command object
**Error Responses:** `403`, `404`

### `GET /admin/users`
**Purpose:** Search/list users for support and moderation purposes.
**Auth:** Platform-admin only.
**Query Parameters:** `emailSearch` (optional), `accountStatus` (optional filter), `cursor`, `limit`
**Success Response — `200 OK`:** array of `{ userId, email, displayName, accountStatus, createdAt }`, `nextCursor`

### `PATCH /admin/users/{userId}/status`
**Purpose:** Suspend or reactivate an account (moderation action).
**Auth:** Platform-admin only.
**Request Body:** `accountStatus` (enum: active, suspended)
**Success Response — `200 OK`:** updated status
**Error Responses:** `400` (invalid status value — `deleted` is not settable via this endpoint, only via the user's own deletion request), `403`, `404`

### `GET /admin/analytics/lessons`
**Purpose:** Per-lesson completion/drop-off analytics (PRD success metrics), sourced from the decoupled analytics pipeline (Architecture §13), not a live query against production tables.
**Auth:** Platform-admin only.
**Query Parameters:** `trackId` (optional filter), `dateFrom`, `dateTo`
**Success Response — `200 OK`:** array of `{ lessonId, startedCount, completedCount, completionRate, averageAttempts }`

### `GET /admin/analytics/ai-usage`
**Purpose:** Aggregate AI tutor usage/cost analytics.
**Auth:** Platform-admin only.
**Query Parameters:** `dateFrom`, `dateTo`
**Success Response — `200 OK`:** `totalRequests`, `cacheHitRate`, `totalTokensUsed`, `estimatedCost`

---

## 13. Cross-Domain Validation Rules Summary

Consolidated for quick reference — the specific rule appears once above at its owning endpoint, but these patterns recur across domains and are worth naming as consistent policies:

- **String length caps everywhere user text is accepted** (`rawInput` 1000 chars, AI message 2000 chars, display name 50 chars) — every free-text field has an explicit upper bound, both to prevent abuse (paste-bombing, oversized payloads) and because unbounded text fields are a recurring source of both performance and security issues.
- **Ownership checks precede existence checks in response semantics where it matters for privacy** — a sandbox belonging to another user returns `403`, not `404` with the same message a truly nonexistent resource would get, since consistently returning `404` for "not yours" would be a (minor, but real) information-leak-avoidance choice worth deciding explicitly either way. *This document chooses `403` for clarity to the legitimate caller during development; a stricter security posture choosing `404` uniformly is a valid alternative worth a deliberate decision, not an oversight.*
- **Destructive actions require an explicit `confirmed: true` field**, never inferred from context — applies to command execution (Section 9) and sandbox reset (Section 10) identically.
- **Enum fields are validated against the exact set defined in the Database Design document** — no silently-accepted "close enough" values.

---

## 14. Future API Extensions

Consistent with the "named, not premature" extension philosophy from the Architecture and Database documents:

- **Classroom API (Phase 2):** `POST /organizations`, `POST /cohorts`, `POST /cohorts/{id}/enrollments`, `POST /cohorts/{id}/assignments` — additive once the `organizations`/`cohorts` tables (Database Design §12) are built; no existing endpoint in this document needs to change shape to accommodate them.
- **Docker Sandbox API (Phase 3):** `POST /sandboxes/{sandboxId}/real-session` (start a real container session), `POST /sandboxes/{sandboxId}/real-session/commands` — deliberately a **separate endpoint family**, not an extension of Section 9's simulated command endpoint, mirroring the distinct trust boundary established in the Architecture Document (§12).
- **Localization:** response bodies for lesson content gain a `locale`-aware variant once `preferred_language` (already present in Settings, Section 3) is backed by more than `en` — implemented as content negotiation on existing endpoints rather than new ones.

---

*End of Document — Version 1.0*
