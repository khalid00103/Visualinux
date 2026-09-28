# Component Hierarchy Design Document

## VisuaLinux — Interactive Visual Linux Learning Platform

| Field | Value |
|---|---|
| Document Version | 1.0 (Draft) |
| Companion Documents | PRD, Architecture, Database Design, API Design, UI/UX Screen Design, Design System (all v1.0) |
| Author | Senior Frontend Engineer |
| Scope | Every component the frontend is built from, its responsibility, its props, and the folder structure it lives in — specification only, no implementation |

---

## 0. Component Architecture Principles

**Container vs. presentational split, strictly enforced.** Every component below is tagged one of three types:
- **Page** — owns data-fetching, composes containers, mapped 1:1 to a route.
- **Container** — owns some local state and/or subscribes to the global store; composes presentational components underneath it.
- **Presentational** — receives everything via props, owns no business logic, easy to reuse and to test in isolation.

This isn't a stylistic preference — it's what makes the "shared engine, two consuming contexts" principle from the Architecture Document actually hold at the component level: the Filesystem Panel's *presentational* tree-rendering components are identical whether they're mounted inside the Lesson Screen or the Practice Screen; only the *container* wrapping them differs in what data it feeds in.

**Three-tier state ownership** (referenced throughout this document as **Global**, **Server Cache**, or **Local**):

| Tier | Owns | Example |
|---|---|---|
| **Global (Session Store)** | Cross-panel state that must stay synchronized the instant it changes — the optimistic filesystem mirror, command history for the active sandbox, current lesson step, animation event queue (Architecture §3) | `currentDirectoryId`, `filesystemMirror`, `pendingAnimationEvents` |
| **Server Cache** | Data fetched from the REST API that benefits from caching/revalidation but isn't part of the synchronized-panel loop | Command registry, lesson content, badge catalog, leaderboard |
| **Local** | State that only one component and its direct children care about | A modal's open/closed flag, a form field's draft value, a dropdown's open state |

Every component's spec below states which tier(s) it reads from and writes to, so it's always clear why a given piece of state lives where it does.

**Composition over prop-drilling for the fan-out problem.** The Architecture Document specifies that one command execution must fan out to four panels simultaneously. Rather than passing the command-execution result down through props at every level, the components that need it (Filesystem Panel, Terminal Panel, Output Console, and the Gamification toast trigger) each subscribe directly to the relevant slice of the Global Session Store. This is why `CommandExecutionOrchestrator` (Section 3) exists as a non-visual container: it's the single place that calls the API and writes the result into the store, and every visual consumer reads from the store independently rather than receiving the result as a passed-down prop.

---

## 1. Full Component Hierarchy (Top-Level Tree)

```
App
├── GlobalProviders            (Session Store, Server Cache client, Theme)
├── Router
│   ├── LandingPage                          [Page, unauthenticated]
│   ├── AuthRoutes
│   │   ├── SignupPage                       [Page]
│   │   └── LoginPage                        [Page]
│   ├── AppShell                             [Container — authenticated learner routes]
│   │   ├── TopNav                           [Presentational]
│   │   ├── MobileBottomTabBar                [Presentational, mobile only]
│   │   ├── DashboardPage                    [Page]
│   │   ├── LessonPage                       [Page]
│   │   ├── PracticePage                     [Page]
│   │   ├── SettingsPage                     [Page]
│   │   ├── ProfilePage                      [Page]
│   │   ├── AchievementsPage                 [Page]
│   │   └── LeaderboardPage                  [Page]
│   └── AdminShell                           [Container — separate trust boundary, own layout]
│       ├── AdminSidebarNav                  [Presentational]
│       ├── AdminTracksPage                  [Page]
│       ├── AdminLessonsPage                 [Page]
│       ├── AdminCommandsPage                [Page]
│       ├── AdminUsersPage                   [Page]
│       └── AdminAnalyticsPage               [Page]
└── AITutorLauncher                          [Container, mounted once, outside the route tree —
                                                persists across every learner-facing screen]
    └── AITutorPanel                         [Container]
```

*Why `AITutorLauncher` sits outside the route tree:* the AI Tutor must be reachable from every screen without losing its own conversation state when the user navigates — mounting it once at the app root rather than per-page is what keeps a conversation alive across a lesson-to-dashboard-and-back navigation.

---

## 2. Layout & Shell Components

### `AppShell`
**Type:** Container
**Responsibility:** The authenticated app's persistent frame — mounts `TopNav`, renders the active page, and mounts `MobileBottomTabBar` conditionally by viewport width.
**Props:** none (root-level container, reads viewport/breakpoint from a shared hook)
**Renders:** `TopNav`, active `Page`, `MobileBottomTabBar` (mobile only)
**State:** Local (current breakpoint, derived from a resize observer hook)

### `TopNav`
**Type:** Presentational
**Responsibility:** Persistent top bar — logo, streak/XP indicators, avatar menu.
**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| displayName | string | Yes | Shown in the avatar menu trigger |
| streakDays | number | Yes | |
| level | number | Yes | |
| onLogout | function | Yes | Callback fired from the avatar menu |
**Renders:** `Avatar` (primitive), `Badge` (primitive, for streak/level)
**State:** Local (avatar dropdown open/closed)

### `MobileBottomTabBar`
**Type:** Presentational
**Responsibility:** Mobile-only tab switcher for the Lesson/Practice screens (Terminal / Filesystem / Explain), with the persistent current-directory chip described in the UI/UX document.
**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| activeTab | enum(terminal, filesystem, explain) | Yes | |
| onTabChange | function | Yes | |
| currentDirectoryLabel | string | Yes | Powers the always-visible location chip, independent of which tab is active |

### `AdminSidebarNav`
**Type:** Presentational
**Responsibility:** Section navigation for the Admin shell — a deliberately distinct navigation pattern from `TopNav`, reinforcing the separate trust boundary (per the API Design's authorization note).
**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| activeSection | enum(tracks, lessons, commands, users, analytics) | Yes | |
| onNavigate | function | Yes | |

### `RouteGuard`
**Type:** Container
**Responsibility:** Wraps authenticated routes; redirects to `LoginPage` if no valid session exists. Wraps Admin routes with an additional platform-admin authorization check (per the API Design's note that admin authorization is a separate mechanism from the customer-facing `role` field).
**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| requiredAuthLevel | enum(learner, platformAdmin) | Yes | |
| children | component | Yes | |
**State:** Server Cache (current session validity)

---

## 3. Core Learning Experience Components (Lesson & Practice Shared Engine)

This is the most important section — these components are shared, unmodified, between the Lesson Screen and Practice Screen, per the Architecture Document's "one engine, two contexts" principle.

### `CommandExecutionOrchestrator`
**Type:** Container (non-visual — renders no DOM of its own)
**Responsibility:** The single place that calls `POST /sandboxes/{id}/commands`, runs the optimistic client-side simulation (Architecture §3), reconciles against the authoritative response, and writes the resulting diff, animation events, and lesson-step result into the Global Session Store. Every visual panel below reads from the store rather than receiving this data as a prop.
**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| sandboxId | string | Yes | |
| onLessonStepComplete | function | No | Only provided when mounted within a lesson context |
**State:** Global (writes `filesystemMirror`, `pendingAnimationEvents`, `commandHistory`)

### `FilesystemPanel`
**Type:** Container
**Responsibility:** Renders the visual filesystem tree, subscribes to the Global Store's filesystem mirror and animation event queue, and triggers the appropriate per-node animation as events arrive.
**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| sandboxId | string | Yes | |
| currentDirectoryId | string | Yes | Drives which node renders the location marker |
**Renders:** `TreeNode` (recursive)
**State:** Global (reads filesystem mirror + animation queue), Local (which nodes are expanded/collapsed)

### `TreeNode`
**Type:** Presentational (recursive)
**Responsibility:** Renders a single filesystem node — icon, name, expand/collapse chevron, and the current-directory marker when applicable. Recurses into its own children.
**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| node | object (id, name, nodeType, permissions) | Yes | |
| children | array\<node\> | No | Empty/absent for files |
| isCurrentDirectory | boolean | Yes | Drives the reserved-green marker (Design System §1.2) |
| isExpanded | boolean | Yes | |
| onToggleExpand | function | Yes | |
| animationState | enum(none, creating, deleting, moving) | No | Drives which Design System animation token plays |

### `CurrentDirectoryMarker`
**Type:** Presentational
**Responsibility:** The small dot + "here" label used exclusively to indicate current location — deliberately its own component (not folded into `TreeNode`'s styling) so the reserved-color rule (Design System §1.2) has exactly one implementation to audit, not one per place it's used.
**Props:** none beyond visibility (a purely presentational marker rendered conditionally by its parent)

### `TerminalPanel`
**Type:** Container
**Responsibility:** Composes the prompt, input, autocomplete, and scrollback; delegates actual command submission to `CommandExecutionOrchestrator`.
**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| sandboxId | string | Yes | |
| experienceMode | enum(beginner, advanced) | Yes | Affects destructive-command confirmation behavior (API §9) |
**Renders:** `PromptLine`, `CommandInput`, `AutocompleteDropdown`, `HistoryScrollback`, `DestructiveConfirmModal`
**State:** Local (current input draft, autocomplete open/closed), Global (reads command history)

### `PromptLine`
**Type:** Presentational
**Responsibility:** Renders the styled `user@visualinux:~/path$` prompt.
**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| currentPath | string | Yes | |

### `CommandInput`
**Type:** Presentational
**Responsibility:** The actual text entry field — syntax-aware highlighting, history navigation (up/down arrow), tab-completion trigger.
**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| value | string | Yes | |
| onChange | function | Yes | |
| onSubmit | function | Yes | |
| onHistoryNavigate | function | Yes | Fired on up/down arrow |
| onTabComplete | function | Yes | |

### `AutocompleteDropdown`
**Type:** Presentational
**Responsibility:** Renders the list of matching commands as the user types, per PRD FR-5.2.
**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| suggestions | array\<{name, iconKey, shortDescription, exampleUsage, difficulty, category}\> | Yes | |
| onSelect | function | Yes | |
| highlightedIndex | number | Yes | For keyboard navigation |
**Renders:** `AutocompleteRow` (repeated)

### `AutocompleteRow`
**Type:** Presentational
**Responsibility:** A single suggestion row — icon, name, description, example, difficulty pill, category tag.
**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| suggestion | object | Yes | |
| isHighlighted | boolean | Yes | |
| onClick | function | Yes | |

### `HistoryScrollback`
**Type:** Presentational
**Responsibility:** Renders prior commands and their output, visually distinguishing input from output.
**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| entries | array\<{rawInput, outputText, success}\> | Yes | |

### `DestructiveConfirmModal`
**Type:** Presentational
**Responsibility:** Confirmation dialog shown before a recognized destructive command executes in Beginner Mode (PRD FR-10.4 / API §9).
**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| isOpen | boolean | Yes | |
| commandText | string | Yes | |
| consequenceDescription | string | Yes | |
| onConfirm | function | Yes | |
| onCancel | function | Yes | Also fired on Esc/outside-click (Design System §9 — never treated as confirmation) |

### `ExplanationPanel`
**Type:** Container
**Responsibility:** Renders the current lesson step's explanation content, hint control, and AI Tutor entry point. Absent/replaced by `CommandReferenceDrawer` in Practice Mode (Section 4).
**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| lessonStepId | string | Yes | |
**Renders:** `StepHeader`, `BodyText`, `InlineAnimationLoop`, `HintButton`, `AskAIButton`
**State:** Server Cache (step content), Global (current hint level)

### `StepHeader`
**Type:** Presentational — icon + concept title (e.g., "mkdir").
**Props:** `iconKey: string`, `title: string`

### `BodyText`
**Type:** Presentational — the plain-language explanation text.
**Props:** `content: string` (rendered from the step's structured content, already parsed by the parent)

### `InlineAnimationLoop`
**Type:** Presentational — a small, self-contained looping diagram of the concept.
**Props:** `animationKey: string` (selects which pre-defined loop to play)

### `HintButton`
**Type:** Presentational
**Responsibility:** Shows current hint level, escalates on repeated taps.
**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| currentLevel | number | Yes | |
| maxLevel | number | Yes | |
| onRequestHint | function | Yes | |

### `AskAIButton`
**Type:** Presentational — opens the `AITutorPanel` pre-filled with the current lesson-step context.
**Props:** `lessonStepId: string`, `onOpen: function`

### `OutputConsole`
**Type:** Container
**Responsibility:** Collapsible drawer showing structured result/warning summaries, distinct from the raw terminal scrollback.
**Props:** none (reads directly from the Global Store's most recent command result)
**Renders:** `ResultSummaryBanner`, `WarningBanner`
**State:** Local (drawer expanded/collapsed), Global (reads latest command result)

### `ResultSummaryBanner` / `WarningBanner`
**Type:** Presentational
**Responsibility:** A single-line, plain-language summary or warning.
**Props:** `message: string`, `iconKey: string`

### `StepTracker`
**Type:** Presentational
**Responsibility:** The five-segment lesson progress indicator (Explain/Demo/Practice/Quiz/Complete).
**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| steps | array\<{stepType, status}\> | Yes | status: upcoming, current, completed |

### `QuizModal`
**Type:** Container
**Responsibility:** Renders the current quiz question, submits answers, shows inline feedback without closing.
**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| lessonStepId | string | Yes | |
| isOpen | boolean | Yes | |
**Renders:** `QuizQuestion`, `QuizChoice` (repeated, for multiple-choice), `QuizFeedback`
**State:** Local (selected answer draft), Server Cache (submission result)

### `QuizQuestion` / `QuizChoice` / `QuizFeedback`
**Type:** Presentational
**Responsibility:** Question text; a single selectable choice; the correct/incorrect explanation shown after submission, respectively.
**Props:** `questionText: string` / `choiceText: string, isSelected: boolean, onSelect: function` / `isCorrect: boolean, explanation: string`

### `CompletionModal`
**Type:** Container
**Responsibility:** The end-of-lesson celebration screen — XP award, badge reveal, and the required Practice Again / Next Lesson choice.
**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| lessonId | string | Yes | |
| xpAwarded | number | Yes | |
| newBadges | array\<badge\> | No | |
| onPracticeAgain | function | Yes | |
| onNextLesson | function | Yes | |
**Renders:** `XPCounter`, `BadgeRevealCard` (repeated if any new badges)

### `XPCounter`
**Type:** Presentational — animates a number counting upward to the awarded XP total.
**Props:** `targetValue: number`

### `BadgeRevealCard`
**Type:** Presentational — a single newly-unlocked badge with its reveal animation.
**Props:** `badge: {iconKey, title, description}`

---

## 4. Practice-Specific Components

### `CommandReferenceDrawer`
**Type:** Container
**Responsibility:** Replaces `ExplanationPanel` in Practice Mode — a searchable, category-filtered command list.
**Props:** none (self-contained; reads from Server Cache)
**Renders:** `CommandSearchInput`, `CommandListItem` (repeated), `PinnedCommandCard`
**State:** Local (search query, active category filter, pinned command), Server Cache (command list)

### `CommandSearchInput`
**Type:** Presentational — a text input filtering the command list.
**Props:** `value: string`, `onChange: function`

### `CommandListItem`
**Type:** Presentational — a single row in the reference list (icon, name, category).
**Props:** `command: object`, `onSelect: function`

### `PinnedCommandCard`
**Type:** Presentational — the detail card for a selected/pinned command (description, example, flags).
**Props:** `command: object` (full detail, including `flags: array`)

### `ResetSandboxButton`
**Type:** Container
**Responsibility:** Triggers the reset confirmation flow and calls `POST /practice/sandbox/reset`.
**Props:** `sandboxId: string`
**Renders:** a shared `ConfirmDialog` primitive (Section 8)
**State:** Local (confirmation dialog open/closed)

### `FocusModeToggle`
**Type:** Container
**Responsibility:** Toggles the Terminal Screen / Advanced Mode layout collapse described in the UI/UX document — collapses `ExplanationPanel`/`OutputConsole` and shrinks `FilesystemPanel` to a minimal strip.
**Props:** `isActive: boolean`, `onToggle: function`
**State:** Local

---

## 5. AI Tutor Components

### `AITutorLauncher`
**Type:** Container
**Responsibility:** The persistent floating action button mounted at the app root; opens `AITutorPanel`.
**Props:** none
**State:** Global (unread-tip badge flag)

### `AITutorPanel`
**Type:** Container
**Responsibility:** The slide-out (desktop) / full-screen (mobile) conversation panel — sends messages, consumes the SSE stream, displays guardrail state.
**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| initialContext | object | No | Pre-filled context when opened via `AskAIButton` or `explain-error` |
**Renders:** `ConversationHistoryList`, `ConversationThread`, `QuickActionChips`, `MessageInput`
**State:** Server Cache (conversation list/history), Local (current draft message, streaming-in-progress flag)

### `ConversationHistoryList`
**Type:** Presentational — collapsed-by-default list of past conversations.
**Props:** `conversations: array<{conversationId, lastMessageAt}>`, `onSelect: function`

### `ConversationThread`
**Type:** Presentational — renders the chat bubbles.
**Props:** `messages: array<{role, content}>`
**Renders:** `MessageBubble` (repeated), `StreamingResponseIndicator` (conditional), `GuidedModeBadge` (conditional)

### `MessageBubble`
**Type:** Presentational — a single chat message, right/left aligned by role.
**Props:** `role: enum(user, assistant)`, `content: string`

### `StreamingResponseIndicator`
**Type:** Presentational — the animated ellipsis shown while tokens stream in.
**Props:** none

### `GuidedModeBadge`
**Type:** Presentational — shown only when the server-side quiz guardrail is active (API §11), so the learner understands why answers are hint-based.
**Props:** `isActive: boolean`

### `QuickActionChips`
**Type:** Presentational — one-tap common questions.
**Props:** `chips: array<{label, prefillText}>`, `onSelect: function`

### `MessageInput`
**Type:** Presentational — the text entry + send button.
**Props:** `value: string`, `onChange: function`, `onSend: function`, `isSending: boolean`

---

## 6. Dashboard Components

### `ContinueCard`
**Type:** Presentational — resumes the user's last position.
**Props:** `lessonTitle: string`, `stepLabel: string`, `onResume: function`

### `TrackProgressCard`
**Type:** Presentational
**Props:** `trackTitle: string`, `progressPercent: number`, `isLocked: boolean`, `onSelect: function`

### `QuickActionCard`
**Type:** Presentational — entry points to Practice Mode / AI Tutor.
**Props:** `iconKey: string`, `label: string`, `onClick: function`

### `RecentBadgesStrip`
**Type:** Presentational
**Props:** `badges: array<badge>`, `onViewAll: function`

### `StreakWidget`
**Type:** Presentational — the streak calendar/ring visualization.
**Props:** `currentStreak: number`, `longestStreak: number`

---

## 7. Settings, Profile, Achievements, Leaderboard Components

### `SettingsSectionCard`
**Type:** Presentational — a grouped settings section wrapper.
**Props:** `title: string`, `children: component`

### `DangerZoneSection`
**Type:** Container — the account-deletion section, using the shared `ConfirmDialog` primitive.
**Props:** `onDeleteAccount: function`

### `ProfileHeader`
**Type:** Presentational
**Props:** `avatarUrl: string`, `displayName: string`, `level: number`, `joinedMonth: string`

### `StatsSummaryRow`
**Type:** Presentational — streak/XP/certificate quick-glance stats.
**Props:** `stats: array<{iconKey, label, value}>`

### `BadgeShowcaseGrid`
**Type:** Presentational
**Props:** `badges: array<{iconKey, title, earned: boolean}>`

### `CertificateCard` / `CertificateGallery`
**Type:** Presentational
**Props:** `certificate: {trackTitle, issuedAt, verificationCode}` / `certificates: array<certificate>`

### `FilterTabs`
**Type:** Presentational (shared — used on Achievements screen)
**Props:** `tabs: array<string>`, `activeTab: string`, `onChange: function`

### `PeriodToggle`
**Type:** Presentational (Leaderboard) — Weekly/All-Time switch.
**Props:** `period: enum(weekly, all_time)`, `onChange: function`

### `PodiumTop3`
**Type:** Presentational
**Props:** `topThree: array<{rank, displayName, avatarUrl, xp}>`

### `LeaderboardRow`
**Type:** Presentational
**Props:** `rank: number`, `displayName: string`, `xp: number`, `isCurrentUser: boolean`

### `StickyUserRankBar`
**Type:** Presentational — pinned bottom bar showing the current user's own rank regardless of scroll.
**Props:** `rank: number`, `xpToNextRank: number`

---

## 8. Admin Components

### `DataTable`
**Type:** Presentational (shared — used for Lessons/Commands/Users listings, per Design System §10)
**Props:**
| Prop | Type | Required | Description |
|---|---|---|---|
| columns | array\<{key, label, sortable}\> | Yes | |
| rows | array\<object\> | Yes | |
| onSort | function | No | |
| onLoadMore | function | Yes | Cursor-based, per API Design's pagination convention |
| hasMore | boolean | Yes | |

### `ContentEditorForm`
**Type:** Container
**Responsibility:** A structured, type-aware form for editing lesson step content — deliberately not a raw JSON editor (Design System §11 / UI/UX §11), rendering different field sets per `stepType`.
**Props:** `lessonStepId: string`, `stepType: enum(explain, demo, practice, quiz, complete)`
**State:** Local (draft field values), Server Cache (saved content)

### `PublishBar`
**Type:** Presentational — shows draft vs. published version state with an explicit Publish action.
**Props:** `draftVersion: number`, `publishedVersion: number`, `onPublish: function`

### `AnalyticsChartCard`
**Type:** Presentational — wraps a bar/line chart for lesson-completion or AI-usage analytics.
**Props:** `title: string`, `chartData: object`, `chartType: enum(bar, line)`

---

## 9. Shared Primitive Component Library (Design System Components)

Every component above is built from this set — these map directly to Design System Sections 7–13.

| Primitive | Type | Key Props |
|---|---|---|
| `Button` | Presentational | `variant: enum(primary, secondary, ghost, destructive)`, `size: enum(sm, md, lg)`, `iconKey?: string`, `isLoading?: boolean`, `isDisabled?: boolean`, `onClick: function` |
| `Card` | Presentational | `variant: enum(content, stat, progress)`, `children: component` |
| `Modal` | Presentational | `isOpen: boolean`, `onClose: function`, `size: enum(sm, md, lg)`, `dismissOnOutsideClick: boolean` (false for destructive/quiz modals per Design System §9) |
| `ConfirmDialog` | Presentational (built on `Modal`) | `title: string`, `message: string`, `confirmLabel: string`, `severity: enum(standard, destructive)`, `onConfirm: function`, `onCancel: function` |
| `Toast` | Presentational | `message: string`, `variant: enum(success, error)`, `durationMs: number` |
| `Tooltip` | Presentational | `content: string`, `trigger: component` |
| `ProgressBar` | Presentational | `percent: number`, `label?: string` |
| `ProgressRing` | Presentational | `percent: number`, `size: number` |
| `Badge` / `Pill` | Presentational | `label: string`, `variant: enum(neutral, accent, success, warning)` |
| `Avatar` | Presentational | `imageUrl?: string`, `initials: string`, `size: enum(sm, md, lg)` |
| `TextInput` | Presentational | `value: string`, `onChange: function`, `error?: string`, `label: string` |
| `ToggleSwitch` | Presentational | `isOn: boolean`, `onToggle: function`, `label: string` |
| `RadioGroup` | Presentational | `options: array<{value, label}>`, `selected: string`, `onChange: function` |
| `Slider` | Presentational | `value: number`, `min: number`, `max: number`, `onChange: function`, `showValueLabel: boolean` |
| `Dropdown` | Presentational | `options: array<{value, label}>`, `selected: string`, `onChange: function`, `isDisabled?: boolean`, `disabledReason?: string` |

---

## 10. Reusable Component Matrix

Cross-referencing which shared components appear on which screens — the practical evidence that the "reusable primitives" principle from the Design System document is actually load-bearing, not just a stated intent:

| Component | Used On |
|---|---|
| `FilesystemPanel`, `TreeNode` | Lesson Screen, Practice Screen (identical component, different container feeding it) |
| `TerminalPanel`, `CommandInput`, `AutocompleteDropdown` | Lesson Screen, Practice Screen, Terminal/Focus Mode |
| `Button`, `Card`, `Modal`, `ConfirmDialog` | Every screen in the application |
| `DataTable` | AdminLessonsPage, AdminCommandsPage, AdminUsersPage |
| `Badge`/`Pill` | TopNav (streak/level), Achievements (badge state), Command autocomplete (difficulty/category), Landing page feature cards |
| `ProgressBar` | TrackProgressCard, StepTracker (conceptually), QuizModal feedback |
| `Tooltip` | Locked badge criteria, command flag descriptions, disabled Dropdown reasons, HintButton previews |
| `ConversationThread`-style bubble pattern | AI Tutor only — deliberately not reused elsewhere, since no other part of the product has a chat metaphor |

---

## 11. Folder Structure (Frontend Application)

Extending the monorepo layout from the Architecture Document (§20) with the frontend's internal structure fully specified:

```
apps/web/
├── src/
│   ├── pages/                       # One file per Page-type component, mapped to routes
│   │   ├── LandingPage/
│   │   ├── DashboardPage/
│   │   ├── LessonPage/
│   │   ├── PracticePage/
│   │   ├── SettingsPage/
│   │   ├── ProfilePage/
│   │   ├── AchievementsPage/
│   │   ├── LeaderboardPage/
│   │   └── admin/
│   │       ├── AdminTracksPage/
│   │       ├── AdminLessonsPage/
│   │       ├── AdminCommandsPage/
│   │       ├── AdminUsersPage/
│   │       └── AdminAnalyticsPage/
│   │
│   ├── components/
│   │   ├── layout/                  # AppShell, TopNav, MobileBottomTabBar, AdminSidebarNav, RouteGuard
│   │   ├── filesystem/              # FilesystemPanel, TreeNode, CurrentDirectoryMarker
│   │   ├── terminal/                # TerminalPanel, PromptLine, CommandInput, AutocompleteDropdown, HistoryScrollback
│   │   ├── explanation/             # ExplanationPanel, StepHeader, BodyText, HintButton, AskAIButton
│   │   ├── lesson/                  # StepTracker, QuizModal, CompletionModal, CommandExecutionOrchestrator
│   │   ├── practice/                # CommandReferenceDrawer, ResetSandboxButton, FocusModeToggle
│   │   ├── ai-tutor/                # AITutorLauncher, AITutorPanel, ConversationThread, MessageBubble
│   │   ├── dashboard/               # ContinueCard, TrackProgressCard, QuickActionCard, StreakWidget
│   │   ├── settings/                # SettingsSectionCard, DangerZoneSection
│   │   ├── profile/                 # ProfileHeader, StatsSummaryRow, BadgeShowcaseGrid, CertificateGallery
│   │   ├── leaderboard/             # PeriodToggle, PodiumTop3, LeaderboardRow, StickyUserRankBar
│   │   ├── admin/                   # DataTable, ContentEditorForm, PublishBar, AnalyticsChartCard
│   │   └── primitives/              # Button, Card, Modal, ConfirmDialog, Toast, Tooltip, ProgressBar,
│   │                                 # ProgressRing, Badge, Avatar, TextInput, ToggleSwitch, RadioGroup,
│   │                                 # Slider, Dropdown  — the Design System's component library
│   │
│   ├── store/                       # Global Session Store (Zustand) — filesystem mirror, command history,
│   │                                 # current lesson step, animation event queue
│   ├── api/                         # Server Cache layer — typed client wrapping every endpoint from the
│   │                                 # API Design document, one module per domain (auth, lessons, commands, etc.)
│   ├── hooks/                       # Shared hooks — useBreakpoint, useCommandExecution, useReducedMotion
│   ├── styles/
│   │   └── tokens/                  # Design System tokens as the shared source of truth (colors, spacing,
│   │                                 # typography, motion) — consumed by every component in components/
│   └── utils/
│
└── (shared packages, per Architecture §20)
    ../../packages/shared-types       # Command schema, animation event schema — imported here and by the API
    ../../packages/command-registry   # Data-driven command definitions — imported here for the optimistic
                                       # client-side simulation described in Architecture §3
```

*Why `components/` is organized by domain, not by atomic/molecule/organism abstraction level:* a developer looking for "everything related to the filesystem panel" should find one folder, not have to reason about whether `TreeNode` is an "atom" or a "molecule." Domain-based organization mirrors how the rest of this document (and every companion document) is organized — by feature area — which keeps the whole project's mental model consistent from PRD through to folder structure.

---

## 12. Naming & Composition Conventions

- **PascalCase** for every component name; one component per file, file name matches component name.
- **Suffix conventions carry meaning:** `*Panel` (a major synchronized region — Filesystem/Terminal/Explanation/Output), `*Modal` (an overlay requiring dismissal), `*Card` (a bounded content block), `*Row` (a single item in a list/table), `*Drawer` (a collapsible side panel).
- **Container components are never named identically to the presentational component they wrap** — e.g., `CommandExecutionOrchestrator` (container) vs. `TerminalPanel` (container, but composing purely presentational children) vs. `CommandInput` (presentational) — the naming itself signals where logic lives, without needing to open the file to find out.
- **No default exports** — every component is a named export, so cross-file references and refactors stay unambiguous, and barrel (`index`) files re-export explicitly rather than via wildcard, keeping it clear exactly what's part of a domain folder's public surface versus internal helper components.

---

*End of Document — Version 1.0*
