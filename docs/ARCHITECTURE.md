# Software Architecture Document

## VisuaLinux — Interactive Visual Linux Learning Platform

| Field | Value |
|---|---|
| Document Version | 1.0 (Draft) |
| Companion Document | VisuaLinux PRD v1.0 |
| Author | Lead Software Architect |
| Design Target | Architecture that is correct for MVP scale and does not need to be rewritten (only extended) to reach millions of users |

---

## 0. Assumptions Carried Forward From the PRD

This document inherits the three provisional decisions from the PRD, since they haven't yet been ratified. Every section below that depends on them is marked **[ASSUMED]**.

1. **Execution model:** Simulated engine for MVP; real Docker sandboxes deferred to a later phase but architected for now (Section 12).
2. **MVP command/shell scope:** Tier 1 (filesystem/permissions) + Tier 2 (text/content) + basic operators (pipes, redirection, wildcards).
3. **Business model:** Freemium — affects rate-limiting tiers and AI cost-control design.

---

## 1. Architecture Philosophy & Guiding Principles

Before naming a single technology, five principles govern every decision in this document. I'm stating them explicitly because they're what make "designed for millions of users" mean something other than buzzwords.

1. **Right-sized complexity, with a graduation path.** "Millions of users" is a *traffic and data* scaling problem, not automatically a *microservices* problem. A well-built modular monolith on properly scaled infrastructure comfortably serves millions of users — companies far larger than a Linux-learning startup have run monoliths at this scale. The mistake I'm explicitly avoiding is over-engineering for organizational scale (many independent teams) that this product doesn't have yet. Instead, every module is designed with **clean internal boundaries** so it can be *extracted* into an independent service later, when a specific, measured bottleneck justifies the operational cost of doing so — not preemptively.
2. **Separation of truth from presentation.** The backend owns *what happened* (filesystem state, diffs). The frontend owns *how it's shown* (animation style, timing, theme). This is what lets us redesign the visual layer, add themes, or support reduced-motion without ever touching backend logic — and it's the single most important architectural decision behind the "visual" part of this product actually working.
3. **Every external dependency has a defined degraded mode.** The AI provider, SSO providers, and (later) the sandbox orchestrator can all fail. None of them are allowed to take down core lesson/practice functionality. This was a PRD requirement (NFR, Section 12) and it's treated here as a hard architectural constraint, not a nice-to-have.
4. **Data-driven over hard-coded.** Commands, animation mappings, and lesson content are configuration, not code. This directly serves the PRD's maintainability requirement — adding command #51 should be a data change, not a deployment of new execution-engine logic.
5. **Security posture matches risk tier.** The simulated engine (MVP) and the real Docker sandbox (future) are architecturally treated as fundamentally different trust boundaries, not variations of the same service. This is called out explicitly in Section 12.

---

## 2. Complete Architecture — High-Level System View

```
┌─────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER                              │
│   React + TypeScript SPA (responsive web)                            │
│   ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──────────────────┐    │
│   │ Filesystem│ │ Terminal  │ │Explanation│ │  Gamification /   │    │
│   │   Panel   │ │  Panel    │ │  Panel    │ │  AI Tutor Panel   │    │
│   └───────────┘ └───────────┘ └───────────┘ └──────────────────┘    │
│         Client-side State Store (optimistic filesystem mirror)       │
└───────────────────────────┬───────────────────────────────────────────┘
                             │  HTTPS (REST) + SSE (AI token streaming)
┌───────────────────────────▼───────────────────────────────────────────┐
│                        EDGE / GATEWAY LAYER                            │
│   CDN (static assets, global)   API Gateway (authN, rate limit, route) │
└───────────────────────────┬───────────────────────────────────────────┘
                             │
┌───────────────────────────▼───────────────────────────────────────────┐
│                     APPLICATION SERVICE LAYER                          │
│  ┌────────┐ ┌───────────┐ ┌────────────┐ ┌───────────┐ ┌───────────┐  │
│  │  Auth  │ │  Learning  │ │ Filesystem │ │Gamification│ │    AI     │  │
│  │Service │ │  Engine    │ │ Simulation │ │  Service   │ │  Gateway  │  │
│  │        │ │(Lesson/    │ │  Engine    │ │            │ │  Service  │  │
│  │        │ │ Practice)  │ │            │ │            │ │           │  │
│  └────────┘ └───────────┘ └────────────┘ └───────────┘ └───────────┘  │
│        (Modular Monolith at MVP — logically isolated modules,          │
│         each independently extractable later)                         │
└───────────────────────────┬───────────────────────────────────────────┘
                             │
┌───────────────────────────▼───────────────────────────────────────────┐
│                            DATA LAYER                                   │
│  PostgreSQL (primary, transactional)   Redis (cache/queue/leaderboard)  │
│  S3-compatible Object Storage (assets, certificates)                    │
│  Analytics Event Pipeline → Data Warehouse (async, decoupled)           │
└───────────────────────────┬───────────────────────────────────────────┘
                             │
┌───────────────────────────▼───────────────────────────────────────────┐
│                   EXTERNAL / FUTURE-PHASE LAYER                        │
│  LLM Provider API   SSO Providers   Email/Push Provider                │
│  Docker Sandbox Orchestrator (Phase 3 — isolated trust boundary)       │
└─────────────────────────────────────────────────────────────────────────┘
```

**Why a modular monolith, not microservices, at launch:** A single small team shipping an MVP that splits into five services on day one pays a constant "distributed systems tax" — network calls where function calls would do, five deploy pipelines instead of one, five sets of logs to correlate — for zero benefit, since there's no team-scaling problem yet to solve. Module boundaries here are enforced at the *code* level (separate packages, no cross-module direct database access, only defined internal interfaces) so that extracting, say, the Filesystem Simulation Engine into its own service later is a mechanical refactor, not a rewrite. The trigger to extract a module: it needs to scale independently of the rest (e.g., the simulation engine gets CPU-bound under load while Auth is idle), or a dedicated team forms around it.

---

## 3. Frontend Architecture

**Framework: React + TypeScript**
*Reasoning:* Component-based rendering maps naturally onto a panel-based UI; TypeScript is non-negotiable here specifically because the command/animation event schema needs to be shared and type-checked between frontend and backend to prevent silent drift (see Section 20, shared types package).
*Advantages:* Enormous ecosystem, strong hiring pool, mature tooling for the animation/virtualization libraries we need.
*Disadvantages:* Not the lightest-weight option (a framework like Svelte would ship less JS); accepted trade-off given ecosystem maturity matters more here than bundle size at this stage.

**Terminal rendering: xterm.js**
*Reasoning:* A purpose-built, battle-tested terminal emulator component gives us authentic keybindings, history navigation, and rendering performance for free, rather than reimplementing a terminal UI from scratch — directly serves the PRD requirement that the terminal "never look fake."
*Advantages:* Production-proven (used by VS Code's integrated terminal), handles edge cases (IME input, paste handling) we'd otherwise have to solve ourselves.
*Disadvantages:* Designed around real PTY streams; we adapt it to our simulated command/response model rather than a raw stream, which requires a thin integration layer.

**Filesystem tree rendering: Custom SVG/DOM renderer + virtualization**
*Reasoning:* The animated create/delete/move/copy transitions are bespoke enough that no off-the-shelf file-tree component fits; built on top of a well-established animation library (Framer Motion) for orchestrating enter/exit/move transitions declaratively rather than hand-rolled imperative animation code. For large trees, `react-window`-style virtualization renders only visible nodes, directly satisfying the PRD's performance NFR for large filesystems.
*Advantages:* Full control over each animation type the PRD specifies (grow, fade, slide, duplicate, icon transition); virtualization keeps performance flat regardless of tree size.
*Disadvantages:* More engineering effort than adopting an existing tree component; justified because the animation behavior *is* the product's core differentiator, not a place to cut corners.

**State management: A single client-side "Session Store" (Zustand or Redux Toolkit)**
*Reasoning:* Command execution must fan out atomically to four panels simultaneously (filesystem, terminal, explanation, output console). A single source of truth for session state (current FS mirror, command history, lesson step, animation event queue) prevents the classic multi-panel bug of panels drifting out of sync with each other.
*Advantages:* Predictable, debuggable state flow; easy to reason about "what changed and who needs to know."
*Disadvantages:* Adds a small amount of boilerplate versus scattering local component state; strongly worth it given how central synchronization is to this product's value proposition.

**Command execution model: Optimistic client-side simulation, reconciled against server-authoritative state**

This is the single most important frontend/backend architectural decision, so I want to walk through the reasoning rather than just state the conclusion.

- *Option A — Pure client-side simulation:* Fast, works offline-ish, zero network latency for animation. But: the simulation logic now lives in two places if the server also needs to validate/persist state (duplication and drift risk), harder to update command behavior without a frontend deploy, and it's trivial for a user to manipulate client state to fake lesson completion (defeats gamification integrity).
- *Option B — Pure server-authoritative execution:* Every command round-trips to the server before anything animates. Simple, single source of truth, secure. But: adds perceived latency to every single keystroke-triggered action, which actively undermines the "feels alive" requirement from the PRD.
- **Chosen — Hybrid (optimistic + reconciliation):** The client holds a *mirror* of the current filesystem state (received from the server on load) and a lightweight copy of the same command-interpretation logic (shared TypeScript package, Section 20) purely for *instant animation feedback*. Simultaneously, the actual command is sent to the server, which is the authoritative source of truth, persists the change, and returns the real diff. If client and server ever disagree (rare — network issues, edge-case bugs), the client silently reconciles to the server's version. This is the same pattern used by collaborative editors like Figma/Google Docs for the same reason: instant feedback without sacrificing a single source of truth.

*Advantages:* Feels instant (serves the "every command should feel alive" requirement) while remaining secure and centrally auditable/updatable.
*Disadvantages:* More complex than either pure option — requires a reconciliation strategy and a shared logic package kept in sync across two runtimes. This complexity is justified because instant-feeling animation is the core product thesis, not a peripheral nicety.

**Accessibility implementation:** ARIA live regions driven directly off the same animation-event stream that drives visual animation (single event source, two consumers — visual renderer and screen-reader announcer), so the two can never fall out of sync with each other. `prefers-reduced-motion` and the in-app toggle both route to the same "instant update" rendering path used for reconciliation above — meaning the reduced-motion code path is already exercised constantly in normal operation, not a rarely-tested fallback.

---

## 4. Backend Architecture

**Runtime & Language: Node.js + TypeScript across all MVP services**
*Reasoning:* A single language across frontend and backend means the command schema, animation event types, and validation logic can live in one shared package and be type-checked end-to-end — eliminating an entire class of "frontend and backend disagree about the shape of data" bugs. Node's async I/O model fits this workload well: most requests are I/O-bound (DB reads/writes, LLM API calls), not CPU-bound.
*Advantages:* One language, one hiring profile, shared types, faster shipping for a small team.
*Disadvantages:* Node is not the fastest option for CPU-bound work. The Filesystem Simulation Engine, under heavy load, is the most likely candidate to become CPU-bound first (parsing + tree operations at high request volume). **This is explicitly deferred, not ignored:** the module boundary is kept clean enough that if profiling in production shows this engine is a bottleneck at scale, it can be extracted and rewritten in a faster runtime (Go or Rust) without touching any other service — a concrete, named "future scalability" trigger rather than vague hand-waving.

**API style: REST for standard operations, Server-Sent Events (SSE) for AI streaming**
*Reasoning:* Command execution is a synchronous, single-user request/response interaction in MVP (no live multiplayer requirement) — a plain REST call is simpler to build, cache, load-balance, and debug than a persistent WebSocket connection, and there's no real-time multi-party state to justify the added complexity. AI tutor responses, however, benefit noticeably from token-by-token streaming for perceived responsiveness, where SSE (simpler than a full WebSocket for one-directional streaming) is the right-sized tool.
*Advantages:* REST is stateless and trivially horizontally scalable behind any load balancer; SSE gets us streaming UX without WebSocket's bidirectional complexity where we don't need bidirectionality.
*Disadvantages:* If a future phase adds real-time collaborative sessions (pair-programming style), a WebSocket layer would need to be introduced then — explicitly scoped out of MVP rather than pre-built speculatively.

**Module boundaries (the "services" inside the modular monolith):**
- **Auth Service** — account lifecycle, session/token issuance, SSO integration
- **Learning Engine** — lesson content delivery, lesson state machine, quiz validation, practice sandbox lifecycle
- **Filesystem Simulation Engine** — command parsing, FS state mutation, diff + animation event generation (the performance-critical core)
- **Gamification Service** — XP, streaks, badges, leaderboard, certificates (event-driven, consumes events rather than being called synchronously — see below)
- **AI Gateway Service** — context assembly, LLM provider calls, response streaming, semantic caching, rate limiting

**Why Gamification is event-driven, not a direct synchronous call:** When a user completes a lesson step, the Learning Engine doesn't call the Gamification Service directly and wait. It emits an event ("lesson_step_completed") to a lightweight internal queue (Redis Streams at MVP scale). The Gamification Service consumes it asynchronously. *Reasoning:* this means a slow or temporarily-down Gamification Service can never add latency to, or break, the core learning flow — directly implementing the PRD's non-negotiable requirement that gamification failures never block learning. It also means new badge rules can be added by subscribing new consumers to existing events, without modifying the Learning Engine at all.

---

## 5. Authentication

**Approach: Managed identity provider (e.g., a service like Auth0, Clerk, or a cloud-native equivalent such as AWS Cognito) rather than building auth in-house at MVP.**

*Reasoning:* Authentication is a security-critical, easy-to-get-subtly-wrong domain (password hashing, session fixation, SSO protocol correctness, credential-stuffing protection). A managed provider gets this right on day one and lets engineering time go toward the actual product differentiator. At "millions of users" scale, per-user auth costs become non-trivial — this is explicitly flagged as a **re-evaluation trigger**: once monthly active users cross a threshold where in-house auth (built by then-more-mature engineering team, using standard JWT/OAuth2 patterns against our own Postgres) becomes cheaper than the vendor's per-user pricing, migrate. This is a known, well-trodden migration path (most managed-to-self-hosted auth migrations follow the same playbook), so deferring it is low-risk.

*Advantages:* Faster to ship securely, offloads compliance burden (SOC2-type assurances from the vendor), built-in SSO support.
*Disadvantages:* Vendor lock-in risk and per-user cost scaling — both consciously accepted for MVP with a defined exit trigger.

**Token model:** Short-lived JWT access tokens + longer-lived refresh tokens stored in httpOnly secure cookies (not localStorage, to reduce XSS token-theft risk). Standard, well-understood pattern.

**Authorization / roles:** The user schema includes a `role` field from day one (`learner`, and placeholders for future `instructor`/`org_admin`) even though only `learner` is used in MVP. *Reasoning:* Adding a role column later requires a migration touching every existing row; reserving the field now costs nothing and avoids that migration when Phase 2's classroom features (Mr. Okafor persona) arrive.

---

## 6. Filesystem Engine

The core of the product. Design goals: correctness, fast diff generation, safe isolation per user, and cheap reset.

**Data model:** Each sandbox filesystem is a tree of nodes (`id`, `type` [file/directory/symlink], `name`, `parent_id`, `owner`, `permissions`, `content` [for files, size-capped], `created_at`, `updated_at`), stored as an **adjacency list** in PostgreSQL, queried via recursive CTEs for subtree operations (e.g., rendering the full tree, computing `rm -r` targets).

*Why adjacency list over materialized path or nested sets:* Adjacency list is the simplest correct model and Postgres's recursive CTE support handles tree traversal well at the scale we actually need — individual user sandboxes are small (tens to low hundreds of nodes), not the kind of massive shared tree where nested-set/materialized-path read optimizations would matter. Simplicity wins here because the theoretical downside (recursive query cost) doesn't materialize at this scale.
*Advantages:* Simple to reason about, cheap inserts/updates/moves (the operations that dominate this workload), no need to rewrite paths on every move like materialized-path requires.
*Disadvantages:* Subtree reads are recursive queries rather than a single indexed range scan; acceptable given small tree sizes. **Explicit future trigger:** if a future phase (e.g., real Docker sandboxes with genuinely large filesystems) needs to render much larger trees, migrate that specific use case to a materialized-path or dedicated tree-store model — not a whole-system change.

**Command interpreter — data-driven design:** Each supported command is defined as a declarative specification, not imperative code: expected argument grammar, allowed flags, the FS operation(s) it triggers, validation rules, and its animation event type. The interpreter is a generic engine that reads this registry. *Reasoning:* this is what lets "add command #51" be a configuration change (and, later, something even non-engineers on a content team could contribute to within a controlled schema) instead of a code change requiring a full engineering review and deploy — directly serves the PRD's maintainability NFR.

**Isolation & reset:** Every sandbox (whether a lesson-scoped sandbox or the open Practice Mode sandbox) is scoped by `(user_id, sandbox_id)` with no cross-sandbox or cross-user node references ever possible at the schema level. A single canonical "default seeded filesystem" template exists once; "Reset Sandbox" clones it fresh for that user rather than trying to computing a diff-based rollback — cheap, simple, and impossible to get subtly wrong.

**Diff generation:** Every command execution produces a structured diff object (nodes added/removed/moved/modified) which becomes both the persisted change (written to Postgres) and the payload sent to the client to drive animation — this is the same object serving two purposes, avoiding a "compute the change twice" bug class.

---

## 7. Terminal Engine

Thin orchestration layer, most of the real logic lives in the Filesystem Engine:

1. **Input capture** (client, via xterm.js) — history navigation, tab-complete triggers, keybindings.
2. **Tokenizer/Parser** (shared package, runs both client-side for instant autocomplete and server-side for authoritative execution) — splits input into command, flags, arguments, and MVP-scope operators (`|`, `>`, `>>`, `*`).
3. **Command Registry lookup** — validates the parsed command exists and arguments match its declared grammar (Section 6).
4. **Dispatch to Filesystem Simulation Engine** for FS-mutating commands, or to a lightweight **Text Processing module** for Tier 2 commands (`cat`, `grep`, `sort`, etc., which operate on file *content* rather than tree structure — kept as a logically separate concern from the tree-mutation engine, sharing the same node data model).
5. **Output formatting** — assembles the text the terminal displays, matching real Linux output formatting conventions.

*Why parsing logic is shared between client and server rather than living only on the server:* This is what makes the optimistic client-side simulation (Section 3) possible without duplicating and maintaining two separate parser implementations that could drift apart — one shared package, two runtimes.

---

## 8. Animation Engine

Deliberately positioned as a **frontend-only concern**, consuming a backend-defined event schema.

**Event schema (conceptual, not implementation):** Each backend response includes an ordered list of animation events, e.g. `{type: "create", nodeId, path, nodeType}`, `{type: "delete", nodeId}`, `{type: "move", nodeId, fromPath, toPath}`, `{type: "permission_change", nodeId, oldPerm, newPerm}`, `{type: "symlink", nodeId, targetId}`.

**Playback engine (client):** A queue manager consumes these events and maps each to a Framer-Motion-driven transition on the corresponding tree node. For commands producing many simultaneous diffs (e.g., `rm -rf` on a populated directory), events are staggered with a small timing offset rather than fired simultaneously — a deliberate UX choice so the user can visually track what's happening rather than seeing an instant, confusing bulk change.

**Why this is a clean separation of concerns worth calling out explicitly:** The backend never knows or cares *how* a "create" event is animated — grow, fade-in, bounce, whatever. This means the entire visual style of the product (themes, animation speed defaults for Beginner vs. Advanced mode, a future rebrand) is a frontend-only change. It also means reduced-motion support (Section 3) is simply a different consumer of the exact same event stream — an "instant apply" renderer instead of an animated one — guaranteeing feature parity between motion and reduced-motion users by construction, not by manually keeping two implementations in sync.

---

## 9. Learning Engine (Lessons)

**Content model:** Lesson content (explanations, quiz questions, success criteria) is authored as structured, versioned files (e.g., MDX/JSON) in a content repository, separate from application code, and ingested into Postgres for serving.
*Reasoning:* Decouples content authoring — which should eventually be doable by instructional designers, not only engineers — from application deploys. Versioning content separately also directly supports the PRD's future localization requirement: a translated lesson file is a new content version, not a code change.

**Lesson state machine:** Per user, per lesson, tracks current step (`explain → demo → practice → quiz → complete`). Practice-step validation uses **declarative success predicates** rather than exact command-string matching — e.g., a step's success condition might be "a directory node named `project` exists as a child of the current directory," which is satisfied by `mkdir project` *or* any equivalent valid sequence, directly implementing the PRD's requirement (FR-3.3) to accept reasonable valid alternatives rather than penalizing users for using a different-but-correct approach.

**Hint escalation:** Stored as a simple ordered list per lesson step (nudge → partial reveal → full worked example), advanced automatically after N failed attempts — a straightforward state counter, not a complex system, but worth naming explicitly since it's directly required by the PRD.

---

## 10. Practice Engine

Reuses the Filesystem Engine's primitives entirely rather than maintaining separate logic — a Practice sandbox and a Lesson-step sandbox are the same underlying construct (`sandbox_id` scoped filesystem), differing only in which "template" seeded them and whether a Lesson Engine step-validator is actively listening to diffs from that sandbox. This reuse is a direct consequence of Principle 4 (Section 1): building one well-designed Filesystem Engine that both Learning and Practice consume, instead of two parallel implementations that could drift.

Reset is a template re-clone (Section 6); persistence between sessions is a debounced write-through to Postgres on each command, so a user can close the tab mid-experiment and resume exactly where they left off.

---

## 11. AI Engine (AI Tutor)

**Architecture:** A dedicated AI Gateway Service — deliberately *not* letting the frontend call the LLM provider directly — responsible for:
1. **Context assembly:** recent command history (bounded window, to control token cost), current filesystem state summary, active lesson/step (if any), and the user's question/error.
2. **Guardrail enforcement:** system-prompt-level instruction to default to guided/Socratic responses during active quiz steps (PRD FR-9.4), server-enforced so it can't be bypassed from the client.
3. **Provider call:** to the LLM provider's API, with streamed response passed through via SSE to the client for perceived responsiveness.
4. **Cost control — semantic caching:** Many AI tutor questions are generic and repeat across thousands of users ("what's the difference between cp and mv?"). A cache layer (Redis, keyed on normalized/embedded question similarity) serves these from cache instead of re-querying the LLM every time — a meaningful cost lever specifically *because* of the "millions of users" scale target; without it, AI cost scales linearly with users asking largely-overlapping beginner questions.
5. **Rate limiting:** per-user, per-tier request budgets enforced at the gateway (ties to Redis counters), with tiers defined by the business model **[ASSUMED — Decision #3]**.
6. **Fallback:** if the provider is unavailable or a user exhausts their rate limit, the gateway serves matched static help content (keyword-matched from a small curated FAQ set) rather than failing outright — implements PRD FR-9.6 concretely.

*Why a dedicated gateway rather than calling the LLM from each service that might need it:* Centralizes cost control, guardrails, and caching in exactly one place, so every future feature that wants AI assistance (future Git tutor, Docker tutor, etc.) gets rate limiting and caching "for free" by going through the same gateway, rather than every team reimplementing it.

---

## 12. Docker Sandbox (Future Phase — Architected Now, Not Built in MVP)

Per the PRD, real sandbox execution is explicitly Phase 3. It's designed here because retrofitting security architecture after the fact is far riskier than designing the boundary correctly from the start.

**Core principle: this is a different trust boundary, not an extension of the simulated engine.** The simulated engine (MVP) never executes real code — its worst-case failure mode is a logic bug producing an incorrect animation. A real Docker sandbox executes arbitrary user-typed commands against a real filesystem and (potentially) real process space — its worst-case failure mode is a security incident (container escape, resource-abuse, using our infrastructure as a pivot point for attacks). These must never share infrastructure, credentials, or even a deployment pipeline.

**When built, the design is:**
- **Isolation:** per-session ephemeral, tightly resource-limited containers (CPU/memory/time quotas), using a hardened runtime (gVisor or Firecracker-style microVMs rather than bare Docker) given these run genuinely untrusted, arbitrary user input.
- **Network:** no outbound network access by default — prevents the sandbox being used as a free compute/attack proxy, which is the single most common way "give users a real shell" products get abused.
- **Lifecycle:** pre-warmed container pool to avoid cold-start latency hurting UX; auto-destroyed on session end or inactivity timeout; strictly non-persistent (any "save my work" experience in real-sandbox mode would need to explicitly export to the regular persisted-progress system, not rely on container state surviving).
- **Orchestration:** a dedicated Sandbox Orchestrator service (Kubernetes Jobs or equivalent), isolated in its own network segment/VPC from the core application services, with its own audit logging (every command executed inside a real sandbox logged with full context — a materially higher logging bar than the simulated engine, given the real-world risk).
- **Cost/abuse control:** per-user sandbox-minute quotas tied to subscription tier, since real compute is materially more expensive than simulated execution and is a natural gate for monetization tiers.

**Why this is worth designing now even though it's not built now:** Naming the trust boundary explicitly today means no MVP decision (e.g., how auth tokens are scoped, how service-to-service trust works) accidentally makes the *right* Phase 3 security posture harder to retrofit later.

---

## 13. Database Architecture

**Primary datastore: PostgreSQL**
*Reasoning:* Strong consistency guarantees matter for user progress, gamification state, and (eventually) billing-adjacent data — this isn't a workload where eventual consistency is an acceptable trade for extra throughput. Postgres's recursive CTE support fits the Filesystem Engine's tree model well (Section 6); JSONB columns give flexible fields (lesson content metadata, command registry entries) without needing a second, separate NoSQL system for MVP.
*Advantages:* Mature, well-understood scaling patterns, strong data integrity guarantees, one less system to operate versus a polyglot persistence approach at this stage.
*Disadvantages:* Vertical scaling has a ceiling, and horizontal scaling (sharding/partitioning) requires real engineering effort when the time comes. **Explicit trigger:** this becomes necessary once single-instance write throughput or storage approaches practical limits — addressed via read replicas first (cheap, handles read-heavy dashboard/leaderboard-adjacent load), then partitioning by `user_id` hash if write load ever requires it. Not a Day 1 concern, but the schema is designed (user-scoped tables, no cross-user joins in hot paths) so that partitioning by user later is straightforward rather than a redesign.

**Conceptual schema areas** (entities, not DDL, since no code is being generated): Users/Accounts, Lessons/Tracks/Content (versioned), UserProgress, FilesystemNodes (per sandbox), CommandHistory (bounded retention, feeds AI context + analytics), GamificationState (XP/streaks/badges), Certificates.

**Object storage (S3-compatible):** static content assets (lesson illustrations), generated certificate exports (PDF/image). Kept out of Postgres entirely — binary blobs don't belong in a relational database at scale.

**Analytics pipeline — deliberately decoupled:** Product analytics events (lesson drop-off, command error frequency, AI usage patterns — all specified in the PRD's observability NFR) are streamed asynchronously to a separate data warehouse rather than queried directly against the production Postgres instance. *Reasoning:* analytics queries (large scans, aggregations) and production transactional queries (small, fast, latency-sensitive) have fundamentally different access patterns; running both against the same database risks analytics work degrading the live user experience. This decoupling costs a small amount of pipeline infrastructure now and prevents a very real, very common production incident later.

---

## 14. Caching

**Redis as the central in-memory layer**, serving several distinct purposes:
- **Session/auth token cache** — fast validation without a DB round-trip on every request.
- **Command autocomplete metadata** — read extremely frequently, changes rarely; aggressively cached with long TTLs, invalidated by version bump on registry updates.
- **Leaderboard** — implemented as a Redis Sorted Set (ZSET), giving O(log N) rank/score operations, the industry-standard pattern for leaderboards at large scale (this is specifically why Redis, not a Postgres query, powers the leaderboard).
- **AI semantic cache** — as described in Section 11.
- **Rate-limit counters** — per-user/per-IP request budgets (API gateway and AI Gateway both consume this).
- **Gamification event queue** — Redis Streams as the lightweight pub/sub mechanism for the event-driven Gamification Service (Section 4).

**CDN** (e.g., a standard provider like Cloudflare or CloudFront) serves all static frontend assets (JS/CSS bundles, fonts, images) from edge locations — essential for a "students worldwide" audience where origin-server latency to, say, a learner in a different continent from the primary data center would otherwise be a poor experience, and meaningfully reduces origin bandwidth cost at scale.

**Cache invalidation strategy:** version-keyed, not manually purged — lesson content and command registry entries carry a version number; publishing a new version changes the cache key rather than requiring an explicit "clear the cache" operation, which is a well-known source of subtle bugs when done manually.

---

## 15. Deployment

**Staged infrastructure approach, mirroring the "right-sized complexity" principle from Section 1:**

- **MVP stage:** Containerized services deployed on a managed container platform (e.g., AWS ECS Fargate, Google Cloud Run, or a similar managed PaaS) rather than full Kubernetes. *Reasoning:* gets horizontal scaling, rolling deploys, and managed infrastructure without requiring a dedicated platform/DevOps engineer to operate a Kubernetes cluster before the team or traffic justifies that operational investment.
- **Growth stage trigger:** once the Docker Sandbox module (Section 12) is being built, or once the team has dedicated platform engineering capacity, graduate to full Kubernetes (e.g., EKS/GKE) — a natural fit at that point since the Sandbox Orchestrator needs Kubernetes-native primitives (Jobs, strict namespace isolation) anyway, so the migration serves two needs at once rather than being infrastructure churn for its own sake.

**CI/CD:** Standard pipeline — lint, type-check, automated tests, build, deploy — gated on passing checks, with staging and production environments. Infrastructure defined as code (e.g., Terraform) from day one, specifically so environment setup is reproducible and auditable rather than manually configured (this matters a lot once a security review of the Docker Sandbox module happens in Phase 3).

**Environments:** dev → staging → production, with production deploys via rolling or canary release once traffic justifies the extra safety margin canary deploys provide.

---

## 16. Scaling

- **Application services:** stateless by design (Section 4), scale horizontally behind a load balancer — the standard, well-proven pattern, requiring no special architecture beyond keeping services stateless in the first place (which is why that was called out as a principle, not an afterthought).
- **Database:** read replicas first (cheap, handles read-heavy load like dashboards and progress views), partitioning by `user_id` if/when write throughput requires it (Section 13).
- **Redis:** clustering once a single instance's memory or throughput is saturated — standard Redis Cluster patterns apply cleanly given our usage (mostly independent per-key operations, not complex multi-key transactions).
- **AI Engine:** the actual bottleneck at large scale is more likely to be LLM provider cost and rate limits than our own infrastructure — mitigated primarily through the semantic caching and tiered rate-limiting already described (Section 11), which is a cost-scaling lever, not just a UX one.
- **Global/multi-region:** the CDN already solves global static-asset latency. Multi-region *application and database* deployment is explicitly deferred — it introduces real complexity (data residency, cross-region consistency) that isn't justified until traffic patterns and, likely, data-residency/compliance requirements (e.g., serving EU users) make it necessary. Named here as a future consideration with no premature investment now.

---

## 17. Security

- **Input sanitization:** every point where user-generated content is rendered (filenames, simulated file contents, AI chat messages) is treated as untrusted and sanitized before rendering — standard XSS prevention, called out explicitly because a filesystem-visualization product renders a lot of user-typed strings as UI elements (a folder name *is* rendered text), which is an easy category to under-scrutinize.
- **CSRF protection** on all state-changing requests.
- **Rate limiting** at the API Gateway layer, both per-IP and per-account, protecting against abuse independent of the AI-specific rate limiting in Section 11.
- **Secrets management:** via a dedicated secrets/vault service, never in environment files committed to a repository or baked into container images.
- **Dependency scanning** integrated into CI, catching known-vulnerable packages before deploy.
- **Least-privilege service-to-service auth:** internal services authenticate to each other with short-lived signed tokens (or mTLS once on Kubernetes), so a compromise of one service doesn't implicitly grant broad access to others.
- **Sandbox security tier:** covered in depth in Section 12 — deliberately isolated from the rest of this section's scope because it's a materially higher-risk boundary once built.
- **Compliance flag (not solved here):** the PRD notes the audience may include minors; data minimization and applicable child-data-protection compliance is a legal/policy decision that must land before any architecture decision here is treated as final (e.g., data retention periods, what's collected at signup).

---

## 18. Error Handling (System-Level)

Distinct from the PRD's *user-facing* error handling (which is a product/UX concern already specified) — this is about how the system itself handles failure internally.

- **Consistent error taxonomy** across all services: validation errors, business-logic errors, and system/infrastructure errors each have a distinct, consistent API error shape, so the frontend can handle each category predictably rather than parsing ad hoc error strings.
- **Circuit breakers** around every external dependency (LLM provider, SSO providers, and later the Sandbox Orchestrator) — if a dependency is failing, the circuit breaker stops hammering it and immediately routes to that dependency's defined degraded mode (Section 1, Principle 3), rather than letting failures cascade or pile up as timeouts.
- **Idempotency** on state-mutating endpoints where retries are possible (e.g., command execution), so a network retry after a dropped response doesn't double-apply a filesystem change.

---

## 19. Logging & Observability

- **Structured (JSON) logging** across all services, with a correlation/trace ID propagated through an entire request — important here specifically because a single command execution can touch the Filesystem Engine, trigger a Learning Engine step-check, and emit a Gamification event, and debugging that flow without a shared trace ID would be painful.
- **Centralized log aggregation** (e.g., a managed observability platform like Datadog or an open-source stack like Grafana Loki/ELK) rather than per-service log files.
- **Separate, longer-retention audit log** for security-sensitive events (auth events now; real sandbox command execution once Phase 3 ships) — distinct from general application logs both in retention policy and access control, since audit logs often have different compliance requirements than debug logs.
- **Metrics/APM:** standard service metrics (latency, error rate, throughput) via Prometheus-style metrics or a managed APM tool. One PRD-specific nuance worth noting: **animation frame rate can only be meaningfully measured client-side** (via Real User Monitoring), not inferred from backend metrics — worth flagging now so it isn't accidentally left unmeasured.

---

## 20. Folder Structure (Conceptual Repository Layout)

Presented as organizational structure, not code — a **monorepo**, for a specific reason explained below.

```
visualinux/
├── apps/
│   ├── web/                      # React + TypeScript frontend
│   └── api/                      # Node.js + TypeScript backend (modular monolith)
│       ├── modules/
│       │   ├── auth/
│       │   ├── learning/         # Lesson + Practice engines
│       │   ├── filesystem-engine/
│       │   ├── gamification/
│       │   └── ai-gateway/
│       └── gateway/               # API gateway / routing layer
├── packages/
│   ├── shared-types/              # Command schema, animation event schema,
│   │                               # shared between web and api (Section 3)
│   ├── command-registry/          # Data-driven command definitions (Section 6)
│   └── ui-components/             # Shared design-system components
├── content/
│   └── lessons/                   # Versioned lesson content (MDX/JSON, Section 9)
├── infra/
│   └── terraform/                 # Infrastructure as code (Section 15)
└── docs/
    ├── PRD.md
    └── ARCHITECTURE.md
```

*Why a monorepo:* The single highest-value payoff is `packages/shared-types` and `packages/command-registry` being genuinely shared, type-checked, single-source artifacts consumed by both the frontend (for optimistic simulation) and backend (for authoritative execution) — this is what makes the Section 3 hybrid execution model safe from drift. A polyrepo would require publishing and version-syncing these as separate packages, adding friction to exactly the workflow (updating command definitions) that should be as low-friction as possible.
*Disadvantages/future trigger:* Monorepos need dedicated tooling (Nx, Turborepo) to keep build times sane as they grow, and become harder to manage if/when multiple independent teams with different release cadences form around different modules — at that point, extracting a module into its own repository alongside its own service extraction (Section 4) is the natural, paired migration.

---

## 21. Technology Choices — Consolidated Reference Table

| Layer | Choice | Primary Reason | Key Trade-off Accepted |
|---|---|---|---|
| Frontend framework | React + TypeScript | Component model fits panel UI; shared types with backend | Not the lightest-weight framework option |
| Terminal UI | xterm.js | Authentic, battle-tested terminal behavior | Adapted from real-PTY assumptions to our simulated model |
| Animation | Framer Motion + custom SVG/DOM renderer | Full control over bespoke animation types | More engineering effort than an off-the-shelf tree component |
| Client state | Zustand / Redux Toolkit | Single source of truth for multi-panel sync | Slightly more boilerplate than local state |
| Backend runtime | Node.js + TypeScript | Shared types with frontend, strong async I/O fit | Not fastest for CPU-bound work (named extraction trigger) |
| Backend architecture | Modular monolith | Right-sized for current team/scale, clean extraction path | Not independently deployable per-module yet (by design, for now) |
| API style | REST + SSE (AI streaming) | Matches actual sync/streaming needs, avoids premature WebSocket complexity | No real-time multiplayer support yet (out of MVP scope anyway) |
| Primary database | PostgreSQL | Strong consistency, recursive CTEs fit tree model, JSONB flexibility | Horizontal scaling requires deliberate future work (named trigger) |
| Cache/queue | Redis | One tool serving cache, leaderboard (ZSET), rate limits, event queue | Additional operational component to run |
| Object storage | S3-compatible | Binary assets don't belong in relational DB | N/A — standard practice |
| Auth | Managed identity provider | Security-critical domain, faster/safer to ship | Vendor lock-in + per-user cost (named re-evaluation trigger) |
| AI provider integration | Dedicated AI Gateway Service | Centralized guardrails, caching, cost control | One more internal service to operate |
| Deployment (MVP) | Managed container platform (e.g., Fargate/Cloud Run) | Scaling without full K8s operational overhead | Less flexible than raw Kubernetes (named graduation trigger) |
| Deployment (future) | Kubernetes | Needed once Docker Sandbox module is built anyway | Real operational complexity, justified by that point |
| Repo structure | Monorepo | Shared types package is the linchpin of the hybrid execution model | Needs tooling (Nx/Turborepo) as it grows |

---

## 22. Future Scalability — How This Architecture Grows

Rather than scatter "this could scale later" notes throughout, here is the consolidated growth narrative, collecting every named trigger from above into one roadmap:

1. **Modular monolith → extracted microservices**, module by module, triggered by a specific module needing to scale independently (most likely candidate: Filesystem Simulation Engine, given it's the most CPU-intensive) or by a dedicated team forming around a module.
2. **Node.js Filesystem Engine → Go/Rust rewrite of that one module**, triggered by measured CPU-bound bottleneck under load — not a wholesale rewrite of the platform.
3. **Managed container platform → Kubernetes**, triggered by (and naturally paired with) building the Docker Sandbox module, which needs Kubernetes-native primitives regardless.
4. **Managed auth provider → in-house auth**, triggered by per-user vendor cost exceeding the cost of an in-house implementation at scale.
5. **Single PostgreSQL instance → read replicas → partitioned/sharded**, triggered by measured read load, then write-throughput/storage limits respectively — schema already designed (user-scoped, no cross-user hot-path joins) to make this straightforward when needed.
6. **Simulated execution engine → hybrid with real Docker sandboxes**, an intentionally separate trust boundary (Section 12) built as a genuinely new, isolated module rather than an extension of the existing engine — the security architecture for this is already reasoned through, not deferred blindly.
7. **Single-region → multi-region**, triggered by either latency data showing a real user-experience problem for a specific geography, or a data-residency/compliance requirement (e.g., serving EU users under GDPR data-locality expectations) — whichever comes first.
8. **Monorepo → polyrepo** (partial or full), triggered by, and paired with, service extraction as multiple independent teams form.

Every one of these has a **named, measurable trigger** rather than a vague "if we get big." That's deliberate: it means engineering effort goes into each evolution exactly when the data says it's needed, not preemptively (over-engineering) or reactively under fire (under-engineering).

---

*End of Document — Version 1.0*
