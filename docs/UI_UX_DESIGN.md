# UI/UX Screen Design Document

## VisuaLinux — Interactive Visual Linux Learning Platform

| Field | Value |
|---|---|
| Document Version | 1.0 (Draft) |
| Companion Documents | PRD v1.0, Architecture v1.0, Database Design v1.0, API Design v1.0 |
| Author | Senior UI/UX Designer |
| Scope | Every screen, every component, responsive behavior, dark mode, and animation system — descriptive design specification, no implementation code |

---

## 0. Design System Foundations

Every screen below is built from the same small set of tokens and primitives. Stating them once here keeps every screen consistent and keeps this document from repeating itself 11 times.

**Color philosophy — the one rule that matters most:** The PRD specifies the current-working-directory highlight must be bright green. That color is now **reserved, exclusively, for that one meaning, everywhere in the product.** Success states, "correct" quiz feedback, and confirmation actions use a *different* accent (a teal/cyan) specifically so green never means two things at once. Diluting a color's meaning across multiple states is a common source of subtle user confusion in exactly this kind of visually-dense product, so it's worth being disciplined about from day one.

- **Background:** a near-black slate (not pure `#000000`, which reads harshly against long reading sessions) as the base canvas.
- **Surface elevation:** panels sit on progressively lighter layers (base → panel → raised card → modal), giving depth without needing heavy borders — this is also what makes the glassmorphism effect (PRD Design Philosophy) read correctly: a subtle translucency + blur only works when there's a visible layer *beneath* it to blur.
- **Accent (interactive/brand):** a vivid blue-violet, used for primary buttons, links, and active-tab indicators.
- **Reserved green:** current-directory highlight only.
- **Semantic teal:** success/correct/confirmation states.
- **Semantic amber:** warnings, destructive-action confirmations.
- **Semantic red:** errors, failed commands, delete animations.

**Typography — a two-font system**, deliberately mirroring how professional code editors separate UI chrome from code content:
- A clean, humanist sans-serif for all UI text (navigation, buttons, explanations, quiz text) — optimized for readability during instructional reading.
- A monospace font for anything representing actual Linux content (terminal text, filenames, file contents, command syntax in the autocomplete dropdown) — this isn't just aesthetic; monospacing is load-bearing for a product teaching command-line syntax, since it's how real terminals render and beginners need to see the real shape of things.

**Spacing:** a base 4px unit, with an 8px rhythm for most component padding/margins — keeps every screen feeling like the same product rather than independently designed pages.

**Iconography:** a single consistent icon set covering file types (folder, text file, image, symlink), command categories, and badge categories — never mixing icon styles between panels, which would undercut the "everything is synchronized" premise at a visual level.

**Core component primitives** (reused across every screen below, defined once):
- **Button** — primary (filled, accent color), secondary (outlined), ghost (text-only), destructive (amber/red outline, requires the confirmation pattern from the API/Architecture documents whenever it triggers an irreversible action).
- **Card** — a raised-surface container with consistent corner radius and padding, used for tracks, badges, settings sections.
- **Modal/Dialog** — centered overlay, background-dimmed, used for confirmations, quiz questions, and completion celebrations.
- **Toast** — a transient, non-blocking notification (e.g., "Command executed," "Badge unlocked") — used sparingly, since a product this visually busy shouldn't add unnecessary transient noise on top of the animations already carrying most feedback.
- **Tooltip** — used for hint previews, command flag explanations, and locked-badge unlock criteria.
- **Progress indicator** — both a linear bar (XP-to-next-level, lesson step progress) and a circular ring (streak, track completion percentage on a card).

---

## 1. Landing Page

**Purpose:** Convert a first-time visitor, demonstrating the "see Linux, don't just read it" premise *before* asking for a signup — this is the single highest-leverage screen for the product's core thesis, so it needs to show, not tell.

```
┌────────────────────────────────────────────────────────────────┐
│  [Logo]                              Features  Pricing  Log In │  ← Nav bar
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│   See Linux.                     ┌──────────────────────────┐  │
│   Don't just type it.            │  home/                    │  │
│                                   │   └─ 📁 projects  [typed:  │  │
│   The first Linux course that     │       mkdir website]     │  │
│   shows you what every            │       └─ 📁 website ✨    │  │  ← Live looping
│   command actually does.          │           (grows in)      │  │    mini-demo
│                                   └──────────────────────────┘  │
│   [ Get Started Free ]  [ Watch a 30-second demo ]              │
│                                                                  │
├────────────────────────────────────────────────────────────────┤
│   ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌────────────┐  │
│   │ Visual FS │  │  AI Tutor │  │ Structured │  │ Gamified   │  │  ← Feature grid
│   │  panel    │  │           │  │  Lessons   │  │ Progress   │  │
│   └───────────┘  └───────────┘  └───────────┘  └────────────┘  │
├────────────────────────────────────────────────────────────────┤
│                          Footer / links                         │
└────────────────────────────────────────────────────────────────┘
```

**Components:**
- **NavBar** — logo, marketing links, Log In / Get Started buttons (unauthenticated variant of the nav used elsewhere).
- **HeroDemoWidget** — a small, self-contained, looping animation of the actual Filesystem/Terminal engine running a short scripted sequence (e.g., `mkdir` → `touch` → `mv`) on a fake demo directory. Critically, this is a **read-only, non-interactive loop** on desktop by default (so it can't be broken by a visitor and always looks polished), with an optional "Try it yourself" toggle that swaps in the real, limited interactive engine for visitors who want to type a command themselves before signing up.
- **FeatureCard** (×4) — icon, short headline, one sentence, no signup wall.
- **CTAButtons** — primary ("Get Started Free") and secondary (demo video/interactive toggle).

**Responsive:** Below tablet width, the hero splits into a vertical stack — headline and CTAs first, demo widget below (visitors decide to keep scrolling based on the promise in text, then see the proof) — and the demo widget switches to a lighter, pre-rendered animation loop rather than the live engine, to keep mobile load times fast.

---

## 2. Dashboard

**Purpose:** The answer to "what do I do right now" — every returning user's home screen.

```
┌────────────────────────────────────────────────────────────────┐
│ [Logo]      🔥 12-day streak   ⭐ Level 4   [Avatar ▾]          │  ← TopNav
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Continue: "Lesson 7 — mkdir"           [ Resume Lesson ] │  │  ← ContinueCard
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Your Tracks                                                    │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐         │
│  │ Linux          │ │ Git            │ │ Docker         │       │  ← TrackProgressCard
│  │ Fundamentals   │ │ 🔒 Locked      │ │ 🔒 Locked      │       │    (grid)
│  │ ████████░░ 80% │ │                │ │                │       │
│  └───────────────┘ └───────────────┘ └───────────────┘         │
│                                                                  │
│  ┌───────────────────┐  ┌───────────────────┐                  │
│  │  Practice Mode  →  │  │  Ask AI Tutor  →  │                  │  ← QuickActionCards
│  └───────────────────┘  └───────────────────┘                  │
│                                                                  │
│  Recent Badges  🏅 🏅 🏅  [ View All ]                          │  ← RecentBadgesStrip
└────────────────────────────────────────────────────────────────┘
```

**Components:**
- **TopNav** — persists across nearly every authenticated screen; streak counter, XP/level badge, avatar dropdown (Profile, Settings, Log Out).
- **ContinueCard** — a single, prominent card resuming the user's exact last position (lesson + step), so returning users never have to hunt for where they left off.
- **TrackProgressCard** — progress bar, completion percentage, locked state (grayed, lock icon) for tracks not yet unlocked or not yet released (Git/Docker in future phases, shown here as a roadmap teaser even in MVP — reinforces the product's ambition without overpromising a release date).
- **QuickActionCard** — direct entry points to Practice Mode and the AI Tutor, since not every visit is lesson-driven.
- **RecentBadgesStrip** — small horizontal row of the most recently earned badges, linking to the full Achievements screen.

**Empty state (new user, zero progress):** ContinueCard is replaced with a "Start Lesson 1" prompt; TrackProgressCards show 0% rather than being hidden, so the full curriculum shape is visible from day one.

---

## 3. Lesson Screen (Flagship Screen)

**Purpose:** This is the screen the entire product is built around — five synchronized panels (per the PRD's Main Layout) delivering the "see it happen" experience during structured, sequential learning.

```
┌────────────────────────────────────────────────────────────────────────┐
│ [Logo]  ● ● ○ ○ ○  Explain → Demo → Practice → Quiz → Complete   [Exit] │ ← Nav + Step tracker
├───────────────┬──────────────────────────────┬─────────────────────────┤
│ FILESYSTEM    │  TERMINAL                     │  EXPLANATION            │
│               │                                │                         │
│ 🟢 home/      │  user@visualinux:~$ mkdir      │  mkdir                  │
│  └─📁 projects│  project                       │  Creates a new,         │
│     └─📁 site │                                │  empty directory.       │
│               │  ▊                             │                         │
│               │                                │  [ Animated diagram ]   │
│               │                                │                         │
│               │                                │  💡 Hint (1 of 3)      │
│               │                                │  🤖 Ask AI Tutor        │
├───────────────┴──────────────────────────────┴─────────────────────────┤
│  ▾ Output Console:  ✓ Directory 'project' created in home/              │ ← Output Console
└──────────────────────────────────────────────────────────────────────---┘
```

**Panel-by-panel component breakdown:**

**Top bar:**
- **StepTracker** — five segments (Explain/Demo/Practice/Quiz/Complete), current step filled, completed steps checked, upcoming steps dimmed. Gives the learner a constant sense of "how much of this lesson is left," addressing a common source of tutorial fatigue.
- **ExitButton** — returns to Dashboard; auto-saves progress at the current step (never a "are you sure you want to lose progress" dialog, since nothing is ever lost).

**Filesystem Panel (left):**
- **TreeNode** — recursive component: expand/collapse chevron (only shown if the node has children), type icon, name, and — critically — the **current-directory marker**, which is never color alone: a small green dot/chip *and* a "you are here" label-on-hover, satisfying the accessibility requirement that current-location is never conveyed by color alone.
- **NodeCreateAnimation** — new nodes scale in from 0 with a slight overshoot (a satisfying "pop"), rather than simply appearing.
- **NodeDeleteAnimation** — fades and collapses its allotted vertical space simultaneously, so the tree reflows smoothly rather than leaving a gap then jumping.

**Terminal Panel (center):**
- **PromptLine** — styled exactly like a real Ubuntu prompt (`user@visualinux:~/current/path$`), reinforcing authenticity.
- **CommandInput** — monospace, syntax-aware highlighting (command name, flags, arguments each styled distinctly as the user types).
- **AutocompleteDropdown** — appears below the cursor as the user types; each row shows icon + command name + one-line description + example usage + difficulty pill + category tag (per PRD FR-5.2) — deliberately information-dense here since this dropdown *is* one of the primary teaching surfaces, not just a typing shortcut.
- **HistoryScrollback** — prior commands and their output, scrollable, styled to distinguish user input from system output at a glance (input in accent color, output in neutral).
- **DestructiveConfirmModal** — triggered by a recognized destructive command in Beginner Mode (API §9); plain-language description of the consequence, with explicit Confirm/Cancel buttons rather than a single dismissible toast, since this decision should never be accidental.

**Explanation Panel (right):**
- **StepHeader** — icon + the current concept's name (e.g., "mkdir").
- **BodyText** — plain-language explanation, written at the reading level appropriate to Beginner Mode.
- **InlineAnimationLoop** — a small, self-contained looping diagram illustrating the concept abstractly (separate from the live Filesystem Panel, useful for reinforcing the idea even before the user has typed anything).
- **HintButton** — shows current hint level (e.g., "1 of 3"); tapping again escalates (nudge → partial reveal → full worked example per the Learning Engine design), each escalation visually distinct so the user always knows how much help they've asked for.
- **AskAIButton** — a direct, context-aware entry into the AI Tutor panel (Section 6), pre-filled with the current step's context so the user doesn't have to explain where they are.

**Output Console (bottom, collapsible drawer):**
- **ResultSummaryBanner** — a friendly, structured one-line summary distinct from raw terminal text ("✓ Directory 'project' created in home/"), giving beginners a plain-language confirmation layered on top of the authentic (but less immediately parseable) raw terminal output above it.
- **WarningBanner** — same component, amber-styled, for non-blocking issues.

**Quiz overlay (modal, appears at the Quiz step):**
- **QuizModal** — question text, answer input (radio group for multiple-choice, text input for predict-output/fill-command), Submit button. A wrong answer shows inline feedback and an explanation *without* closing the modal — the learner isn't punished by having to re-navigate back into a quiz after a miss.

**Completion screen (modal, appears at the Complete step):**
- **CompletionModal** — celebratory animation (confetti-style burst, restrained rather than gaudy), XP-awarded counter animating upward, any newly unlocked badge shown with its own reveal animation, and the two required actions side by side: **Practice Again** (secondary button) and **Next Lesson** (primary button) — deliberately equal visual weight rather than steering the user toward "Next," since the PRD is explicit that the learner controls their own pace.

---

## 4. Practice Screen

**Purpose:** The same underlying Filesystem/Terminal/Explanation engine as the Lesson Screen (consistent with the Architecture Document's principle of one shared engine, two consuming contexts), but reconfigured for open-ended exploration rather than a scripted sequence.

```
┌────────────────────────────────────────────────────────────────────────┐
│ [Logo]   Practice Mode                    [ Reset Sandbox ]   [ Exit ] │
├───────────────┬──────────────────────────────┬─────────────────────────┤
│ FILESYSTEM    │  TERMINAL                     │  COMMAND REFERENCE       │
│  (same as     │  (same as Lesson Screen)      │  🔍 Search commands...   │
│   Lesson      │                                │  📁 Filesystem (12)     │
│   Screen)     │                                │  📄 Text (8)            │
│               │                                │  🔐 Permissions (5)     │
└───────────────┴──────────────────────────────┴─────────────────────────┘
```

**Key differences from the Lesson Screen:**
- The **Explanation Panel is replaced by a Command Reference Drawer** — a searchable, category-filtered list of every command (backed directly by the `GET /commands` endpoint), since there's no scripted lesson step driving what's explained. Selecting a command from this list pins its detail card (icon, description, example, flags) at the top of the drawer, satisfying the PRD's "enter Practice Mode focused on a specific command" requirement without needing a separate screen.
- **ResetSandboxButton** — prominent in the top bar (not buried in a menu), using the destructive-action button style, with the same confirm-before-acting pattern used everywhere else. This prominence is deliberate: a user who's made a mess experimenting needs the escape hatch to be obvious, or the sandbox stops feeling safe to explore.
- No StepTracker, no Quiz/Completion modals — practice has no defined "done" state.

---

## 5. Terminal Screen (Focus Mode)

**Purpose:** Rather than a separate route, this is a **layout state** available from within the Lesson or Practice Screen — the Advanced Mode / power-user configuration that maximizes terminal space, since experienced users (the Amara and Sam personas from the PRD) want less UI in their way, not a different product.

```
┌────────────────────────────────────────────────────────────────────────┐
│ [Logo]                                          [ Exit Focus Mode ]    │
├───────┬──────────────────────────────────────────────────────────────-┤
│ 🟢    │  user@visualinux:~/projects/website$ ls -la                   │
│ home/ │  drwxr-xr-x  index.html  style.css  ...                       │
│  ...  │                                                                │
│(mini) │  user@visualinux:~/projects/website$ ▊                        │
└───────┴──────────────────────────────────────────────────────────────-┘
```

**Behavior:** Toggled via a persistent control available on both the Lesson and Practice screens. The Explanation Panel and Output Console collapse entirely; the Filesystem Panel shrinks to a **minimal always-visible strip** rather than disappearing completely — even power users still benefit from never losing the "where am I" signal, so it's never fully removed, only minimized. Animation speed defaults faster in this mode (per the PRD's Advanced Mode requirement), and hint/AI-tutor affordances are hidden by default (still reachable via a small icon, not removed from the product, just deprioritized visually).

---

## 6. AI Tutor

**Purpose:** Always-available, context-aware help, accessible from literally any screen without losing place in a lesson or practice session.

**Entry point:** A persistent floating action button (bottom-right corner on every authenticated screen), showing a small badge if there's an unread proactive tip.

**Expanded state — slide-out panel (desktop) / full-screen takeover (mobile):**

```
┌───────────────────────────────┐
│  AI Tutor              [ ✕ ] │
├───────────────────────────────┤
│  📜 Past conversations  ▾     │
├───────────────────────────────┤
│                                │
│           ┌─────────────────┐│
│           │ Why did my mkdir││  ← User bubble (right-aligned)
│           │ fail?           ││
│           └─────────────────┘│
│  ┌─────────────────────────┐  │
│  │ Looking at your last     │  │  ← AI bubble (left-aligned)
│  │ command, the folder      │  │
│  │ 'project' already        │  │
│  │ exists in this directory.│  │
│  └─────────────────────────┘  │
│                                │
│  [Quiz-guided mode: ON] 🎓    │  ← shown only during active quiz steps
├───────────────────────────────┤
│  [Explain this error] [chmod  │  ← QuickActionChips
│   vs chown?]                  │
│  Type your question...   [→] │  ← MessageInput
└───────────────────────────────┘
```

**Components:**
- **ConversationThread** — chat-bubble layout, user right-aligned, assistant left-aligned.
- **StreamingResponseIndicator** — an animated ellipsis while tokens stream in (matches the SSE streaming behavior from the API design) — deliberately shows partial text arriving rather than a blank loading spinner, since watching the answer form feels faster and more transparent.
- **GuidedModeBadge** — a small, clearly visible label shown only when the server-side quiz guardrail (API §11) is active, so the learner understands *why* they're getting a nudge instead of a direct answer, rather than perceiving the AI as evasive.
- **QuickActionChips** — one-tap common questions, including the direct "Explain this error" action tied to the user's last command.
- **ConversationHistoryList** — collapsed by default, expandable to revisit past conversations.

---

## 7. Settings Screen

```
┌────────────────────────────────────────────────────────────────┐
│  Settings                                                        │
├────────────────────────────────────────────────────────────────┤
│  Account                                                         │
│   Email: user@example.com                    [ Change Password ]│
│                                                                    │
│  Experience                                                       │
│   Mode:  ( ) Beginner   (•) Advanced                              │
│   Animation speed:  Slow ──●──── Fast                             │
│   [ ] Reduce motion                                               │
│                                                                    │
│  Notifications                                                    │
│   [x] Daily streak reminders                                      │
│                                                                    │
│  Language                                                         │
│   English ▾  (more languages coming soon)                         │
│                                                                    │
│  Danger Zone                                                      │
│   [ Delete Account ]                                              │
└────────────────────────────────────────────────────────────────┘
```

**Components:** grouped **SettingsSectionCard**s, each containing standard form primitives (radio group for mode, slider for animation speed, toggle switches for boolean preferences, disabled-with-tooltip dropdown for language). **DangerZoneSection** is visually separated (more spacing, subdued warning-colored border) and its action requires the same confirm-before-acting modal pattern used for destructive terminal commands — consistency across the whole product, not just within the terminal.

---

## 8. Profile Screen

```
┌────────────────────────────────────────────────────────────────┐
│   [Avatar]   DisplayName                                        │
│              Level 4 · Joined March 2026                         │
├────────────────────────────────────────────────────────────────┤
│   🔥 12       ⭐ 2,450 XP      📜 1 Certificate                  │
│   Streak      Total                                              │
├────────────────────────────────────────────────────────────────┤
│   Badges                                                          │
│   🏅 🏅 🏅 🏅 ⚪ ⚪ ⚪                                             │
├────────────────────────────────────────────────────────────────┤
│   Certificates                                                    │
│   ┌──────────────────────────────┐                               │
│   │ Linux Fundamentals — Issued   │  [ View ]  [ Share ]         │
│   │ March 2026                    │                               │
│   └──────────────────────────────┘                               │
└────────────────────────────────────────────────────────────────┘
```

**Components:** **ProfileHeader** (avatar, name, level, join month — coarse join date per the API's privacy-conscious public-profile design), **StatsSummaryRow** (streak/XP/certificate counts as quick-glance stat chips), **BadgeShowcaseGrid** (earned badges in color, unearned shown as dimmed silhouettes — visible but clearly locked, which itself motivates completion), **CertificateCard** (view + share actions, share generating the public verification-code link).

**Distinction between own profile and viewing another user's:** own profile includes an Edit button and full settings access; another user's public profile (reached via the Leaderboard) shows only the fields the API's public-profile endpoint returns — no email, no account status, nothing beyond what's meant to be shareable.

---

## 9. Achievements Screen

```
┌────────────────────────────────────────────────────────────────┐
│  Achievements        [ All ] [ Skill ] [ Streak ] [ Challenge ] │  ← FilterTabs
├────────────────────────────────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                    │
│  │  🏅    │ │  🏅    │ │  ⚪    │ │  ⚪    │                    │
│  │Filesys.│ │7-day   │ │Perm.   │ │30-day  │                    │
│  │Basics  │ │Streak  │ │Master  │ │Streak  │  ← BadgeCard grid  │
│  │Earned  │ │Earned  │ │Locked  │ │Locked  │                    │
│  └────────┘ └────────┘ └────────┘ └────────┘                    │
├────────────────────────────────────────────────────────────────┤
│  Certificates                                                     │
│  [ Same CertificateGallery component as Profile Screen ]          │
└────────────────────────────────────────────────────────────────┘
```

**Components:** **FilterTabs** (category filter, backed by the badge catalog's `category` field from the Database Design), **BadgeCard** — earned state shows full color + earned date; locked state shows a grayscale silhouette **plus a tooltip on hover/tap revealing the unlock criteria in plain language** (e.g., "Complete 7 lessons in a row without missing a day") — turning the locked state into a motivator rather than a dead end.

---

## 10. Leaderboard Screen

```
┌────────────────────────────────────────────────────────────────┐
│  Leaderboard              [ This Week ] [ All Time ]             │  ← PeriodToggle
├────────────────────────────────────────────────────────────────┤
│              🥈           🥇           🥉                        │
│           [Avatar]     [Avatar]     [Avatar]                     │  ← PodiumTop3
│           1,800 XP     2,100 XP     1,650 XP                     │
├────────────────────────────────────────────────────────────────┤
│   4   [Avatar]  Alex_dev            1,400 XP                     │
│   5   [Avatar]  ritika_codes        1,290 XP                      │  ← LeaderboardRow list
│   6   [Avatar]  You                 1,180 XP    ← highlighted    │
│   ...                                                              │
├────────────────────────────────────────────────────────────────┤
│  📍 Your rank: #6 — 220 XP to #5                                  │  ← StickyUserRankBar
└────────────────────────────────────────────────────────────────┘
```

**Components:** **PeriodToggle** (Weekly/All-Time, matching the API's `period` parameter), **PodiumTop3** (visually elevated treatment for ranks 1–3), **LeaderboardRow** (rank, avatar, display name, XP — the current user's own row always visually highlighted even when it appears naturally in the list), **StickyUserRankBar** — pinned to the bottom of the viewport regardless of scroll position, so a user ranked far down the list (e.g., #340) still always sees their own standing and, motivationally, exactly how far to the next rank — without that requiring scrolling through hundreds of rows.

---

## 11. Admin Screens

**Purpose:** An entirely separate application shell for internal content/engineering staff — deliberately *not* styled as a variant of the learner-facing product, both to reinforce (per the API Design's authorization note) that this is a different trust boundary, and because the information density needs of content management are simply different from a beginner-friendly learning UI.

```
┌────────────────────────────────────────────────────────────────┐
│ VisuaLinux Admin     Tracks | Lessons | Commands | Users | Stats│  ← AdminSidebarNav (top, here shown horizontal)
├────────────────────────────────────────────────────────────────┤
│  Lessons                                          [ + New ]     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Title            Track       Status     Version  ⋮      │    │
│  │ mkdir basics      Fundamentals Published   v3    ⋮      │    │  ← DataTable
│  │ chmod deep-dive   Fundamentals Draft       v1    ⋮      │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────┘
```

**Components:**
- **AdminSidebarNav** — Tracks / Lessons / Commands / Users / Analytics sections.
- **DataTable** — sortable, filterable, paginated (matching the cursor-pagination convention from the API design) — reused across Lessons, Commands, and Users listings rather than building a bespoke table per section.
- **ContentEditorForm** — a deliberately **structured, type-aware form**, not a raw JSON textarea, even though the underlying `lesson_steps.content` field is JSONB (Database Design §3). Each `step_type` renders its own tailored set of fields (an "explain" step shows a rich-text body field; a "quiz" step shows question/choices fields with an inline "mark correct answer" control). *This is a deliberate design decision protecting the backend's schema flexibility from becoming a content-team usability and error-rate problem* — the database can store varied shapes freely, while the humans editing it never have to think about JSON structure directly.
- **PublishBar** — shows draft vs. published version state, with an explicit "Publish" action (matching the API's separate `/publish` endpoint) rather than auto-publishing on save, so content-team edits can be safely drafted without going live prematurely.
- **AnalyticsChartCard** — simple bar/line charts for lesson completion rate and AI usage, sourced from the decoupled analytics pipeline per the Architecture Document.

---

## 12. Responsive Design

Three breakpoints, with the five-panel Lesson/Practice layout as the hardest case (everything else degrades more simply):

- **Desktop (>1024px):** full five-panel layout as designed above — Filesystem, Terminal, Explanation all simultaneously visible, Output Console as a collapsible drawer.
- **Tablet (640–1024px):** Filesystem and Terminal remain the primary side-by-side view (the two panels most essential to the core "type it, see it" loop); Explanation and Output Console become **swipeable/tappable drawers** rather than fixed columns, so screen width goes to the two panels that matter most moment-to-moment.
- **Mobile (<640px):** a genuinely different interaction pattern — a **persistent bottom tab bar** (Terminal / Filesystem / Explain), one panel visible at a time. Critically, a **small persistent "current directory" chip** remains visible in the top bar regardless of which tab is active — so a mobile learner never loses the "where am I" signal just because the Filesystem tab isn't the one currently open. This was flagged as an open design risk earlier in the project and is the concrete resolution: never fully hide the location signal, only the full tree view.

Navigation (TopNav) collapses to a hamburger menu below tablet width across all authenticated screens.

---

## 13. Dark Mode

Dark is the only mode in MVP, per the PRD's explicit design philosophy — but the token system (Section 0) is structured so a future light theme is a token-swap, not a redesign: every component references semantic tokens (`surface.base`, `surface.raised`, `text.primary`) rather than hard-coded colors, so introducing a light theme later means defining one new token set, not touching every screen's component code. This is the same "design for the future trigger without building it prematurely" discipline applied throughout the Architecture and Database documents, now applied at the design-token level.

---

## 14. Animation System

Consolidating every animation behavior referenced across the screens above into one coherent system:

| Action | Visual Treatment |
|---|---|
| Create (mkdir, touch, cp destination) | Scale in from 0 with a slight overshoat/"pop," not a linear grow |
| Delete (rm, rmdir) | Simultaneous fade + collapse of vertical space, so the tree reflows smoothly |
| Move (mv) | Slides along a path from origin to destination, not a cut/instant-reappear |
| Copy (cp) | A duplicate "ghost" peels off the original and settles into place |
| Permission change (chmod) | Icon crossfades to its new permission-state variant |
| Ownership change (chown) | Small owner-avatar element swaps with a quick fade |
| Symlink (ln -s) | A dashed connector line draws itself from the link to its target |
| Current-directory move (cd) | The green marker glides to its new position with a brief pulse on arrival — deliberately the *only* element allowed to use the reserved green, everywhere in the product |

**Timing philosophy:** Beginner Mode uses longer, more legible durations (roughly 500–600ms) so a new user can actually track what happened; Advanced Mode (and Focus/Terminal Mode) uses snappier timing (150–200ms), matching the PRD's requirement that Advanced Mode feel closer to a real terminal.

**Bulk-change staggering:** a command affecting many nodes at once (`rm -r` on a populated folder) fires each node's animation with a small sequential delay rather than all simultaneously — otherwise a beginner sees an instant, confusing bulk disappearance rather than something they can follow.

**Reduced-motion path:** every single animation type above has a defined instant-update equivalent (a brief opacity flash conveying "this changed," with no movement) — driven by the same underlying event stream described in the Architecture Document's Animation Engine, guaranteeing feature parity by construction rather than by separately maintaining two versions of every animation.

---

*End of Document — Version 1.0*
