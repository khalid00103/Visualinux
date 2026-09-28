# Database Design Document

## VisuaLinux — Interactive Visual Linux Learning Platform

| Field | Value |
|---|---|
| Document Version | 1.0 (Draft) |
| Companion Documents | PRD v1.0, Architecture v1.0 |
| Author | Database Architect |
| Scope | Complete logical schema for MVP, with named extension points for future phases |
| Note | No SQL/DDL included by design — this is a logical/physical data model specification, translatable to any relational engine (Postgres, per the Architecture Document) |

---

## 0. Design Conventions

Stated once here rather than repeated 30 times below.

**Primary keys:** Every table uses a surrogate UUID primary key rather than an auto-incrementing integer. *Reasoning:* UUIDs are non-guessable (relevant for anything user-facing, like certificate IDs), don't leak row-count information, and — critically per the Architecture Document's future-partitioning plan — behave well as distributed/shardable identifiers if the database is ever partitioned by ID hash.

**UUID generation strategy — a refinement worth calling out explicitly:** Random UUIDs (v4) are fine for low-write reference tables (`users`, `tracks`, `commands`). But for the handful of genuinely high-write, append-only tables (`filesystem_nodes`, `command_history`, `xp_ledger`, `ai_messages`), random UUIDs cause poor index locality — every insert lands in a random position in the primary key's B-tree, causing write amplification at scale. Those specific tables use **time-ordered UUIDs (UUIDv7)** instead, which insert sequentially like a traditional auto-increment key while keeping all the benefits of UUIDs elsewhere. This is called out per-table below.

**Timestamps:** Every table includes `created_at`; mutable tables also include `updated_at`. Both stored as timezone-aware timestamps.

**Soft delete vs. hard delete:** Used selectively, not universally — soft delete (`deleted_at` nullable column) is applied only where a "recently deleted" state has real product value (e.g., `filesystem_nodes`, so a `rm` animation event and the AI tutor's recent-command context can reference what *used to* exist). Everywhere else, deletion is a hard delete, usually cascaded from a parent (e.g., deleting a `sandbox` hard-deletes its nodes) — adding soft-delete everywhere "just in case" creates permanent query complexity for no real benefit.

**JSONB usage philosophy:** JSONB columns are used only where content genuinely varies in shape by design (e.g., a lesson step's content differs meaningfully between an "explain" step and a "quiz" step) — not as a shortcut to avoid modeling structure. Anywhere a column has a fixed, known shape, it's a real typed column.

**Enum vs. reference table:** A field becomes a database `ENUM` (or check-constrained value set) when its possible values are small, fixed, and rarely change (e.g., `node_type: file/directory/symlink`). It becomes a full reference table when the values need their own rich metadata, are content-team-editable, or are expected to grow over time (e.g., `commands`, `badges`).

**Naming convention:** `snake_case` throughout, singular concept / plural table name (e.g., `users`, `lesson_steps`).

---

## 1. Domain Overview (Entity Relationship Map)

```
┌─────────────┐        ┌──────────────┐        ┌───────────────┐
│    users    │──1:1───│ user_settings│        │ user_sessions │
│             │──1:N───┼──────────────┼────────│               │
└──────┬──────┘        └──────────────┘        └───────────────┘
       │
       │ 1:N                              CURRICULUM DOMAIN
       │                          ┌─────────────────────────────────┐
       │                          │  tracks ──1:N── lessons ──1:N──  │
       │                          │  lesson_steps ──1:N── quiz_      │
       │                          │  questions ──1:N── quiz_choices  │
       │                          │  lessons ──1:N── lesson_content_ │
       │                          │  history                         │
       │                          └─────────────────────────────────┘
       │
       │ 1:N               PROGRESS DOMAIN
       ├──────────── user_track_progress
       ├──────────── user_lesson_progress
       ├──────────── user_lesson_step_progress
       │
       │ 1:N               FILESYSTEM / SANDBOX DOMAIN
       ├──────────── sandboxes ──1:N── filesystem_nodes (self-referencing tree)
       │                  │
       │                  └──N:1── filesystem_templates ──1:N── filesystem_template_nodes
       ├──────────── command_history
       │
       │              COMMAND REGISTRY DOMAIN (not user-scoped)
       │              commands ──1:N── command_flags
       │
       │ 1:N               AI TUTOR DOMAIN
       ├──────────── ai_conversations ──1:N── ai_messages ──1:1── ai_usage_logs
       │
       │ 1:1 / 1:N          GAMIFICATION DOMAIN
       ├──────────── user_gamification_summary
       ├──────────── xp_ledger
       ├──────────── user_badges ──N:1── badges
       ├──────────── certificates ──N:1── tracks
       └──────────── leaderboard_snapshots
```

---

## 2. Domain: Identity & Access

### `users`
**Purpose:** Canonical account record — the root entity nearly everything else hangs off.

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | UUID (v4) | No | Surrogate primary key |
| external_auth_id | VARCHAR | No | Reference ID from the managed identity provider (Architecture §5) |
| email | VARCHAR | No | Account email |
| display_name | VARCHAR | No | Shown in UI, leaderboard, certificates |
| role | ENUM(learner, instructor, org_admin) | No, default `learner` | `instructor`/`org_admin` reserved, unused until Phase 2 classroom features |
| account_status | ENUM(active, suspended, deleted) | No, default `active` | Supports moderation and soft account deactivation |
| timezone | VARCHAR (IANA tz name) | No, default `UTC` | Needed for local-day streak boundary calculation (PRD Edge Cases) |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |
| deleted_at | TIMESTAMP | Yes | Soft delete — account deletion is a compliance-sensitive action worth a grace window before hard purge |

**Primary Key:** `id`
**Foreign Keys:** None (root entity)
**Unique Constraints:** `email`; `external_auth_id`
**Indexes:** unique index on `email`; unique index on `external_auth_id`; index on `account_status` (admin/moderation queries)
**Notes:** Reserved future partitioning key if the platform ever shards by user — every other user-scoped table references `user_id`, making user-hash partitioning a coherent strategy later (Architecture §22).

### `user_settings`
**Purpose:** Mutable preferences, deliberately separated from `users` so the frequently-changed rows (theme, mode) don't churn the core identity record, which is read on nearly every request.

| Column | Type | Nullable | Description |
|---|---|---|---|
| user_id | UUID | No | |
| experience_mode | ENUM(beginner, advanced) | No, default `beginner` | PRD FR-13 |
| animation_speed | ENUM(slow, normal, fast) | No, default `normal` | |
| reduced_motion | BOOLEAN | No, default `false` | Accessibility (PRD §21) |
| notification_opt_in | BOOLEAN | No, default `true` | |
| preferred_language | VARCHAR | No, default `en` | Reserved for future localization |
| updated_at | TIMESTAMP | No | |

**Primary Key:** `user_id` (1:1 relationship with `users`; no separate surrogate key needed)
**Foreign Keys:** `user_id` → `users.id`, **ON DELETE CASCADE**
**Indexes:** none beyond the primary key — always accessed by `user_id` directly

### `user_sessions`
**Purpose:** Tracks active refresh-token sessions issued by our own API layer (distinct from the managed identity provider's own session state), enabling features like "log out other devices."

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | UUID | No | |
| user_id | UUID | No | |
| refresh_token_hash | VARCHAR | No | Hashed, never the raw token |
| device_info | VARCHAR | Yes | User agent / device label for the "active sessions" UI |
| issued_at | TIMESTAMP | No | |
| expires_at | TIMESTAMP | No | |
| revoked_at | TIMESTAMP | Yes | Set on logout / explicit revocation |

**Primary Key:** `id`
**Foreign Keys:** `user_id` → `users.id`, **ON DELETE CASCADE**
**Unique Constraints:** `refresh_token_hash`
**Indexes:** index on `user_id` (list sessions per user); index on `expires_at` (scheduled cleanup job purging expired rows)

---

## 3. Domain: Curriculum & Content

### `tracks`
**Purpose:** Top-level curriculum grouping (e.g., "Linux Fundamentals").

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | UUID | No | |
| slug | VARCHAR | No | URL-friendly identifier |
| title | VARCHAR | No | |
| description | TEXT | Yes | |
| order_index | INTEGER | No | Display order among tracks |
| status | ENUM(draft, published, archived) | No, default `draft` | |
| version | INTEGER | No, default `1` | Bumped on content republish, used as a cache-invalidation key (Architecture §14) |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

**Primary Key:** `id`
**Foreign Keys:** None
**Unique Constraints:** `slug`
**Indexes:** index on `status` (filter to published tracks — the hot read path); index on `order_index`

### `lessons`
**Purpose:** Individual lessons within a track, strictly sequential per PRD.

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | UUID | No | |
| track_id | UUID | No | |
| slug | VARCHAR | No | |
| title | VARCHAR | No | |
| order_index | INTEGER | No | Sequential position within the track |
| difficulty | ENUM(beginner, intermediate, advanced) | No | |
| estimated_minutes | INTEGER | Yes | |
| status | ENUM(draft, published, archived) | No, default `draft` | |
| version | INTEGER | No, default `1` | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

**Primary Key:** `id`
**Foreign Keys:** `track_id` → `tracks.id`, **ON DELETE CASCADE** (deleting a track is a curated-content operation, not a user-data operation — cascading is safe and expected)
**Unique Constraints:** `(track_id, order_index)` — no two lessons in the same track share a position; `(track_id, slug)`
**Indexes:** index on `track_id` (extremely common query — "load all lessons for this track"); index on `status`
**Notes:** Integer `order_index` requires renumbering on mid-sequence insertion, but at curriculum-authoring scale (dozens of lessons per track, edited by a small content team) this is a non-issue — fractional/lexicographic ordering would be solving a problem that doesn't exist here.

### `lesson_steps`
**Purpose:** The explain → demo → practice → quiz → complete steps within a lesson (PRD §15, Lesson Flow).

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | UUID | No | |
| lesson_id | UUID | No | |
| step_type | ENUM(explain, demo, practice, quiz, complete) | No | |
| order_index | INTEGER | No | |
| content | JSONB | No | Shape varies by `step_type` (explanation text, demo script reference, practice/quiz config) |
| success_predicate | JSONB | Yes | Declarative success condition for `practice` steps only (Architecture §9) |
| max_hint_level | INTEGER | No, default `3` | Number of escalating hints available |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

**Primary Key:** `id`
**Foreign Keys:** `lesson_id` → `lessons.id`, **ON DELETE CASCADE**
**Unique Constraints:** `(lesson_id, order_index)`
**Indexes:** index on `lesson_id`
**Notes:** `content` and `success_predicate` are JSONB deliberately — step types have genuinely different shapes, and a rigid column-per-type schema would produce a table full of nulls. Validated at the application layer against a per-`step_type` schema.

### `quiz_questions`
**Purpose:** Structured quiz content, kept separate from `lesson_steps.content` so questions can be individually queried/reused (e.g., a future shared question bank).

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | UUID | No | |
| lesson_step_id | UUID | No | |
| question_text | TEXT | No | |
| question_type | ENUM(multiple_choice, predict_output, fill_command) | No | |
| correct_answer | JSONB | No | Shape depends on `question_type` |
| order_index | INTEGER | No | |
| created_at | TIMESTAMP | No | |

**Primary Key:** `id`
**Foreign Keys:** `lesson_step_id` → `lesson_steps.id`, **ON DELETE CASCADE**
**Indexes:** index on `lesson_step_id`

### `quiz_choices`
**Purpose:** Answer options for `multiple_choice`-type questions.

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | UUID | No | |
| quiz_question_id | UUID | No | |
| choice_text | TEXT | No | |
| is_correct | BOOLEAN | No | |
| order_index | INTEGER | No | |

**Primary Key:** `id`
**Foreign Keys:** `quiz_question_id` → `quiz_questions.id`, **ON DELETE CASCADE**
**Indexes:** index on `quiz_question_id`
**Constraints:** application-enforced — every question must have at least one `is_correct = true` choice; not practical to express as a pure column-level DB constraint, validated on write.

### `lesson_content_history`
**Purpose:** Append-only version history of published lesson content, supporting rollback and future localization.

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | UUID (v7) | No | High write locality — see §0 |
| lesson_id | UUID | No | |
| version | INTEGER | No | |
| content_snapshot | JSONB | No | Full serialized lesson + steps at publish time |
| published_by | UUID | Yes | Reserved for future admin/content-team tooling |
| published_at | TIMESTAMP | No | |

**Primary Key:** `id`
**Foreign Keys:** `lesson_id` → `lessons.id`, **ON DELETE CASCADE**; `published_by` → `users.id`, **ON DELETE SET NULL**
**Indexes:** index on `(lesson_id, version)`
**Notes:** Never updated or deleted in normal operation — a translated snapshot in a future localization phase is naturally modeled as an additional row here (extended with a `locale` column) rather than a schema change.

---

## 4. Domain: Command & Animation Registry

### `commands`
**Purpose:** The data-driven command registry (Architecture §6) — every supported command's behavior and autocomplete metadata (PRD FR-5.2), read on nearly every keystroke and written only by the content/engineering team.

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | UUID | No | |
| name | VARCHAR | No | e.g. `mkdir` |
| category | VARCHAR | No | e.g. `filesystem`, `permissions`, `text_processing`, `shell_operator` |
| difficulty | ENUM(beginner, intermediate, advanced) | No | |
| short_description | VARCHAR | No | Shown in autocomplete dropdown |
| long_description | TEXT | Yes | |
| example_usage | VARCHAR | No | |
| icon_key | VARCHAR | No | Frontend icon asset reference |
| animation_type | ENUM(create, delete, move, copy, permission_change, ownership_change, symlink, directory_change, content_display, none) | No | Drives the Animation Engine (Architecture §8). *Amended in Milestone 2: `directory_change` (for `cd`) and `ownership_change` (for `chown`/`chgrp`) were added when real command data was populated — both are conceptually distinct from `move` and `permission_change` respectively per the Design System's animation table (§6.3), and conflating them would have made the Animation Engine's future implementation ambiguous.* |
| grammar_spec | JSONB | No | Declarative argument/flag grammar consumed by the shared parser (Architecture §7) |
| is_active | BOOLEAN | No, default `true` | Disable without deleting history/config |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

**Primary Key:** `id`
**Foreign Keys:** None
**Unique Constraints:** `name`
**Indexes:** index on `name` (primary parser lookup path); index on `category` (autocomplete filtering); index on `is_active`
**Notes:** Highest-read, lowest-write table in the schema (called on essentially every keystroke via autocomplete) — the canonical candidate for aggressive, version-keyed Redis caching described in Architecture §14.

### `command_flags`
**Purpose:** Normalized flag/option metadata per command (e.g., `mkdir -p`, `rm -r`), rather than burying flag descriptions inside `commands.grammar_spec`.

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | UUID | No | |
| command_id | UUID | No | |
| flag | VARCHAR | No | e.g. `-p` |
| description | VARCHAR | No | |
| changes_animation_behavior | BOOLEAN | No, default `false` | Flags like `-r` that alter the resulting animation |

**Primary Key:** `id`
**Foreign Keys:** `command_id` → `commands.id`, **ON DELETE CASCADE**
**Unique Constraints:** `(command_id, flag)`
**Indexes:** index on `command_id`

---

## 5. Domain: Filesystem & Sandboxes

### `filesystem_templates`
**Purpose:** Canonical seed filesystems (e.g., the default Practice Mode home directory, or a lesson's starting state) cloned into a live sandbox on creation or reset.

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | UUID | No | |
| key | VARCHAR | No | e.g. `practice_default`, `lesson_mkdir_intro` |
| description | VARCHAR | Yes | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |

**Primary Key:** `id`
**Foreign Keys:** None
**Unique Constraints:** `key`
**Indexes:** index on `key`

### `filesystem_template_nodes`
**Purpose:** The immutable tree nodes belonging to a template — structurally identical to live `filesystem_nodes`, but never tied to a user session; the "stamp" that gets copied.

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | UUID | No | |
| template_id | UUID | No | |
| parent_id | UUID | Yes | Self-referencing; null for the root node |
| node_type | ENUM(file, directory, symlink) | No | |
| name | VARCHAR | No | |
| permissions | VARCHAR | No | e.g. `rwxr-xr-x` |
| owner | VARCHAR | No, default `user` | |
| group_owner | VARCHAR | No, default `user` | Added alongside the same column on `filesystem_nodes` (Milestone 3 amendment) — template nodes must mirror the live node structure exactly, since cloning copies every field |
| content | TEXT | Yes | File contents only, size-capped |
| symlink_target_id | UUID | Yes | Only populated for `symlink` nodes |

**Primary Key:** `id`
**Foreign Keys:** `template_id` → `filesystem_templates.id`, **ON DELETE CASCADE**; `parent_id` → `filesystem_template_nodes.id` (self-referencing), **ON DELETE CASCADE**; `symlink_target_id` → `filesystem_template_nodes.id`, **ON DELETE SET NULL**
**Unique Constraints:** `(parent_id, name)` — no two sibling nodes share a name, mirroring real filesystem semantics
**Indexes:** composite index on `(template_id, parent_id)` — the core traversal query when cloning a template
**Constraints:** check constraint — `content` populated only when `node_type = file`

### `sandboxes`
**Purpose:** A live, user-owned filesystem instance — either the single open Practice Mode sandbox, or a lesson-step-scoped sandbox.

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | UUID | No | |
| user_id | UUID | No | |
| sandbox_type | ENUM(practice, lesson_step) | No | |
| lesson_step_id | UUID | Yes | Set only when `sandbox_type = lesson_step` |
| source_template_id | UUID | No | Enables the "Reset Sandbox" action |
| root_node_id | UUID | Yes | Pointer to the tree root; null until first node exists |
| current_directory_id | UUID | Yes | *Added in Milestone 3: the original draft had no way to persist where `cd` left the user between separate command-execution requests — each request would have silently reloaded from the root, making `cd` non-functional across requests. Defaults to `root_node_id` on creation/reset; updated on every successful `cd`.* |
| created_at | TIMESTAMP | No | |
| last_reset_at | TIMESTAMP | Yes | |
| updated_at | TIMESTAMP | No | |

**Primary Key:** `id`
**Foreign Keys:** `user_id` → `users.id`, **ON DELETE CASCADE**; `lesson_step_id` → `lesson_steps.id`, **ON DELETE SET NULL** *(deferred — see note)*; `source_template_id` → `filesystem_templates.id`, **ON DELETE RESTRICT** (a template actively backing live sandboxes should not be deletable out from under them); `root_node_id` → `filesystem_nodes.id`, **ON DELETE SET NULL** *(not enforced at the DB level — see note)*
**Unique Constraints:** partial unique index on `(user_id)` where `sandbox_type = 'practice'` — enforces exactly one open Practice sandbox per user; `(user_id, lesson_step_id)` unique for `lesson_step` sandboxes
**Indexes:** index on `user_id` (very common — "load this user's sandbox(es)")

**Milestone 3 implementation notes (two real, honestly-documented constraints):**
- `lesson_step_id`'s foreign key **cannot be created yet** — `lesson_steps` doesn't exist until Milestone 7. The column exists (nullable UUID, no FK constraint) so `lesson_step`-type sandboxes have somewhere to store the reference once that table exists; Milestone 7 adds the actual constraint via `ALTER TABLE`. Application code never sets this column to anything but `NULL` before then, since no lesson-scoped sandboxes are created until Milestone 8.
- `root_node_id` and `filesystem_nodes.sandbox_id` are a genuine circular reference (a sandbox points at its root node; every node, including the root, points back at its sandbox). Rather than fight Postgres's deferred-constraint machinery for a field that's purely a convenience pointer — the real source of truth for "what is this sandbox's tree" is `filesystem_nodes WHERE sandbox_id = X`, queryable without `root_node_id` at all — this column is kept as a **plain, unenforced UUID**, populated by application logic after the root node is created. This is a deliberate, documented trade-off, not an oversight.

### `filesystem_nodes`
**Purpose:** The live tree backing the Filesystem Engine — the single most performance-critical table in the schema, since every animated command touches it.

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | UUID (v7) | No | High write volume — insert locality matters (§0) |
| sandbox_id | UUID | No | |
| parent_id | UUID | Yes | Self-referencing; null for root |
| node_type | ENUM(file, directory, symlink) | No | |
| name | VARCHAR | No | |
| permissions | VARCHAR | No | |
| owner | VARCHAR | No, default `user` | |
| group_owner | VARCHAR | No, default `user` | *Added in Milestone 3: real Linux ownership is `user:group`, and `chgrp` (already scoped as an MVP command since PRD §13) had no field to actually modify without it — an oversight in the original draft, not a deliberate simplification.* |
| content | TEXT | Yes | Size-capped (e.g., 64KB) file content only |
| symlink_target_id | UUID | Yes | |
| created_at | TIMESTAMP | No | |
| updated_at | TIMESTAMP | No | |
| deleted_at | TIMESTAMP | Yes | Soft delete — supports `rm` animation replay and recent-command AI context |

**Primary Key:** `id`
**Foreign Keys:** `sandbox_id` → `sandboxes.id`, **ON DELETE CASCADE**; `parent_id` → `filesystem_nodes.id` (self-referencing), **ON DELETE CASCADE**; `symlink_target_id` → `filesystem_nodes.id`, **ON DELETE SET NULL**
**Unique Constraints:** `(sandbox_id, parent_id, name)` **WHERE `deleted_at IS NULL`** — no two *live* siblings share a name, while a deleted node's name can be reused by a later `mkdir`/`touch`
**Indexes:** composite index on `(sandbox_id, parent_id)` — the core traversal query, hit on nearly every command; composite index on `(sandbox_id, deleted_at)` — efficiently excludes soft-deleted nodes from tree reads
**Constraints:** check constraint — `content` populated only when `node_type = file`
**Notes:** The primary candidate for future partitioning (by `sandbox_id` or `user_id` hash) once cumulative row count justifies it — every actively-practicing user continuously generates rows here, making this the highest-cumulative-growth table in the system (Architecture §22, item 5).

### `command_history`
**Purpose:** Log of every command executed per sandbox — feeds AI tutor context assembly and product analytics (drop-off points, error frequency).

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | UUID (v7) | No | High write volume |
| sandbox_id | UUID | No | |
| user_id | UUID | No | Denormalized from `sandboxes.user_id` — deliberate redundancy to avoid a join on the hot per-user query path |
| raw_input | VARCHAR | No | Exact string the user typed |
| command_name | VARCHAR | Yes | Parsed command name; null if unrecognized |
| was_successful | BOOLEAN | No | |
| error_type | VARCHAR | Yes | e.g. `permission_denied`, `not_found`, `unrecognized_command` |
| diff_snapshot | JSONB | Yes | The structured diff produced (Architecture §6), retained for replay/debugging and AI context |
| executed_at | TIMESTAMP | No | |

**Primary Key:** `id`
**Foreign Keys:** `sandbox_id` → `sandboxes.id`, **ON DELETE CASCADE**; `user_id` → `users.id`, **ON DELETE CASCADE**
**Indexes:** composite index on `(sandbox_id, executed_at)` — recent history for a sandbox (AI context, terminal reload); composite index on `(user_id, executed_at)` — per-user analytics; index on `error_type` — aggregate analytics on common failure patterns
**Notes:** Alongside `filesystem_nodes`, the other primary candidate for **time-based partitioning** (by `executed_at` month) and periodic cold-storage archival — rows older than the AI context window's useful lifetime (e.g., 90 days) have no live-query purpose and should migrate to the analytics warehouse rather than bloat the hot transactional table indefinitely (Architecture §13).

---

## 6. Domain: Learning Progress

### `user_track_progress`
**Purpose:** Coarse-grained per-user, per-track status.

| Column | Type | Nullable | Description |
|---|---|---|---|
| user_id | UUID | No | |
| track_id | UUID | No | |
| status | ENUM(not_started, in_progress, completed) | No, default `not_started` | |
| started_at | TIMESTAMP | Yes | |
| completed_at | TIMESTAMP | Yes | |
| updated_at | TIMESTAMP | No | |

**Primary Key:** composite `(user_id, track_id)` — this row's identity *is* the user–track pairing; no independent surrogate key needed
**Foreign Keys:** `user_id` → `users.id`, **ON DELETE CASCADE**; `track_id` → `tracks.id`, **ON DELETE CASCADE**
**Indexes:** index on `user_id` (dashboard: all tracks for a user); composite index on `(track_id, status)` (content-team analytics: completion rate per track)

### `user_lesson_progress`
**Purpose:** Per-user, per-lesson state — the core progress-tracking requirement (PRD FR-3.4, FR-12.1).

| Column | Type | Nullable | Description |
|---|---|---|---|
| user_id | UUID | No | |
| lesson_id | UUID | No | |
| current_step_id | UUID | Yes | |
| status | ENUM(not_started, in_progress, completed) | No, default `not_started` | |
| attempts_count | INTEGER | No, default `0` | |
| started_at | TIMESTAMP | Yes | |
| completed_at | TIMESTAMP | Yes | |
| updated_at | TIMESTAMP | No | |

**Primary Key:** composite `(user_id, lesson_id)`
**Foreign Keys:** `user_id` → `users.id`, **ON DELETE CASCADE**; `lesson_id` → `lessons.id`, **ON DELETE CASCADE**; `current_step_id` → `lesson_steps.id`, **ON DELETE SET NULL**
**Indexes:** index on `user_id` — the "resume where I left off" query, hit on nearly every dashboard load; composite index on `(lesson_id, status)` — directly serves the PRD success metric "lesson completion rate per lesson"

### `user_lesson_step_progress`
**Purpose:** Fine-grained per-step state — specifically needed to track hint escalation level (PRD requirement) independent of the coarser lesson-level row.

| Column | Type | Nullable | Description |
|---|---|---|---|
| user_id | UUID | No | |
| lesson_step_id | UUID | No | |
| status | ENUM(not_started, in_progress, completed) | No, default `not_started` | |
| current_hint_level | INTEGER | No, default `0` | |
| failed_attempts | INTEGER | No, default `0` | |
| completed_at | TIMESTAMP | Yes | |
| updated_at | TIMESTAMP | No | |

**Primary Key:** composite `(user_id, lesson_step_id)`
**Foreign Keys:** `user_id` → `users.id`, **ON DELETE CASCADE**; `lesson_step_id` → `lesson_steps.id`, **ON DELETE CASCADE**
**Indexes:** index on `user_id`

---

## 7. Domain: AI Tutor

### `ai_conversations`
**Purpose:** Groups AI tutor messages into a session/thread (Architecture §11).

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | UUID | No | |
| user_id | UUID | No | |
| lesson_id | UUID | Yes | Populated if the conversation occurred during a lesson |
| started_at | TIMESTAMP | No | |
| last_message_at | TIMESTAMP | No | |

**Primary Key:** `id`
**Foreign Keys:** `user_id` → `users.id`, **ON DELETE CASCADE**; `lesson_id` → `lessons.id`, **ON DELETE SET NULL**
**Indexes:** composite index on `(user_id, last_message_at)` — loading a user's recent conversations

### `ai_messages`
**Purpose:** Individual turns within a conversation.

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | UUID (v7) | No | High write volume |
| conversation_id | UUID | No | |
| role | ENUM(user, assistant) | No | |
| content | TEXT | No | |
| context_snapshot | JSONB | Yes | The assembled context sent with this request (recent commands, FS summary, lesson step) — retained for quality review/debugging |
| created_at | TIMESTAMP | No | |

**Primary Key:** `id`
**Foreign Keys:** `conversation_id` → `ai_conversations.id`, **ON DELETE CASCADE**
**Indexes:** composite index on `(conversation_id, created_at)`
**Notes:** `context_snapshot` can grow large at scale; if storage cost becomes material, an optimization trigger is to move this column's content to object storage with only a reference stored inline — not a Day 1 concern.

### `ai_usage_logs`
**Purpose:** Durable, queryable AI usage record for billing/analytics — distinct from the real-time Redis rate-limit counters (Architecture §11), which are ephemeral by design and not meant for historical querying.

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | UUID | No | |
| user_id | UUID | No | |
| message_id | UUID | No | |
| tokens_used | INTEGER | Yes | |
| was_cache_hit | BOOLEAN | No, default `false` | Served from the semantic cache instead of a live LLM call |
| created_at | TIMESTAMP | No | |

**Primary Key:** `id`
**Foreign Keys:** `user_id` → `users.id`, **ON DELETE CASCADE**; `message_id` → `ai_messages.id`, **ON DELETE CASCADE**
**Indexes:** composite index on `(user_id, created_at)` — per-user usage queries (support inquiries, tier reconciliation); index on `created_at` — feeds the async analytics pipeline (Architecture §13)

---

## 8. Domain: Gamification

### `user_gamification_summary`
**Purpose:** Fast-read, denormalized current-state view — the row read on every dashboard load. Kept separate from the ledger below so reads never require aggregating full event history.

| Column | Type | Nullable | Description |
|---|---|---|---|
| user_id | UUID | No | |
| total_xp | INTEGER | No, default `0` | |
| level | INTEGER | No, default `1` | |
| current_streak_days | INTEGER | No, default `0` | |
| longest_streak_days | INTEGER | No, default `0` | |
| last_activity_date | DATE | Yes | User's *local* date, per timezone-aware streak logic (PRD Edge Cases) |
| streak_freezes_available | INTEGER | No, default `1` | |
| updated_at | TIMESTAMP | No | |

**Primary Key:** `user_id` (1:1 with `users`)
**Foreign Keys:** `user_id` → `users.id`, **ON DELETE CASCADE**
**Indexes:** none required beyond the primary key for per-user reads; an index on `total_xp` is only needed if this table ever serves as a fallback/rebuild source for the live Redis leaderboard (Architecture §14) — it is not the live serving path itself.

### `xp_ledger`
**Purpose:** Append-only source-of-truth event log of every XP-awarding action. The summary table above is a **derived cache** of this ledger, never the other way around — this is what makes "why does this user have this much XP" auditable rather than trusting a single mutable counter.

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | UUID (v7) | No | High write volume |
| user_id | UUID | No | |
| event_type | ENUM(lesson_completed, quiz_passed_first_attempt, daily_login, challenge_completed, streak_bonus) | No | |
| xp_awarded | INTEGER | No | |
| source_reference_id | UUID | Yes | e.g. the `lesson_id` that triggered this award |
| created_at | TIMESTAMP | No | |

**Primary Key:** `id`
**Foreign Keys:** `user_id` → `users.id`, **ON DELETE CASCADE**
**Indexes:** composite index on `(user_id, created_at)` — auditing/recomputing a user's XP history
**Constraints:** append-only by application convention (no update/delete code path exposed) rather than a hard DB mechanism
**Notes:** Grows without bound and is never read on the live-dashboard path (the summary table serves that). Strong candidate for the same time-based partitioning/cold-archival treatment as `command_history`.

### `badges`
**Purpose:** Catalog of all available badges (categories per Architecture §18: skill, streak, challenge).

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | UUID | No | |
| key | VARCHAR | No | e.g. `filesystem_fundamentals` |
| category | ENUM(skill, streak, challenge) | No | |
| title | VARCHAR | No | |
| description | VARCHAR | No | |
| icon_key | VARCHAR | No | |
| unlock_criteria | JSONB | No | Declarative condition evaluated by the Gamification Service's event consumer |

**Primary Key:** `id`
**Foreign Keys:** None
**Unique Constraints:** `key`
**Indexes:** index on `category`

### `user_badges`
**Purpose:** Earned badges — many-to-many between users and badges.

| Column | Type | Nullable | Description |
|---|---|---|---|
| user_id | UUID | No | |
| badge_id | UUID | No | |
| earned_at | TIMESTAMP | No | |

**Primary Key:** composite `(user_id, badge_id)` — a user earns a given badge at most once, so the composite key is both identity and constraint
**Foreign Keys:** `user_id` → `users.id`, **ON DELETE CASCADE**; `badge_id` → `badges.id`, **ON DELETE CASCADE**
**Indexes:** index on `user_id` (profile display); composite index on `(badge_id, earned_at)` (analytics: "how many users have earned this badge, and when")

### `certificates`
**Purpose:** Issued completion credentials (PRD FR-11.5) — explicitly a learning-completion credential, not a professional certification.

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | UUID | No | |
| user_id | UUID | No | |
| track_id | UUID | No | |
| verification_code | VARCHAR | No | Public, shareable verification slug |
| issued_at | TIMESTAMP | No | |
| pdf_asset_url | VARCHAR | No | Reference into object storage (Architecture §13) |

**Primary Key:** `id`
**Foreign Keys:** `user_id` → `users.id`, **ON DELETE CASCADE**; `track_id` → `tracks.id`, **ON DELETE RESTRICT** (a track with issued certificates must not be deletable without an explicit migration path — protects historical credentials from silently breaking)
**Unique Constraints:** `verification_code`; `(user_id, track_id)` — one certificate per user per track
**Indexes:** index on `verification_code` — the public certificate-verification page lookup path

### `leaderboard_snapshots`
**Purpose:** Periodic durable archive of leaderboard standings. The *live* leaderboard is Redis (Architecture §14) — this table exists purely for historical analytics and as a recovery source if the Redis ZSET ever needs to be rebuilt from scratch.

| Column | Type | Nullable | Description |
|---|---|---|---|
| id | UUID | No | |
| snapshot_period | VARCHAR | No | e.g. `2026-W29` |
| user_id | UUID | No | |
| rank | INTEGER | No | |
| xp_at_snapshot | INTEGER | No | |
| created_at | TIMESTAMP | No | |

**Primary Key:** `id`
**Foreign Keys:** `user_id` → `users.id`, **ON DELETE CASCADE**
**Indexes:** composite index on `(snapshot_period, rank)`
**Notes:** Written by a scheduled weekly job, not live user traffic — no special scaling concern in the near term.

---

## 9. Consolidated Indexing Strategy

A quick-reference table mapping each index to the actual query it exists to serve — every index below earns its place by a named, real access pattern, not "index everything just in case" (unnecessary indexes slow down writes for no benefit).

| Table | Index | Query It Serves |
|---|---|---|
| users | unique(email) | Login lookup |
| users | unique(external_auth_id) | Auth-provider callback lookup |
| user_sessions | (user_id) | "Active sessions" list |
| user_sessions | unique(refresh_token_hash) | Token validation |
| tracks | (status) | Published-track listing |
| lessons | (track_id) | "All lessons in this track" |
| lessons | unique(track_id, order_index) | Enforce ordering integrity |
| lesson_steps | (lesson_id) | Load a lesson's steps |
| commands | unique(name) | Parser lookup (hot path) |
| commands | (category) | Autocomplete filtering |
| filesystem_nodes | (sandbox_id, parent_id) | Tree traversal — the single most frequent query in the system |
| filesystem_nodes | (sandbox_id, deleted_at) | Exclude soft-deleted nodes from tree reads |
| filesystem_nodes | unique(sandbox_id, parent_id, name) WHERE deleted_at IS NULL | Prevent duplicate live sibling names |
| sandboxes | (user_id) | Load a user's sandbox(es) |
| command_history | (sandbox_id, executed_at) | AI context window, terminal history reload |
| command_history | (user_id, executed_at) | Per-user analytics |
| user_lesson_progress | (user_id) | "Resume where I left off" |
| user_lesson_progress | (lesson_id, status) | Per-lesson completion-rate analytics |
| ai_conversations | (user_id, last_message_at) | Recent conversations list |
| xp_ledger | (user_id, created_at) | XP history audit |
| user_badges | (badge_id, earned_at) | Badge-earn-rate analytics |
| certificates | unique(verification_code) | Public certificate verification page |
| leaderboard_snapshots | (snapshot_period, rank) | Historical leaderboard queries |

---

## 10. Consolidated Constraint Strategy

- **Referential integrity:** every foreign key has an explicit `ON DELETE` behavior chosen deliberately per relationship — `CASCADE` for genuinely dependent child data (a sandbox's nodes have no meaning without the sandbox), `SET NULL` for optional back-references that shouldn't force a delete (a lesson step referencing an admin user who published it), and `RESTRICT` where deleting the parent would silently corrupt something with external meaning (a track with issued certificates).
- **Uniqueness:** enforced at the database level everywhere a business rule requires it (one Practice sandbox per user, one certificate per user per track, no duplicate sibling filenames) rather than relying on application-layer checks alone, which are prone to race conditions under concurrent requests.
- **Check constraints:** used for simple, always-true invariants (file `content` only populated when `node_type = file`) — cheap correctness guarantees that don't belong in application code where they could be bypassed by a future code path.
- **Composite primary keys:** used specifically for pure association/state tables where the association *is* the entity's identity (`user_lesson_progress`, `user_badges`, etc.) — avoids a meaningless surrogate key and gets uniqueness enforcement for free.

---

## 11. Full Foreign Key Reference

| Child Table | Column | Parent Table | On Delete |
|---|---|---|---|
| user_settings | user_id | users | CASCADE |
| user_sessions | user_id | users | CASCADE |
| lessons | track_id | tracks | CASCADE |
| lesson_steps | lesson_id | lessons | CASCADE |
| quiz_questions | lesson_step_id | lesson_steps | CASCADE |
| quiz_choices | quiz_question_id | quiz_questions | CASCADE |
| lesson_content_history | lesson_id | lessons | CASCADE |
| lesson_content_history | published_by | users | SET NULL |
| command_flags | command_id | commands | CASCADE |
| filesystem_template_nodes | template_id | filesystem_templates | CASCADE |
| filesystem_template_nodes | parent_id | filesystem_template_nodes | CASCADE |
| filesystem_template_nodes | symlink_target_id | filesystem_template_nodes | SET NULL |
| sandboxes | user_id | users | CASCADE |
| sandboxes | lesson_step_id | lesson_steps | SET NULL |
| sandboxes | source_template_id | filesystem_templates | RESTRICT |
| sandboxes | root_node_id | filesystem_nodes | SET NULL |
| filesystem_nodes | sandbox_id | sandboxes | CASCADE |
| filesystem_nodes | parent_id | filesystem_nodes | CASCADE |
| filesystem_nodes | symlink_target_id | filesystem_nodes | SET NULL |
| command_history | sandbox_id | sandboxes | CASCADE |
| command_history | user_id | users | CASCADE |
| user_track_progress | user_id | users | CASCADE |
| user_track_progress | track_id | tracks | CASCADE |
| user_lesson_progress | user_id | users | CASCADE |
| user_lesson_progress | lesson_id | lessons | CASCADE |
| user_lesson_progress | current_step_id | lesson_steps | SET NULL |
| user_lesson_step_progress | user_id | users | CASCADE |
| user_lesson_step_progress | lesson_step_id | lesson_steps | CASCADE |
| ai_conversations | user_id | users | CASCADE |
| ai_conversations | lesson_id | lessons | SET NULL |
| ai_messages | conversation_id | ai_conversations | CASCADE |
| ai_usage_logs | user_id | users | CASCADE |
| ai_usage_logs | message_id | ai_messages | CASCADE |
| user_gamification_summary | user_id | users | CASCADE |
| xp_ledger | user_id | users | CASCADE |
| user_badges | user_id | users | CASCADE |
| user_badges | badge_id | badges | CASCADE |
| certificates | user_id | users | CASCADE |
| certificates | track_id | tracks | RESTRICT |
| leaderboard_snapshots | user_id | users | CASCADE |

---

## 12. Future Schema Extensions (Not Built Now — Named for Forward Compatibility)

Consistent with the Architecture Document's "named trigger" philosophy — these are not built in MVP, but are designed for here so nothing in the current schema accidentally blocks them later.

**Classroom / B2B (Phase 2, serves the future instructor persona):**
- `organizations` — a company/school/bootcamp account
- `cohorts` — a group of learners within an organization, tied to a date range
- `cohort_enrollments` — many-to-many between `users` and `cohorts`
- `instructor_assignments` — which lessons/tracks an instructor has assigned to a cohort, with due dates

*Why this is safe to defer:* the `role` field already reserved on `users` (§2) and the fact that all progress tables are keyed by `user_id` (not assuming a single flat user pool) means these tables can be added purely additively — no existing table needs to change shape to support them.

**Real Docker Sandbox audit (Phase 3):**
- `docker_sandbox_sessions` — records real sandbox container lifecycle (start/stop time, resource usage, user)
- `docker_sandbox_command_log` — audit log of every command executed inside a real sandbox, kept at a much stricter retention/access-control standard than `command_history`, per the distinct trust boundary established in Architecture §12.

**Localization (post-MVP):**
- Extend `lesson_content_history` with a `locale` column, or introduce a `lesson_translations` table — either approach is additive to the existing content-versioning model, not a redesign of it.

---

## 13. Partitioning & Archival Roadmap

Tied directly to the "named triggers" introduced in the Architecture Document (§22), applied specifically at the schema level:

| Table | Growth Pattern | Trigger | Planned Treatment |
|---|---|---|---|
| filesystem_nodes | Continuous, per active user | Row count or write-throughput threshold on single instance | Partition by `sandbox_id`/`user_id` hash |
| command_history | Continuous, high volume | Storage size or query latency degradation | Time-based partitioning by `executed_at` (monthly); archive rows older than ~90 days to the analytics warehouse |
| xp_ledger | Continuous, unbounded | Same as above | Same treatment as `command_history` |
| ai_messages / context_snapshot | Growing JSONB payload size | Storage cost becomes material | Move `context_snapshot` payloads to object storage, keep a reference column inline |

None of these are Day 1 implementations — they're documented now specifically so the *initial* schema (indexes, key types, column choices) doesn't make any of them harder to execute later than necessary.

---

*End of Document — Version 1.0*
