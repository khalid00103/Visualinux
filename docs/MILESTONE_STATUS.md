# Milestone Status

Tracks progress against `docs/ROADMAP.md`. Updated at the end of every milestone.

| # | Milestone | Status | Notes |
|---|---|---|---|
| 0 | Foundational Setup & Decision Lock-In | **Done** (code/tooling); manual cloud provisioning still pending | See detail below |
| 1 | Authentication & Account Foundation | **Done** | See detail below |
| 2 | Command Registry | **Done** | See detail below |
| 3 | Filesystem Simulation Engine (Backend) | **Done** | See detail below |
| 4 | Terminal & Filesystem Panel Integration | **Done** | See detail below |
| 5 | Animation Engine & Visual Polish | Not started | |
| 6 | Practice Mode | Not started | |
| 7 | Curriculum Content Model & Authoring | Not started | |
| 8 | Lesson Screen & Guided Learning Flow | Not started | |
| 9 | Gamification System | Not started | |
| 10 | AI Tutor Integration | Not started | |
| 11 | Dashboard/Profile/Achievements/Leaderboard | Not started | |
| 12 | Admin Panel | Not started | |
| 13 | Responsive/Mobile Hardening | Not started | |
| 14 | Accessibility Audit & Hardening | Not started | |
| 15 | Security Hardening & Load Testing | Not started | |
| 16 | Landing Page, Onboarding & GTM Readiness | Not started | |
| 17 | Beta Launch & Feedback Iteration | Not started | |
| 18 | Public Launch & Post-Launch Monitoring | Not started | |

## Milestone 0 — Detail

**Completed:**
- Monorepo scaffold (`apps/api`, `apps/web`, `packages/shared-types`, `packages/command-registry`, `infra/terraform`, `content/lessons`) per Architecture §20 / Component Hierarchy §11
- CI pipeline (`.github/workflows/ci.yml`) — lint, typecheck, build, test
- Shared TypeScript config, ESLint, Prettier
- `apps/api` — Fastify skeleton with a working `/health` endpoint
- `apps/web` — Vite + React + TypeScript skeleton, verified building
- `packages/shared-types` and `packages/command-registry` — empty, versioned, buildable placeholders
- All eight design documents copied into `docs/`
- Three open PRD decisions formally ratified in `docs/DECISIONS.md`
- `install`, `lint`, `typecheck`, `build`, and `test` all verified passing locally (see command output in the implementation log)

**Not completed (requires your action outside this environment):**
- Managed identity provider account creation
- Hosted PostgreSQL provisioning
- Hosted Redis provisioning
- Actual deployment to a real staging environment (no cloud credentials available here)

Milestone 0 will be marked **fully** done once the manual cloud steps above are complete
and a real staging deploy is verified reachable. Milestone 1 does not block on this — it
runs entirely against a local Postgres instance with `AUTH_PROVIDER_MODE=local`.

## Milestone 1 — Detail

**Backend — built and verified against a real local PostgreSQL instance:**
- `users`, `user_settings`, `user_sessions` tables implemented in Drizzle ORM, migrated
  against real Postgres, schema confirmed matching Database Design §2 exactly (columns,
  enums, indexes, FK cascade behavior all inspected directly via `psql`).
- `IdentityProvider` interface with two implementations: `Auth0IdentityProvider` (written
  against Auth0's real API contract, **not exercised — no network access to any identity
  provider from this environment**) and `LocalDevIdentityProvider` (fully real and tested,
  using Node's built-in `scrypt`, explicitly barred from production by `config/env.ts`).
- All 15 endpoints from API Design §1-2 implemented: signup, login, refresh, logout,
  logout-all, password-reset request/confirm, session list/revoke, get/update/delete
  profile, public profile.
- CORS configured (credentialed, restricted to the exact configured `WEB_ORIGIN` — never
  a wildcard, since that combination is invalid with credentials) — verified via real
  preflight and actual-request checks.
- **Fixed two real issues found during this milestone:** a wrong relative import path in
  the auth middleware, and a high-severity SQL-injection advisory in `drizzle-orm`
  (upgraded 0.36→0.45.2, which also required resolving an npm workspace hoisting issue
  that broke `drizzle-kit`'s dependency resolution).
- **Automated test suite: 20/20 passing** — unit tests for password hashing and JWT
  logic, plus a full integration suite (Fastify `inject()`) covering signup, duplicate
  rejection, validation failure, wrong password, authenticated/unauthenticated profile
  access, refresh, and logout-then-refresh-rejection — all against the real database.
- Manually verified end-to-end via real HTTP requests: multi-session listing, single-
  session revocation, logout-all, and soft-delete account.

**Frontend — built and verified:**
- Design System tokens ported to real CSS custom properties (`styles/tokens.css`).
- Four primitives built: `Button`, `TextInput`, `Card`, `ToggleSwitch`.
- `TopNav` (logged-in-no-data variant), `RouteGuard`, Zustand auth store, typed API
  client (`api/client.ts`, `authApi.ts`, `usersApi.ts`).
- `SignupPage`, `LoginPage`, `SettingsPage` (account fields only, per this milestone's
  explicit scope), `DashboardPage` (empty shell, per the roadmap's own Goal wording).
- Session bootstrap on load (attempts silent restore from the httpOnly refresh cookie).
- Full build, typecheck, and lint verified clean (16 files linted, 0 errors). Production
  build (`vite build`) verified to actually serve correctly (`vite preview` + curl).

**Honest boundary — not verified in this environment:**
- No real browser click-through test (no installable browser binary reachable from this
  sandbox's whitelisted network). The build artifact is confirmed to serve correctly;
  actual UI interaction (typing into forms, clicking buttons) has not been exercised by
  an automated browser. Recommend a manual pass in a real browser, or adding Playwright
  in a later milestone.
- `Auth0IdentityProvider` is correct-but-unexercised, per above — needs real integration
  testing once a real Auth0 tenant exists (`docs/SETUP.md`).

**Vulnerabilities documented and deliberately deferred (dev-tooling only, not production
runtime):** the `vite`/`vitest` dependency chain carries moderate/high/critical advisories
that only apply to dev-server and Vitest-UI-server features this project doesn't use and
never ships to production. Re-evaluate in Milestone 15 (Security Hardening).

## Milestone 2 — Detail

**Built and verified against the real local PostgreSQL instance:**
- `commands` and `command_flags` tables implemented in Drizzle, migrated against real
  Postgres, matching Database Design §4 — with one documented amendment (see below).
- `@visualinux/command-registry` populated with all 28 ratified MVP commands (18 Tier 1
  filesystem/permissions + 10 Tier 2 text/content processing), each with description,
  example, icon key, animation type, declarative grammar spec, and flags where relevant.
- Idempotent seed script (`db:seed-commands`) — upserts by name, safe to re-run after a
  registry data change.
- All 3 Commands API endpoints implemented and verified via real HTTP requests: list
  (with category/difficulty filtering), detail-by-name (including flags), and autocomplete
  (prefix matching, capped at 10, rejecting an empty prefix with 400 rather than returning
  everything).
- **Automated tests: 34/34 passing** (29 from Milestone 1 unaffected + 5 new registry
  integrity tests + 9 new Commands API integration tests). The registry integrity test
  specifically asserts the seeded command set exactly matches the ratified Tier 1/Tier 2
  list from `docs/DECISIONS.md` — a deliberate guard against future scope drift.

**Documented amendment to the Database Design document:** while populating real command
data, two gaps surfaced in the original `animation_type` enum — `cd` and `chown`/`chgrp`
had no distinct value from `move` and `permission_change` respectively, even though the
Design System's own animation table (§6.3) already described them as visually different.
Added `directory_change` and `ownership_change`; both the schema and
`docs/DATABASE_DESIGN.md` were updated together, not left to silently drift apart.

**Honest boundary:** shell operators (pipes, redirection, wildcards) are intentionally
NOT registry entries — per Architecture §7, they're a parser-level concern, which is
Milestone 3's scope, not this one's.

## Milestone 3 — Detail

**Built and verified against the real local PostgreSQL instance:**
- `filesystem_templates`, `filesystem_template_nodes`, `sandboxes`, `filesystem_nodes`,
  `command_history` tables implemented in Drizzle, migrated against real Postgres.
- The `practice_default` template seeded exactly matching the PRD's example home
  directory (home/Documents/notes.txt+resume.pdf, Downloads, Desktop, Pictures/photo.jpg,
  Videos, Music, projects/portfolio, projects/website) — verified directly via `psql`.
- A real, working command parser (quote handling, pipe splitting, trailing-redirect
  detection, wildcard expansion) and interpreter (registry-driven validation, pipeline
  stdin chaining, "did you mean" suggestions via Levenshtein distance).
- All 28 MVP commands fully implemented as pure, unit-tested handler functions.
- Terminal and Filesystem read APIs (API Design §8-9) implemented and verified via
  real HTTP requests, including the destructive-command confirmation flow (409 →
  confirmed retry → success) wired to the user's real `experienceMode`.
- **Automated tests: 130/130 passing** across the whole monorepo (78 new unit tests for
  the tree/parser/interpreter/handlers, 18 new realistic-sequence integration tests,
  5 command-registry tests, plus all 29 tests from Milestones 1-2 — nothing regressed).

**Real bugs found during end-to-end verification and fixed — documented here rather
than silently folded into the "it just works" narrative:**
1. Forgot the self-referencing foreign keys (`parent_id`, `symlink_target_id`) on both
   node tables entirely — caught before the migration was ever applied.
2. `nodesRepository.create()` always generated its own fresh id, silently discarding
   the pre-generated id the interpreter had already committed to for chained operations
   — this broke `mkdir -p a/b/c` (the second directory's parent reference pointed at an
   id that was never actually persisted). Fixed by threading the id through explicitly.
3. Command operations weren't wrapped in a database transaction — a mid-sequence
   failure (like bug #2, before it was fixed) left partial state behind. Now every
   command's operations apply inside a single `db.transaction()`.
4. Absolute path resolution didn't account for the root node's own name being part of
   the displayed path (root.name = "home", so `pwd` shows "/home") — `cd /home` failed
   outright. Fixed by treating a leading path segment matching the root's name as "stay
   at root," not "look up a child literally named that."
5. `ls` only supported a single argument, but wildcard expansion (`ls *.txt`) can
   legitimately produce several — both the grammar spec and the handler were extended
   to support multiple targets, matching real Unix `ls` behavior.
6. Grammar-spec argument-count validation didn't know piped stages receive stdin in
   place of a file argument, so `cat file | sort` failed validation before the handler
   ever ran. Fixed by relaxing `minArgs` by one specifically for non-first pipeline
   stages.
7. `head`/`tail` read the `-n` flag's count value out of the wrong argument position
   once a real end-to-end test exercised them with `-n` actually present; `grep`'s
   pattern/file argument order was reversed in the non-piped case. Both caught by the
   unit test suite itself, not manual testing — direct evidence the tests were worth
   writing before considering this milestone done.

**Documented amendments to the Database Design document** (all cross-referenced in
`docs/DATABASE_DESIGN.md`, not just here):
- Added `group_owner` to `filesystem_nodes`/`filesystem_template_nodes` — `chgrp` was
  MVP-scoped from the PRD but the original schema had no field for it to modify.
- Added `current_directory_id` to `sandboxes` — without it, `cd` had no way to persist
  across separate HTTP requests (each request reloads the tree fresh); every request
  would have silently reset to the root.
- Extended the `animation_type` enum with `directory_change` and `ownership_change`,
  matching distinctions the Design System's animation table already made.
- Documented (not fixed, deliberately) that `sandboxes.lesson_step_id`'s FK is deferred
  to Milestone 7, and that `root_node_id`/`filesystem_nodes.sandbox_id` is a genuine
  circular reference handled as an unenforced convenience pointer.

**Honest boundaries, stated plainly:**
- `nano` is a partial implementation — it creates/opens a file at the API level but has
  no interactive editing, since that needs a frontend editor overlay that doesn't exist
  until a later UI milestone. Labeled clearly in its own output, not silently stubbed.
- There is no public "create a sandbox" API endpoint yet — that's Milestone 6's Practice
  API. This milestone's verification used a clearly-labeled, temporary dev-only script
  (`src/filesystem/dev-create-sandbox.ts`) that calls the internal `sandboxService`
  directly. It is not part of the production route surface and should be removed once
  Milestone 6 ships the real endpoint.
- Load/performance testing (named in the roadmap's Milestone 3 testing plan) was not
  performed in this pass — flagged as outstanding, not silently skipped.

## Milestone 4 — Detail

**A sandbox environment reset happened mid-milestone.** The entire working directory
was wiped between turns. Everything up through Milestone 3 was safely recovered from
the `visualinux-milestone-3.zip` snapshot already saved to persistent storage; only
this milestone's not-yet-saved work (the simulation-engine extraction) was lost and
had to be redone from scratch. Lesson applied going forward: checkpoint zips are now
saved at meaningful sub-points within a milestone, not only at the very end.

**Structural prerequisite handled before any UI code was written:** the parser,
interpreter, tree, and all 28 command handlers were extracted from `apps/api` into a
new shared package, `@visualinux/simulation-engine`. This wasn't optional scope
creep — the frontend physically cannot import Node-only code from `apps/api`, and
without this extraction, true client-side optimistic simulation (this milestone's
core deliverable) would have been architecturally impossible. Both `apps/api` and
`apps/web` now depend on the same package; all 78 of Milestone 3's unit tests moved
with it and still pass unmodified.

**Built and verified:**
- `FilesystemPanel`, `TreeNode` (recursive, expand/collapse), `CurrentDirectoryMarker`
  (the one and only place `role-location` green is used, per the Design System).
- `TerminalPanel`, `PromptLine`, `CommandInput`, `AutocompleteDropdown`,
  `HistoryScrollback`, `DestructiveConfirmModal`.
- The Global Session Store (Zustand) and the `useCommandExecutionOrchestrator` hook —
  the optimistic-simulation + server-reconciliation pattern from Architecture §3.
- Full pipeline green: lint, typecheck, and build clean across all 6 workspaces.
  **140 automated tests passing** (47 api + 5 command-registry + 78 simulation-engine +
  10 new frontend tests), including tests that specifically exercise the reconciliation
  behavior the roadmap called out by name: optimistic apply happens synchronously
  before the network call resolves, and reconciliation correctly replaces the
  client-guessed node id with the server's real one even when they disagree.
- Real end-to-end HTTP verification of the exact flow the frontend depends on:
  signup → sandbox creation → tree fetch → command execution, confirming the new
  `newCurrentDirectoryId` field (see below) is populated correctly by the real server.

**A real API contract gap found and fixed while building the orchestrator:**
`CommandExecutionResponse` had no field telling the client what directory a successful
`cd` actually changed to. Added `newCurrentDirectoryId`, documented in
`docs/API_DESIGN.md` alongside the code, not just here.

**A real data-shape constraint, handled honestly rather than worked around:**
`FilesystemNodeSummary` (what `GET /filesystem` returns, and what the client mirror is
built from) has no `content` field — only `FilesystemNodeDetail` does. This means true
optimistic simulation is only possible for *structural* commands (create, delete, move,
copy, permission/ownership change, cd) — exactly the commands the Animation Engine
(Milestone 5) cares about most. Content-reading commands (`cat`, `grep`, `sort`, `head`,
`tail`, `uniq`, `wc`, `diff`, `nano`, plus `tree`/`find`/`stat`/`du`/`df`) skip optimistic
simulation entirely and go straight to the server — a deliberate, documented scope
boundary (`SERVER_ROUNDTRIP_ONLY` in `useCommandExecutionOrchestrator.ts`), not a bug.

**Reconciliation design, stated plainly:** rather than trying to detect whether the
optimistic guess "matched" the server's response, reconciliation always restores a
pre-optimistic snapshot and reapplies the server's diff fresh, every time — including
on success. This is deliberate: client- and server-generated node ids never match
anyway (each side calls `generateId()` independently), so *some* correction always
happens on every response, and always-correct-by-construction was chosen over a
cleverer approach that could have subtly diverged from truth.

**Honest boundary, stated plainly:** there is still no public "create sandbox" endpoint
(Milestone 6's job). Frontend verification added one more clearly-labeled, explicitly
temporary, non-production-gated endpoint (`POST /api/v1/dev/sandbox`, gated off when
`NODE_ENV=production`) and a matching temporary `DevTerminalPage` — both marked for
deletion once Milestone 6 ships the real Practice API. No real browser click-through
test was performed (same sandbox limitation as prior milestones); verification relied
on component/hook-level tests (Testing Library + jsdom) plus direct HTTP-level replay
of the exact calls the frontend makes.
