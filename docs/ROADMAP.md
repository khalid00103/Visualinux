# Development Roadmap

## VisuaLinux — Interactive Visual Linux Learning Platform

| Field | Value |
|---|---|
| Document Version | 1.0 (Draft) |
| Companion Documents | PRD, Architecture, Database Design, API Design, UI/UX Screen Design, Design System, Component Hierarchy (all v1.0) |
| Author | Technical Project Manager |
| Scope | Every milestone required to ship the MVP as scoped across all prior documents, in dependency order |

---

## 0. Roadmap Conventions

**Team-size assumption:** Estimates below assume a small cross-functional team typical of an early-stage startup — roughly 2 backend engineers, 2 frontend engineers, 1 full-stack/DevOps engineer, plus part-time design and content support. Estimates scale roughly inversely with team size, but the *order* and *dependencies* between milestones do not change regardless of team size — that's the part of this document that should hold up longest.

**On estimate precision:** Time estimates are relative planning sizes, not committed deadlines. They exist to sequence work and flag risk concentration (which milestones are likely to slip), not to be quoted externally as delivery dates.

**Difficulty scale:**
- **Low** — well-understood, low technical risk, largely CRUD/configuration work.
- **Medium** — real design decisions and integration work, but no unsolved technical risk.
- **High** — genuine technical novelty or multiple simultaneously moving parts, real risk of rework.
- **Very High** — not used anywhere in this MVP roadmap. *This is deliberate, not an oversight:* the one piece of this project with genuine "Very High" risk — real Docker sandbox execution — was explicitly scoped out of MVP back in the PRD, specifically so the MVP roadmap doesn't have to carry that risk. That's a concrete example of an early product-scoping decision paying off in schedule predictability.

**Dependency notation:** each milestone lists which prior milestone(s) must be *functionally complete* (not just started) before it can begin. Where two milestones can run in parallel on different tracks (e.g., an engineering track and a content-authoring track), that's called out explicitly.

**"No code" applies to this document** — it describes what gets built and in what order, not how.

---

## Milestone 0 — Foundational Setup & Decision Lock-In

**Goal:** Establish the repository, tooling, and environments, and formally ratify the three decisions that have been marked ASSUMED across every prior document (execution model, MVP command/shell scope, business model) — so every subsequent milestone builds on settled ground rather than a provisional one.

**Tasks:**
- Ratify or override the three ASSUMED decisions in writing; update the companion documents' Section 0 sign-off checklists accordingly.
- Scaffold the monorepo per the Architecture (§20) and Component Hierarchy (§11) folder structures.
- Set up CI pipeline (lint, type-check, test, build) and infrastructure-as-code skeleton (Architecture §15).
- Provision dev and staging environments; provision the managed identity provider account, Postgres instance, and Redis instance.
- Establish the `shared-types` and `command-registry` packages as empty, versioned packages ready for consumption.

**Dependencies:** None — first milestone.

**Expected Output:** An empty-but-running monorepo with a green CI pipeline, provisioned dev/staging environments, and a written, ratified decisions log.

**Testing:** CI pipeline executes successfully on a trivial commit; a minimal health-check endpoint deploys to staging and responds.

**Definition of Done:**
- [ ] All three open decisions ratified and documented
- [ ] Monorepo scaffold merged to the main branch
- [ ] CI pipeline green on a test commit
- [ ] Staging environment reachable with a working health-check endpoint

**Estimated Difficulty:** Low
**Estimated Time:** ~1 week

---

## Milestone 1 — Authentication & Account Foundation

**Goal:** A user can create an account, log in, log out, and land on an empty authenticated shell — the prerequisite for every subsequent user-scoped feature.

**Tasks:**
- Implement the `users`, `user_settings`, `user_sessions` tables (Database Design §2).
- Implement the Authentication and Users API endpoints (API Design §1–§2), integrated with the managed identity provider (Architecture §5).
- Build `SignupPage`, `LoginPage`, `RouteGuard` (Component Hierarchy §2).
- Build the initial shared primitive component library sufficient for these screens — `Button`, `TextInput`, `Card`, `ToggleSwitch` (Component Hierarchy §9) — expanded incrementally in later milestones as new screens need additional primitives, rather than built speculatively all at once now.
- Implement the basic `SettingsPage` shell (account fields only; experience-mode/animation settings arrive in Milestone 5).
- Implement `TopNav` in its logged-in-but-no-data state.

**Dependencies:** Milestone 0.

**Expected Output:** A deployed, demoable signup → login → empty dashboard shell flow.

**Testing:**
- Unit tests for auth service logic (token issuance, session validation).
- Integration tests covering signup, login, logout, and session-refresh flows, including failure cases (duplicate email, wrong password, expired token).
- Manual QA: SSO flow, password-reset flow, "log out all devices."

**Definition of Done:**
- [ ] All Authentication and Users API endpoints implemented and passing integration tests
- [ ] Signup/Login/Logout functional end-to-end in staging
- [ ] Session refresh and multi-device logout verified manually
- [ ] Code reviewed and merged

**Estimated Difficulty:** Low–Medium (delegating to a managed identity provider, per the Architecture decision, is precisely what keeps this from being High)
**Estimated Time:** ~1.5–2 weeks

---

## Milestone 2 — Command Registry (Data-Driven Command System)

**Goal:** The command registry exists as real, queryable data — the foundation every later engine and UI component (autocomplete, parser, Filesystem Engine, Command Reference) reads from.

**Tasks:**
- Implement the `commands` and `command_flags` tables (Database Design §4).
- Implement the Commands API — `GET /commands`, `GET /commands/{name}`, `GET /commands/autocomplete` (API Design §7).
- Seed the registry with the full MVP command set (Tier 1 filesystem/permissions + Tier 2 text/content commands, per the ratified Milestone 0 decision), including each command's grammar specification, animation type, and flag metadata.
- Populate the `command-registry` shared package so the same command definitions are consumable by both the future backend parser (Milestone 3) and the frontend's optimistic simulation (Milestone 4).

**Dependencies:** Milestone 0. (Independent of Milestone 1 — can run in parallel with it.)

**Expected Output:** A fully seeded, queryable command registry, verifiable directly via the API (e.g., autocomplete returns correct, richly-detailed results for a given prefix).

**Testing:**
- Unit tests verifying registry seed data matches the PRD's Tier 1/Tier 2 command list exactly (no missing or extra commands).
- Integration tests for the autocomplete endpoint's prefix-matching and response shape.
- Contract test confirming the `shared-types` schema and the seeded data agree (catches drift early, before any consumer is built).

**Definition of Done:**
- [ ] All MVP-scope commands present in the registry with complete metadata
- [ ] Autocomplete endpoint returns correct results for representative prefixes
- [ ] `command-registry` package published and consumable by other packages

**Estimated Difficulty:** Low
**Estimated Time:** ~1 week

---

## Milestone 3 — Filesystem Simulation Engine (Backend)

**Goal:** The core, most technically novel piece of the entire system: a working, correct, server-authoritative filesystem simulation that can execute Tier 1/Tier 2 commands and produce accurate diffs — built and proven via API calls, before any UI depends on it.

**Tasks:**
- Implement `filesystem_templates`, `filesystem_template_nodes`, `sandboxes`, `filesystem_nodes`, `command_history` tables (Database Design §5).
- Build the command parser/tokenizer consuming the `command-registry` package's grammar specs (Architecture §7).
- Build the interpreter engine: validates parsed commands, mutates filesystem state, generates diffs and animation events (Architecture §6).
- Implement basic shell operators — piping, redirection, wildcards — for the MVP scope.
- Implement the Terminal (command execution) and Filesystem read API endpoints (API Design §8–§9).
- Seed the default "practice" filesystem template (PRD's example home directory).
- Implement the destructive-command confirmation flow at the API level (API Design §9 validation rules).

**Dependencies:** Milestone 2 (needs the command registry to interpret against).

**Expected Output:** A fully functional backend engine, verifiable via direct API calls (e.g., a scripted sequence of `POST /sandboxes/{id}/commands` calls against a fresh sandbox produces correct, inspectable state and diffs) — no UI yet.

**Testing:**
- Extensive unit tests per command, including flag variations and error paths (unrecognized command, permission denied, name collisions, symlink cycles — covering the Edge Cases catalogued in the PRD).
- Integration tests replaying realistic command sequences against a seeded template and asserting final state correctness.
- A basic load test on this engine specifically, since it's flagged in the Architecture Document as the most likely future bottleneck — establishing an early performance baseline is worth doing now, not after UI work masks it.

**Definition of Done:**
- [ ] Every MVP-scope command executes correctly, including documented flags
- [ ] All documented error paths (Section 21 of the PRD) produce correct, structured responses
- [ ] Diff and animation-event payloads verified against the Architecture's event schema
- [ ] Baseline performance numbers recorded for future comparison

**Estimated Difficulty:** High — the single most technically demanding backend milestone in the roadmap; correctness bugs here would surface confusingly in every later milestone, so this is where the extra testing investment pays off most.
**Estimated Time:** ~3–4 weeks

---

## Milestone 4 — Terminal & Filesystem Panel Integration (Frontend Core Loop)

**Goal:** The first genuinely demoable "wow" moment — a user types a real command and watches the filesystem panel react, end-to-end, through the real backend engine built in Milestone 3.

**Tasks:**
- Build `TerminalPanel`, `PromptLine`, `CommandInput`, `AutocompleteDropdown`, `HistoryScrollback` (Component Hierarchy §3).
- Build `FilesystemPanel`, `TreeNode`, `CurrentDirectoryMarker` — without full animation choreography yet (that's Milestone 5); nodes may simply appear/disappear at this stage.
- Build `CommandExecutionOrchestrator`, implementing the optimistic-simulation + server-reconciliation pattern (Architecture §3) — the trickiest piece of frontend logic in the whole project, so it gets its own explicit line item and review pass.
- Wire the Global Session Store (filesystem mirror, command history, pending events) per Component Hierarchy §0.
- Build `DestructiveConfirmModal`.

**Dependencies:** Milestone 3 (needs a working backend engine to integrate against). Runs after, not in parallel with, Milestone 3 — this is a case where sequencing (rather than parallelizing) is deliberate, since building the frontend against an unstable/incomplete backend engine would create rework in both directions.

**Expected Output:** A working, unstyled-but-functional Practice-like sandbox where a real user can type any MVP-scope command and see the tree update correctly.

**Testing:**
- End-to-end tests covering the full type-command → see-result loop for a representative sample of commands.
- Specific tests for the optimistic/reconciliation logic: simulate a network delay and verify the client corrects itself when the server response disagrees with the optimistic guess.
- Manual QA session focused specifically on "does this feel instant" — a subjective but important check on the core UX premise, done early while it's still cheap to adjust.

**Definition of Done:**
- [ ] A user can execute any MVP-scope command and see correct filesystem tree updates
- [ ] Optimistic/reconciliation behavior verified under simulated latency and simulated disagreement
- [ ] Destructive-command confirmation flow functions correctly in the UI

**Estimated Difficulty:** High
**Estimated Time:** ~2–3 weeks

---

## Milestone 5 — Animation Engine & Visual Polish of the Core Loop

**Goal:** Take the functionally-correct-but-plain core loop from Milestone 4 and implement the full animation and design-token system, turning it into the actual product experience described in the UI/UX and Design System documents.

**Tasks:**
- Implement the full per-action animation mapping (Design System §6.3) — create/delete/move/copy/permission-change/symlink treatments.
- Implement bulk-change staggering logic for multi-node diffs.
- Implement the reduced-motion equivalent path, driven from the same event stream (not a separately maintained variant).
- Apply the full Design System token set (colors, typography, spacing) to the Terminal and Filesystem panels, including the reserved-green current-directory marker rule.
- Build `ExplanationPanel` shell and `OutputConsole` (without lesson-specific content yet — that's Milestone 8).
- Implement `StepTracker` component (visual only at this stage; wired to real lesson data in Milestone 8).

**Dependencies:** Milestone 4.

**Expected Output:** The core loop now visually matches the flagship mockup — this is the milestone where the product first looks and feels like the final vision, not just functions like it.

**Testing:**
- Visual regression tests against the Design System's token specifications.
- Manual accessibility spot-check: reduced-motion toggle produces the correct instant-update behavior for every animation type.
- Manual QA against the specific animation table in the Design System document (§6.3), verifying each action's treatment matches spec.

**Definition of Done:**
- [ ] Every command's animation treatment matches the Design System specification
- [ ] Reduced-motion path verified for every animation type
- [ ] Reserved-green rule holds — no other UI state uses that color anywhere in the panels built so far

**Estimated Difficulty:** Medium
**Estimated Time:** ~2 weeks

---

## Milestone 6 — Practice Mode (Sandbox Lifecycle & Command Reference)

**Goal:** Ship the first complete, standalone user-facing feature: open-ended Practice Mode, fully usable without any lesson content existing yet.

**Tasks:**
- Implement sandbox get-or-create and reset endpoints/logic (API Design §10).
- Build `PracticePage`, `CommandReferenceDrawer`, `CommandSearchInput`, `CommandListItem`, `PinnedCommandCard`, `ResetSandboxButton` (Component Hierarchy §4).
- Wire the "focused command" entry pattern (arriving from a command reference click).

**Dependencies:** Milestones 2, 4, 5 (reuses the Filesystem/Terminal engine and its visual polish directly, per the "one engine, two contexts" principle).

**Expected Output:** A fully shippable Practice Mode — arguably an internally-releasable MVP-of-the-MVP at this point, since it's the first feature a real user could use start-to-finish.

**Testing:**
- Integration tests for get-or-create idempotency (repeated calls never create duplicate sandboxes, per the Database Design's partial unique constraint).
- End-to-end test of the full reset flow, including the confirmation step.
- Manual QA: search/filter behavior in the Command Reference Drawer across all categories.

**Definition of Done:**
- [ ] Practice sandbox creation, use, and reset all function correctly end-to-end
- [ ] Command Reference Drawer search/filter verified against the full MVP command set
- [ ] No duplicate-sandbox bugs under repeated/rapid entry

**Estimated Difficulty:** Medium
**Estimated Time:** ~1.5 weeks

---

## Milestone 7 — Curriculum Content Model & Seed Authoring Pipeline

**Goal:** Stand up the content schema and a lightweight authoring workflow, so the content-writing track can begin producing real lesson content in parallel with the engineering track's remaining milestones — this is the milestone most worth parallelizing.

**Tasks:**
- Implement `tracks`, `lessons`, `lesson_steps`, `quiz_questions`, `quiz_choices`, `lesson_content_history` tables (Database Design §3).
- Implement the Lessons/Curriculum read API endpoints (API Design §4).
- Establish the content-versioning pipeline (structured content files → ingested rows), even ahead of the full Admin editor UI (Milestone 12) — content authors can work from structured fixture files or a minimal internal tool in the interim, so they are not blocked waiting for polished admin tooling.
- Author and publish the first several lessons of the Linux Fundamentals track (enough to validate the Lesson Screen build in Milestone 8, and to have a real content backlog for the AI Tutor's lesson-context testing later).

**Dependencies:** Milestone 0 (schema/API work) can begin immediately; is independent of Milestones 1–6 and should run in parallel with them once Milestone 0 is complete. Content authoring specifically benefits from Milestone 2 being done (so commands referenced in lessons are already real, seeded data).

**Expected Output:** A working curriculum data layer with a real, published set of early lessons, independently verifiable via the API before the Lesson Screen UI exists.

**Testing:**
- Schema validation tests per `step_type` (explain/demo/practice/quiz/complete content shapes).
- Integration tests for the publish/versioning flow (draft → published, version increment, history snapshot).
- Content QA pass: every seeded lesson's success predicates and quiz answers manually verified against the actual Filesystem Engine behavior from Milestone 3.

**Definition of Done:**
- [ ] Curriculum schema and read API fully implemented
- [ ] At least the first 8–10 lessons authored, published, and content-QA'd
- [ ] Versioning/publish flow verified

**Estimated Difficulty:** Medium
**Estimated Time:** ~2 weeks (engineering); content authoring continues in parallel on an independent timeline

---

## Milestone 8 — Lesson Screen & Guided Learning Flow

**Goal:** The second major "wow" milestone — the full structured Lesson Flow (Explain → Demo → Practice → Quiz → Complete) working end-to-end against real content and the real engine.

**Tasks:**
- Build `LessonPage`, wiring `ExplanationPanel`, `StepTracker`, `HintButton`, `AskAIButton` (stubbed until Milestone 10) to real lesson data.
- Implement lesson-step success-predicate evaluation, hooked into `CommandExecutionOrchestrator`'s output (Component Hierarchy §3).
- Build `QuizModal`, `QuizQuestion`, `QuizChoice`, `QuizFeedback`.
- Build `CompletionModal`, `XPCounter` (visual only — real XP wiring arrives in Milestone 9), `BadgeRevealCard` (visual only).
- Implement hint escalation logic end-to-end.
- Implement `user_lesson_progress` and `user_lesson_step_progress` read/write logic (Database Design §6) and the corresponding Progress API endpoints (API Design §5).

**Dependencies:** Milestones 5, 6 (visual engine), 7 (real content to build against).

**Expected Output:** A learner can complete a full real lesson from start to finish, including a wrong quiz answer, a hint escalation, and a completion screen — the first milestone that demonstrates the complete core product thesis end-to-end.

**Testing:**
- End-to-end test walking a full lesson from Explain through Complete, including at least one deliberate wrong quiz answer and one hint request.
- Test that a lesson step accepts valid alternative command sequences, not just the "canonical" one (PRD FR-3.3) — an important correctness bar, not just a happy-path check.
- Manual QA: resuming a lesson mid-step after closing and reopening the app.

**Definition of Done:**
- [ ] Full lesson flow (all five step types) functions correctly against real content
- [ ] Hint escalation and quiz feedback verified
- [ ] Resume-where-left-off verified across a session break
- [ ] Success-predicate validation confirmed to accept valid alternative solutions, not just one scripted path

**Estimated Difficulty:** High — the most integration-heavy frontend milestone, tying together nearly every subsystem built so far.
**Estimated Time:** ~3 weeks

---

## Milestone 9 — Gamification System

**Goal:** XP, streaks, badges, certificates, and the leaderboard all become real, connecting to the lesson-completion events already flowing from Milestone 8.

**Tasks:**
- Implement `user_gamification_summary`, `xp_ledger`, `badges`, `user_badges`, `certificates`, `leaderboard_snapshots` tables (Database Design §8).
- Implement the event-driven Gamification Service, consuming lesson-completion events asynchronously (Architecture §4) rather than being called synchronously from the Learning Engine.
- Implement the Redis-backed leaderboard (sorted set) and the Achievements/Leaderboard API endpoints (API Design §6).
- Implement timezone-aware streak-day calculation (a specifically flagged PRD edge case) and streak-freeze logic.
- Implement certificate generation (PDF export to object storage) and the public verification endpoint.
- Wire real data into `XPCounter` and `BadgeRevealCard` from Milestone 8.

**Dependencies:** Milestone 8 (needs real lesson-completion events to react to).

**Expected Output:** Completing a lesson now visibly awards XP, updates streaks correctly across timezones, and can unlock a real badge; completing a full track issues a real, publicly verifiable certificate.

**Testing:**
- Unit tests for streak-boundary logic across timezone edge cases (midnight rollover, DST transitions).
- Integration tests confirming the event-driven path never blocks or slows lesson completion, even if the Gamification Service is artificially delayed (validating the Architecture's non-negotiable "gamification failures never block learning" requirement).
- Load test on the Redis leaderboard sorted-set operations at a simulated large user count.
- End-to-end test of certificate issuance and public verification-page lookup.

**Definition of Done:**
- [ ] XP, streaks, and badges all award correctly from real lesson-completion events
- [ ] Streak logic verified across timezone edge cases
- [ ] Gamification Service failure/delay confirmed not to affect core lesson flow
- [ ] Certificate issuance and public verification working end-to-end

**Estimated Difficulty:** Medium–High (the timezone/streak logic and the event-driven decoupling are the specific sources of real risk here, not the CRUD parts)
**Estimated Time:** ~2.5 weeks

---

## Milestone 10 — AI Tutor Integration

**Goal:** A genuinely context-aware AI Tutor, available from any screen, with the guardrails and cost controls specified in the Architecture Document.

**Tasks:**
- Implement `ai_conversations`, `ai_messages`, `ai_usage_logs` tables (Database Design §7).
- Build the AI Gateway Service: context assembly, LLM provider integration, SSE streaming (Architecture §11).
- Implement the semantic caching layer and per-tier rate limiting.
- Implement the server-side Socratic/guided-mode guardrail for active quiz contexts.
- Implement the graceful-degradation fallback path for provider downtime/rate-limit exhaustion.
- Build `AITutorLauncher`, `AITutorPanel`, `ConversationThread`, `MessageBubble`, `StreamingResponseIndicator`, `GuidedModeBadge`, `QuickActionChips` (Component Hierarchy §5).
- Wire the real `explain-error` quick action and the `AskAIButton` from Milestone 8.

**Dependencies:** Milestone 8 (needs real lesson/command-history context to assemble against); can begin backend work in parallel with the latter half of Milestone 9.

**Expected Output:** A learner can ask the AI Tutor a question from any screen and get a context-accurate, streamed answer; asking during an active quiz produces guided rather than direct answers.

**Testing:**
- Integration tests verifying context assembly actually includes the correct recent commands and lesson state for a given conversation.
- Manual QA specifically probing the quiz-guardrail — attempting to extract a direct answer during a quiz step and confirming the server-side guardrail holds regardless of phrasing.
- Load/cost testing on the semantic cache's hit rate against a representative set of common beginner questions.
- Fallback-path test: simulate provider downtime and verify the degraded static-help response, not a hard failure.

**Definition of Done:**
- [ ] AI Tutor responses verified to reflect real, current user context
- [ ] Quiz guardrail confirmed to hold under adversarial-phrasing manual testing
- [ ] Fallback behavior verified under simulated provider failure
- [ ] Rate limiting and semantic caching confirmed functional

**Estimated Difficulty:** High — the newest external dependency in the system, with real correctness (context accuracy), safety (guardrail), and cost (caching/rate-limiting) requirements simultaneously.
**Estimated Time:** ~3 weeks

---

## Milestone 11 — Dashboard, Profile, Achievements, Leaderboard Screens

**Goal:** Build the remaining primarily-aggregation screens — lower technical risk than prior milestones, since they mostly display data that already exists from Milestones 1, 8, and 9.

**Tasks:**
- Build `DashboardPage`, `ContinueCard`, `TrackProgressCard`, `QuickActionCard`, `StreakWidget`, `RecentBadgesStrip` (Component Hierarchy §6).
- Build `ProfilePage`, `ProfileHeader`, `StatsSummaryRow`, `BadgeShowcaseGrid`, `CertificateGallery` (Component Hierarchy §7), including the public/own-profile field-visibility distinction.
- Build `AchievementsPage`, `FilterTabs`, `BadgeCard` earned/locked states with unlock-criteria tooltips.
- Build `LeaderboardPage`, `PeriodToggle`, `PodiumTop3`, `LeaderboardRow`, `StickyUserRankBar`.

**Dependencies:** Milestones 1, 8, 9 (all the underlying data these screens display).

**Expected Output:** The full non-admin learner-facing screen set is now complete.

**Testing:**
- Integration tests confirming the public-profile endpoint never leaks fields beyond what the API contract specifies (email, account status excluded).
- Manual QA of the locked-badge tooltip content against the actual `unlock_criteria` data.
- Manual QA of the Leaderboard's sticky-rank-bar behavior at various simulated ranks (top 3, mid-list, far outside the visible top-N).

**Definition of Done:**
- [ ] All four screens functional against real data
- [ ] Public-profile field visibility verified correct
- [ ] Leaderboard behavior verified at multiple rank positions

**Estimated Difficulty:** Medium
**Estimated Time:** ~2 weeks

---

## Milestone 12 — Admin Panel (Content & User Management)

**Goal:** Replace the interim fixture-file content workflow from Milestone 7 with the full Admin Panel, and add user-management/analytics tooling for support and product operations.

**Tasks:**
- Build `AdminShell`, `AdminSidebarNav`, and the full route set (Component Hierarchy §2, §8).
- Build `DataTable` and apply it to Lessons/Commands/Users listings.
- Build `ContentEditorForm` with per-`step_type` structured fields (deliberately not a raw JSON editor, per the Design System's explicit UX decision).
- Build `PublishBar`, wiring the draft/publish version flow from Milestone 7's API.
- Implement the Admin API's user-management endpoints (search, suspend/reactivate) and analytics endpoints (API Design §12), backed by the decoupled analytics pipeline (Architecture §13).
- Build `AnalyticsChartCard` for lesson-completion and AI-usage dashboards.
- Implement the platform-admin authorization mechanism, explicitly separate from the customer-facing `role` field (per the API Design's authorization note).

**Dependencies:** Milestones 7, 9, 10 (needs real content, gamification, and AI-usage data to manage/analyze).

**Expected Output:** Content team can author and publish lessons without engineering involvement; support staff can search/moderate accounts; product can view real completion/usage analytics.

**Testing:**
- Integration tests confirming platform-admin authorization is genuinely independent of the customer-facing role system (a non-admin user, even an `org_admin` in the future sense, cannot reach these endpoints).
- Manual QA: a content author completes a full create-draft-edit-publish cycle for a new lesson using only the Admin UI, with no direct database access.
- Manual QA of the analytics charts against manually-computed expected values for a small, known test dataset.

**Definition of Done:**
- [ ] Full content lifecycle achievable through the Admin UI alone
- [ ] User search/suspend/reactivate functions verified
- [ ] Platform-admin authorization confirmed isolated from customer-facing roles
- [ ] Analytics charts verified against known test data

**Estimated Difficulty:** Medium
**Estimated Time:** ~2.5 weeks

---

## Milestone 13 — Responsive/Mobile Layout Hardening

**Goal:** A dedicated pass validating and refining every screen against the three breakpoints defined in the Design System, with particular attention to the mobile tabbed layout for the Lesson/Practice screens.

**Tasks:**
- Build `MobileBottomTabBar` and the tabbed single-panel mobile interaction pattern for Lesson/Practice screens, including the persistent current-directory chip (UI/UX §12).
- Audit and fix every other screen against tablet/mobile breakpoints.
- Verify the landing page's mobile hero/demo-widget degradation behavior.

**Dependencies:** Milestones 4–12 (everything that needs to be responsive must already exist).

**Expected Output:** The full application is usable and correctly laid out across desktop, tablet, and mobile.

**Testing:**
- Manual QA across a real device matrix (not just browser devtools emulation) for the mobile tabbed Lesson Screen specifically, since it's the highest-risk responsive surface in the product.
- Automated visual-regression snapshots at each breakpoint for every screen.

**Definition of Done:**
- [ ] Every screen verified functional and visually correct at all three breakpoints
- [ ] Mobile current-directory chip confirmed to persist correctly across tab switches
- [ ] No horizontal scroll or layout breakage on the smallest supported viewport

**Estimated Difficulty:** Medium
**Estimated Time:** ~1.5 weeks

---

## Milestone 14 — Accessibility Audit & Hardening

**Goal:** Systematically verify the WCAG 2.1 AA target stated in the PRD and Design System, rather than relying on accessibility having been "built in" correctly by assumption across 13 prior milestones.

**Tasks:**
- Full keyboard-only navigation pass across every screen.
- Screen reader testing of the Filesystem Panel's ARIA live-region announcements against real animation events.
- Contrast-ratio verification of every color-token pairing using an actual contrast-checking tool (closing the loop on the Design System's stated-but-unverified targets).
- Verify color-independence for every state that uses color coding (current directory, success/error, locked/earned badges).
- Verify reduced-motion behavior system-wide, including respecting the OS-level preference in addition to the in-app toggle.

**Dependencies:** Milestones 4–13 (everything that needs auditing must exist).

**Expected Output:** A documented accessibility audit with all identified issues either fixed or explicitly triaged with a follow-up plan.

**Testing:**
- Automated accessibility linting (contrast, ARIA attribute presence) as a CI check going forward, not just a one-time pass.
- Manual screen-reader walkthrough of at least one full lesson completion.
- Manual keyboard-only walkthrough of at least one full lesson completion and one Practice Mode session.

**Definition of Done:**
- [ ] All P0/P1 accessibility issues from the audit resolved
- [ ] Automated accessibility linting integrated into CI
- [ ] Screen-reader and keyboard-only walkthroughs both completed successfully

**Estimated Difficulty:** Medium
**Estimated Time:** ~1.5 weeks

---

## Milestone 15 — Security Hardening & Performance/Load Testing

**Goal:** Validate the security and scaling assumptions made throughout the Architecture Document under realistic adversarial and high-load conditions, before real users are exposed to them.

**Tasks:**
- Input-sanitization audit across every user-generated-content rendering point (filenames, file contents, AI messages).
- Rate-limiting verification at both the API Gateway and AI Gateway layers.
- Dependency vulnerability scan and remediation.
- Load test the Filesystem Simulation Engine and the command-execution endpoint specifically, since they're the named future-bottleneck candidates from the Architecture Document.
- Load test the Redis leaderboard and the AI semantic cache under simulated high concurrency.
- Verify circuit-breaker behavior around the LLM provider and SSO provider dependencies under simulated failure.

**Dependencies:** Milestones 1–14 (the full system must exist to be meaningfully tested under load).

**Expected Output:** A documented load-test report against defined performance targets, and a documented security review with all findings resolved or explicitly accepted/triaged.

**Testing:** *(This milestone is itself almost entirely testing — noted here as its own category since it's the deliverable, not a separate verification step.)*
- Automated load tests simulating realistic concurrent-user command-execution patterns.
- Manual penetration-style review of authentication, session handling, and input-sanitization surfaces.
- Chaos-style testing: deliberately degrade the AI provider and SSO provider to confirm graceful degradation, not cascading failure.

**Definition of Done:**
- [ ] Load test results meet or exceed the performance targets defined in the Architecture Document's NFRs
- [ ] All identified security findings resolved or explicitly accepted with sign-off
- [ ] Circuit-breaker/degraded-mode behavior verified for every external dependency

**Estimated Difficulty:** High
**Estimated Time:** ~2 weeks

---

## Milestone 16 — Landing Page, Onboarding & Go-to-Market Readiness

**Goal:** Complete the pre-authentication experience and the operational readiness needed for a real, public-facing launch.

**Tasks:**
- Build the full `LandingPage`, including the `HeroDemoWidget` (UI/UX §1).
- Build the first-run onboarding flow and optional placement check (PRD FR-2).
- Wire production observability: structured logging, centralized log aggregation, metrics/APM dashboards (Architecture §19).
- Wire error-monitoring/alerting for production.
- Final content QA pass across the full published curriculum.

**Dependencies:** Milestones 1–15.

**Expected Output:** A production-ready application, observable and alertable, with a complete first-time-visitor-to-first-lesson experience.

**Testing:**
- End-to-end test of the complete new-visitor journey: land on the marketing page → sign up → onboarding → first lesson.
- Verify observability dashboards actually surface a deliberately-injected test error/latency spike.
- Cross-browser manual QA against the supported browser matrix (Architecture §12 NFRs).

**Definition of Done:**
- [ ] Full new-visitor journey verified end-to-end
- [ ] Observability and alerting confirmed functional against injected test conditions
- [ ] Cross-browser QA passed on the full supported matrix

**Estimated Difficulty:** Medium
**Estimated Time:** ~1.5 weeks

---

## Milestone 17 — Beta Launch & Feedback Iteration

**Goal:** Release to a limited beta audience, validate real-world usage against the PRD's Success Metrics, and fix what only real usage reveals.

**Tasks:**
- Staged/gated rollout to a limited beta cohort.
- Monitor activation, retention, and lesson-completion metrics against the PRD's defined targets (PRD §24).
- Triage and fix issues surfaced by real usage, prioritized by severity and frequency.
- Collect and act on qualitative feedback, particularly on the core "does this actually feel intuitive to a beginner" premise the whole product is built on.

**Dependencies:** Milestone 16.

**Expected Output:** A validated, real-user-tested product, with a prioritized post-beta fix list.

**Testing:** Continuous production monitoring against the observability stack from Milestone 16; this milestone's "testing" *is* the beta itself.

**Definition of Done:**
- [ ] Beta cohort has completed at least the first several lessons in meaningful numbers
- [ ] No unresolved P0 issues from beta feedback
- [ ] Success-metric baseline established for comparison against post-launch performance

**Estimated Difficulty:** Medium (technically), though this milestone's duration is calendar-driven (feedback collection time) more than effort-driven
**Estimated Time:** ~2–4 weeks (calendar time, not continuous engineering effort)

---

## Milestone 18 — Public Launch & Post-Launch Monitoring

**Goal:** Ship to the general public and transition from "build mode" to steady-state operations.

**Tasks:**
- Remove beta gating; full public availability.
- Establish ongoing on-call/incident-response process using the Milestone 16 observability stack.
- Establish a regular cadence for reviewing the PRD's Success Metrics and feeding findings back into the content and engineering backlogs.

**Dependencies:** Milestone 17.

**Expected Output:** A publicly available product in steady-state operation.

**Testing:** Ongoing production monitoring; this is the first milestone with no fixed "done" state — it's the transition into continuous operation.

**Definition of Done:**
- [ ] Public launch executed with no critical incidents in the first 48 hours
- [ ] On-call/incident-response process actively staffed
- [ ] First Success-Metrics review scheduled

**Estimated Difficulty:** Medium
**Estimated Time:** Launch event is immediate; monitoring is ongoing thereafter

---

## Roadmap Summary Timeline

| # | Milestone | Difficulty | Estimated Time |
|---|---|---|---|
| 0 | Foundational Setup & Decision Lock-In | Low | 1 week |
| 1 | Authentication & Account Foundation | Low–Medium | 1.5–2 weeks |
| 2 | Command Registry | Low | 1 week |
| 3 | Filesystem Simulation Engine (Backend) | High | 3–4 weeks |
| 4 | Terminal & Filesystem Panel Integration | High | 2–3 weeks |
| 5 | Animation Engine & Visual Polish | Medium | 2 weeks |
| 6 | Practice Mode | Medium | 1.5 weeks |
| 7 | Curriculum Content Model & Authoring | Medium | 2 weeks (+ parallel content track) |
| 8 | Lesson Screen & Guided Learning Flow | High | 3 weeks |
| 9 | Gamification System | Medium–High | 2.5 weeks |
| 10 | AI Tutor Integration | High | 3 weeks |
| 11 | Dashboard/Profile/Achievements/Leaderboard | Medium | 2 weeks |
| 12 | Admin Panel | Medium | 2.5 weeks |
| 13 | Responsive/Mobile Hardening | Medium | 1.5 weeks |
| 14 | Accessibility Audit & Hardening | Medium | 1.5 weeks |
| 15 | Security Hardening & Load Testing | High | 2 weeks |
| 16 | Landing Page, Onboarding & GTM Readiness | Medium | 1.5 weeks |
| 17 | Beta Launch & Feedback Iteration | Medium | 2–4 weeks (calendar) |
| 18 | Public Launch & Post-Launch Monitoring | Medium | Ongoing |

**Rough sequential total (Milestones 0–16, core build):** approximately 32–38 weeks (~7.5–9 months) with the assumed team size, before beta and public launch calendar time on top. Milestone 7's content-authoring track running in parallel with Milestones 3–6 is the single biggest opportunity to compress this timeline without adding engineering headcount.

**Note on scope not included here:** Phase 2 (classroom/instructor features) and Phase 3 (real Docker sandboxes, Git/Docker tracks) from the PRD's roadmap are deliberately not scheduled in this document — they begin only once the triggers named throughout the companion documents are actually met, not on a fixed calendar date.

---

*End of Document — Version 1.0*
