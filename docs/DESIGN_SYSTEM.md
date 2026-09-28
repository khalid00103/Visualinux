# Design System

## VisuaLinux — Interactive Visual Linux Learning Platform

| Field | Value |
|---|---|
| Document Version | 1.0 (Draft) |
| Companion Documents | PRD, Architecture, Database Design, API Design, UI/UX Screen Design (all v1.0) |
| Author | Senior UI/UX Designer |
| Scope | Every visual and interaction primitive the product is built from — colors, type, spacing, motion, icons, and every core component — expressed as a token/rule specification, no implementation code |
| Note on precision | Hex values, contrast ratios, and durations below represent design intent, sized to be AA-compliant by construction. They must still be verified with a contrast-checking tool at implementation time — this document sets the target, not the final measured word |

---

## 0. Purpose & Principles

A design system exists so that "does this look and feel like VisuaLinux" has one answer, checkable against a token, rather than a matter of individual taste on every screen. Three principles govern everything below, extending the ones already set in the UI/UX Screen Design document:

1. **One token, one meaning, everywhere.** The clearest example already established: the bright green used for the current-directory highlight is never reused for "success," "correct," or any other state, anywhere in the product. This document exists partly to make that discipline enforceable — a token registry, not a suggestion.
2. **Restraint over options.** One primary (filled) button per screen. One accent color for interactive elements. Two font weights, not six. Fewer decisions available at each design/build moment means fewer ways for two screens to quietly drift apart from each other over time.
3. **Every rule has an accessibility floor, not an accessibility afterthought.** Contrast, motion, and color-independence requirements are stated as part of each token's definition below, not bolted on in a separate checklist at the end (though Section 14 does consolidate them for reference).

---

## 1. Color System

### 1.1 Neutral surfaces (dark mode — the only shipped mode in MVP)

| Token | Approx. Hex | Usage |
|---|---|---|
| `surface-0` | `#0B0E14` | Page canvas / app background |
| `surface-1` | `#12161F` | In-flow panels (Filesystem, Terminal, Explanation panels) |
| `surface-2` | `#1A1F2B` | Raised cards (Dashboard track cards, badge cards) |
| `surface-3` | `#232937` | Floating layers — modals, popovers, the AI Tutor slide-out |
| `border` | `#2A3140` | Default hairline border |
| `border-strong` | `#3A4356` | Emphasized divider, hover state border |
| `text-primary` | `#E8EAED` | Primary reading text |
| `text-secondary` | `#A0A8B8` | Supporting/secondary text |
| `text-muted` | `#6B7280` | Placeholders, timestamps, least-important metadata |

*Elevation ordinal is ascending lightness (0 darkest → 3 lightest), matching how physical layers read as "closer to the viewer."* At most two floating elevations (`surface-2`/raised, `surface-3`/floating) should ever be visible simultaneously — a third stacked floating layer is a sign a true nested-dialog pattern is needed, not another popover.

### 1.2 Semantic roles — the reserved-meaning table

This is the single most important table in the color system, because it's the one that prevents color meanings from colliding.

| Role | Hex (mid-tone) | Reserved Meaning | Never Used For |
|---|---|---|---|
| **Green** (`role-location`) | `#3DDC84` | **Exclusively** the current-working-directory marker in the Filesystem panel | Success states, "correct" quiz feedback, confirmations — all of which use teal instead |
| **Teal** (`role-success`) | `#2DD4BF` | Success, correct answers, completed states, confirmations | Location/current-directory indication |
| **Accent / Blue-violet** (`role-accent`) | `#6D5DFC` | Primary interactive color — primary buttons, links, active tabs, focus rings | Status/semantic meaning of any kind |
| **Amber** (`role-warning`) | `#F5A623` | Warnings, destructive-action confirmations, non-blocking issues | Errors (too easily confused with a true failure state) |
| **Red** (`role-danger`) | `#F0453F` | Errors, failed commands, delete animations | Warnings that aren't yet a failure |

Each semantic role also has a low-saturation background tint (used behind banners, badges, and tinted rows) and a corresponding on-tint text color from the *same* family — e.g., the success banner uses a dark-teal background tint with light-teal text, never the raw mid-tone teal as a text color on its own tint (which would fail contrast). This "same-family pairing" rule applies to every role, without exception.

### 1.3 Contrast targets

- Body text on any surface: **≥ 4.5:1** (WCAG AA for normal text)
- Large text (18px+/bold 14px+) and UI component boundaries: **≥ 3:1**
- The reserved green marker is deliberately chosen bright enough to clear 3:1 against `surface-1` on its own, but per Section 1.4, color is never the *only* signal it carries.

### 1.4 Color independence (accessibility floor, not a footnote)

Every state that uses color as one signal also carries a second, non-color signal:
- Current directory: green tint **+** a small dot marker **+** a "here" text label on hover/focus — never green alone.
- Success/error banners: tint **+** a check/x icon **+** the message text itself states the outcome in words.
- Locked vs. earned badges: color **+** a distinct grayscale/silhouette treatment **+** a lock icon.

### 1.5 Light mode (not built in MVP, but token-ready)

No light theme ships in MVP (per the PRD's "dark mode by default" directive), but every component below references a *semantic* token (`surface-0`, `text-primary`) rather than a literal hex value, specifically so a future light theme is a second value-set assigned to the same token names — not a re-design of every component. This is the same "design for the trigger, don't build it early" discipline used throughout the Architecture and Database documents.

---

## 2. Typography

### 2.1 Font families — a two-family system

| Token | Recommended Family | Usage |
|---|---|---|
| `font-sans` | A humanist sans-serif (e.g., Inter or a comparable grotesque) | All UI chrome — navigation, buttons, explanations, quiz text, settings |
| `font-mono` | A coding-optimized monospace (e.g., JetBrains Mono or a comparable family) | Anything representing real Linux content — terminal text, filenames, file contents, command syntax |

The split isn't decorative — it's how a learner's eye distinguishes "the product talking to me" from "the actual Linux content I'm learning," which matters in a product where those two things sit inches apart on screen constantly.

### 2.2 Type scale

| Token | Size / Line-height | Weight | Usage |
|---|---|---|---|
| `display` | 32px / 40px | 500 | Landing page headline only — never used inside the authenticated app |
| `heading-1` | 24px / 32px | 500 | Screen-level titles |
| `heading-2` | 18px / 26px | 500 | Section headers within a screen (e.g., "Your Tracks") |
| `heading-3` | 15px / 22px | 500 | Card headers, panel labels |
| `body` | 14px / 22px | 400 | Primary reading text — lesson explanations, settings labels |
| `body-small` | 13px / 20px | 400 | Secondary/supporting text |
| `caption` | 12px / 16px | 400 | Timestamps, metadata, badge labels |
| `code` | 13px / 20px | 400 (regular) / 500 (emphasis) | Terminal text, filenames, command syntax — always `font-mono` |

**Two weights only — 400 and 500.** No 600 or 700 anywhere in the system. Heavier weights read as visually aggressive against the deliberately calm, dark surface palette, and a two-weight system means "is this bold or not" is never an ambiguous design judgment call on a new screen.

**Sentence case everywhere** — buttons, headings, tab labels, badge names. Title Case is reserved for actual proper nouns (the product name, command names like `mkdir` which are inherently lowercase and shouldn't be capitalized against their real syntax).

---

## 3. Spacing & Layout Grid

### 3.1 Base unit and scale

Base unit: **4px**. The full spacing scale used for padding, margins, and gaps:

| Token | Value |
|---|---|
| `space-xs` | 4px |
| `space-sm` | 8px |
| `space-md` | 12px |
| `space-lg` | 16px |
| `space-xl` | 24px |
| `space-2xl` | 32px |
| `space-3xl` | 48px |
| `space-4xl` | 64px |

Component-internal gaps (icon-to-label, button padding) use the smaller end of the scale (`xs`–`md`); page-level rhythm (section-to-section spacing) uses the larger end (`xl`–`4xl`).

### 3.2 Grid & breakpoints

| Breakpoint | Range | Layout Behavior |
|---|---|---|
| Mobile | < 640px | Single-column, tabbed panel navigation (per UI/UX §12) |
| Tablet | 640px–1024px | Two-column primary (Filesystem + Terminal), drawer-based secondary panels |
| Desktop | > 1024px | Full multi-panel layout, 12-column fluid grid for dashboard/admin screens |

### 3.3 Corner radius

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 6px | Buttons, inputs, small controls |
| `radius-md` | 12px | Cards, panels |
| `radius-lg` | 16px | Modals |
| `radius-pill` | 999px | Badges, pills, tags — used only when the intent is genuinely a pill shape, not as a generic "rounder" option |

**Single-sided borders never get corner rounding** — an accent border on only one edge (e.g., a left-border "active" indicator in a nav list) is always square, since rounding one corner of a partial border reads as a rendering mistake, not a style choice.

---

## 4. Iconography

**Single icon family, outline style, consistent stroke weight** — never mixing an outline set with a filled set, and never hand-illustrating one-off icons that don't match the family's stroke weight and corner treatment.

### 4.1 Sizing scale

| Token | Size | Usage |
|---|---|---|
| `icon-sm` | 16px | Dense contexts — table rows, inline badges, autocomplete dropdown rows |
| `icon-md` | 20px | Default inline usage — buttons, list items, panel headers |
| `icon-lg` | 24px | Standalone/decorative — empty states, feature highlights on the landing page |

### 4.2 Semantic icon assignments (a fixed vocabulary, not ad hoc per screen)

| Concept | Icon |
|---|---|
| Directory | Folder |
| Text file | Document/file |
| Symbolic link | Link/chain |
| Permission-related | Lock |
| AI Tutor | Chat/assistant bubble |
| Streak | Flame |
| XP / Level | Star |
| Badge / Achievement | Trophy or medal |
| Hint | Lightbulb |
| Destructive action | Trash (in context) or warning triangle (in a confirmation dialog) |
| Current-directory marker | A small filled dot — deliberately not an icon from the main set, so it visually reads as a distinct "marker" layer rather than another file-type icon |

Every icon is decorative by default (`aria-hidden`) *unless* it is the only content of an interactive control (e.g., an icon-only close button), in which case it carries an accessible label instead of relying on the icon alone (Section 14).

---

## 5. Elevation & Surface Treatment

### 5.1 Elevation levels

Covered in Section 1.1 as color values; here is the *behavioral* rule set:

- At most **two floating elevations** on screen simultaneously (e.g., a modal over the base app). A third stacked floating layer signals the interaction needs a proper full dialog replacing the popover, not a popover-on-popover.
- Flat, in-flow surfaces (the three always-visible Lesson Screen panels) carry **no elevation shadow** — they're part of the base layout, not floating above it. Reserving elevation shadows for genuinely floating elements (modals, the AI Tutor slide-out, dropdowns) keeps the shadow language meaningful rather than decorative.

### 5.2 Glassmorphism — deliberately scoped, not everywhere

The PRD calls for a glassmorphism aesthetic. This is applied **only to transient overlays** — the AI Tutor slide-out panel, modals, and dropdowns — using a translucent surface with background blur. It is **not** applied to the three continuously-visible, continuously-animating Lesson Screen panels. *Reasoning:* background blur (`backdrop-filter`) is genuinely expensive to keep recalculating against content that's animating behind it constantly (nodes growing, sliding, fading) — applying it to the one part of the UI that's never static would be a real, avoidable performance cost for a purely decorative effect. Reserving it for overlays that appear only occasionally gets the aesthetic without that cost.

---

## 6. Motion & Animation System

### 6.1 Duration tokens

| Token | Duration | Usage |
|---|---|---|
| `duration-fast` | 120ms | Micro-interactions — button press, toggle flip, hover states |
| `duration-base` | 200ms | Standard UI transitions — modal open/close, drawer slide |
| `duration-slow` | 400ms | Advanced Mode / Focus Mode filesystem animations |
| `duration-beginner` | 550ms | Beginner Mode filesystem animations — deliberately the slowest, so a first-time user can actually track what happened |

### 6.2 Easing tokens

| Token | Curve Character | Usage |
|---|---|---|
| `ease-standard` | Smooth deceleration | Most UI transitions (modals, drawers) |
| `ease-overshoot` | Slight bounce past target before settling | Node-create animations — the "pop" that makes a new folder feel like it arrived, not just appeared |
| `ease-linear` | Constant rate | Progress bars, XP-counter fill animations — anything representing a literal quantity shouldn't visually accelerate/decelerate, which would misrepresent the value |

### 6.3 Per-action animation mapping

(Consolidated from the UI/UX document, now expressed as token assignments rather than prose descriptions.)

| Filesystem Action | Duration Token | Easing Token | Treatment |
|---|---|---|---|
| Create (mkdir/touch) | beginner/slow | overshoot | Scale in from 0 with a slight bounce |
| Delete (rm/rmdir) | beginner/slow | standard | Fade + simultaneous vertical-space collapse |
| Move (mv) | beginner/slow | standard | Slide along a path from origin to destination |
| Copy (cp) | beginner/slow | standard | A duplicate "ghost" peels off and settles |
| Permission change (chmod) | fast | standard | Icon crossfade |
| Symlink (ln -s) | base | standard | Dashed connector line draws in |
| Current-directory move (cd) | base | standard | Green marker glides, brief pulse on arrival |
| Bulk changes (e.g., `rm -r`) | per-node duration above | standard | Each affected node's animation is staggered ~60–80ms apart in sequence, never simultaneous, so a bulk change stays visually parseable rather than reading as an instant, confusing wipe |

### 6.4 Reduced motion

Every entry in the table above has a **defined reduced-motion equivalent**: an instant state change accompanied by a brief (`duration-fast`) opacity flash on the affected node — conveying "this changed" without conveying movement. This isn't a separate, secondarily-maintained animation set; it's driven from the same underlying event stream described in the Architecture Document's Animation Engine, which is what guarantees the reduced-motion experience never quietly falls behind the full-motion one as new commands are added.

---

## 7. Component: Buttons

| Variant | Visual Treatment | Usage |
|---|---|---|
| Primary | Filled, `role-accent` background | The single most important action on a screen — at most one per screen (e.g., "Next Lesson," not both "Next Lesson" and "Start Quiz" competing) |
| Secondary | Outlined, transparent background | The default button style for most actions — "Practice Again," "Cancel" |
| Ghost | Text-only, no border | Low-emphasis actions, often paired inside a card or dense list |
| Destructive | Outlined, `role-warning` or `role-danger` depending on severity | Reset Sandbox (warning-level), Delete Account (danger-level) — always paired with the confirmation pattern (Section 9), never executes on a single click |

**Sizing:** small (dense UI, table row actions), medium (default), large (landing page CTAs only).

**Icon placement:** leading icon only, never trailing — except a trailing chevron specifically to indicate "this opens a menu/dropdown," which is a distinct, consistently-recognizable exception rather than a general pattern.

**States:** default, hover (subtle surface lift), active (slight scale-down, ~0.98, giving tactile press feedback), disabled (reduced opacity + `text-muted`, but see Section 14 — disabled buttons are used sparingly, since they give no explanation on touch devices; prefer an enabled button that explains *why* an action can't proceed yet, where feasible), loading (spinner replaces label, button remains its original width to avoid layout shift).

---

## 8. Component: Cards

| Card Type | Treatment | Usage |
|---|---|---|
| Content card | `surface-2`, `border`, `radius-md`, standard padding | Track cards, badge cards, settings sections |
| Stat/metric card | `surface-1` tint (flatter, no border) | Dashboard summary numbers — XP, streak, level. Deliberately flatter than content cards so a dashboard reads as "numbers at a glance," not a stack of separately-important boxes |
| Progress card | Content card + embedded linear progress bar | Track progress on the Dashboard |
| Badge card | Content card, two states: earned (full color) / locked (grayscale silhouette + lock icon + tooltip revealing unlock criteria) | Achievements screen |

Cards never nest more than one level deep (a card inside a card is a sign the inner content should be its own section, not a nested card) — consistent with the "restraint over options" principle.

---

## 9. Component: Dialogs & Modals

| Dialog Type | Size | Dismiss Behavior |
|---|---|---|
| Standard confirmation | Small | Clicking outside or Esc = Cancel (the safe default action) |
| Destructive confirmation | Small, `role-warning`/`role-danger` accent | Clicking outside or Esc = Cancel — **never** treated as confirmation, since an accidental dismissal must never accidentally execute the destructive action |
| Quiz modal | Medium | Does not dismiss on outside click while a question is in progress — an accidental tap shouldn't discard a quiz attempt |
| Completion celebration | Large | Requires an explicit action (Practice Again / Next Lesson) — no passive dismissal, since this is also the moment XP/badges are being communicated and shouldn't be skippable by an accidental tap |

**Focus management:** every modal traps keyboard focus within itself while open and returns focus to the triggering element on close — covered in depth in Section 14.

---

## 10. Component: Tables & Dense Lists

Used in the Admin screens (content/user tables) and, functionally, in the Leaderboard and Command Reference lists even though those don't look like a literal spreadsheet grid.

**Row treatment:** hairline row dividers (`border` token), not a card-per-row pattern. *Reasoning:* a dense list of 50+ leaderboard entries or command reference items as individual cards would be visually heavy and slow to scan — hairline-divided rows read as one continuous, scannable list, which is what dense data actually needs.

**Pagination:** a "Load more" action at the list's end, not numbered page buttons — this matches the API's cursor-based pagination (API Design §0) directly; numbered pages would imply a jump-to-page capability the API doesn't support, and offer no benefit over incremental loading for this kind of continuously-scrolling content.

**Sortable columns (Admin only):** a subtle chevron indicator on the active sort column; sorting is always single-column (no multi-column sort UI), consistent with keeping the admin tooling simple rather than building a general-purpose data-grid feature the actual workflows don't need.

---

## 11. Component: Navigation

| Pattern | Where Used | Behavior |
|---|---|---|
| Top navigation bar | Every authenticated learner-facing screen | Logo, streak/XP indicators, avatar menu — persists across screens for constant orientation |
| Sidebar navigation | Admin only | Section list (Tracks/Lessons/Commands/Users/Analytics) — a deliberately distinct navigation *pattern*, not just a re-skinned top nav, reinforcing that Admin is a different trust boundary and workflow (per the API Design's authorization note) |
| Bottom tab bar | Mobile, Lesson/Practice screens only | Terminal / Filesystem / Explain tabs, with the persistent current-directory chip described in the UI/UX document, so switching tabs never loses the "where am I" signal |
| Step tracker | Lesson Screen | A horizontal five-segment progress indicator (Explain → Demo → Practice → Quiz → Complete), current step filled, completed steps checked |
| Breadcrumbs | Admin content editor | Track → Lesson → Step, since content editing is the one place in the product with genuine hierarchical drill-down navigation |

Hamburger-menu collapse for the top nav below tablet width, consistent across every screen that uses it.

---

## 12. Component: Forms & Inputs

| Control | States | Notes |
|---|---|---|
| Text input | default, focus (accent-colored ring), error (danger-colored border + inline message below), disabled | Error messages appear below the field, paired with a small icon — never color-only |
| Toggle switch | on/off | Used for boolean settings (reduced motion, notification opt-in) |
| Radio group | selected/unselected | Used for mutually exclusive choices (Beginner/Advanced mode) |
| Slider | draggable with a labeled current value | Used for animation speed — always shows the current value as text, never relies on thumb position alone |
| Dropdown/select | closed/open/disabled | Disabled state (e.g., language selector pre-localization) always paired with a tooltip explaining why, per the "avoid unexplained disabled controls" principle in Section 14 |

Labels sit above their field, left-aligned, `body-small` weight — never inside the field as a placeholder-only label (which disappears exactly when a user most needs to confirm what a field is, once they've started typing).

---

## 13. Component: Feedback

| Component | Behavior | Usage |
|---|---|---|
| Toast | Transient, auto-dismisses after a few seconds, non-blocking | Used sparingly — most feedback in this product already happens via animation, so an additional toast layer is reserved for things the animation system can't convey on its own (e.g., "Settings saved") |
| Banner | Persistent within its panel until dismissed or superseded | The Output Console's result/warning summaries — these need to persist long enough to actually read, unlike a toast |
| Tooltip | Appears on hover (desktop) / tap-and-hold (mobile) | Hint previews, locked-badge unlock criteria, command flag descriptions |
| Progress indicator (linear) | Fills left-to-right, `ease-linear` | XP-to-next-level, lesson step progress |
| Progress indicator (circular) | Fills clockwise, `ease-linear` | Streak ring, track completion percentage on a Dashboard card |

---

## 14. Accessibility — Consolidated Standards

Gathered here from every section above into one reference, per the PRD's WCAG 2.1 AA target:

- **Contrast:** ≥4.5:1 body text, ≥3:1 large text/UI boundaries (Section 1.3) — verify with a contrast tool at implementation, not assumed from the design intent alone.
- **Color independence:** every color-coded state carries a second, non-color signal (Section 1.4) — this is a hard requirement, not a nice-to-have, given how central color-coding (especially the green location marker) is to this product's visual language.
- **Keyboard operability:** every interactive element reachable and operable via keyboard alone, including tree expand/collapse, autocomplete acceptance, and modal controls.
- **Focus indicators:** a single, consistent focus-ring token (accent-colored, visible against every surface level) used everywhere — never removed for aesthetic reasons.
- **Focus management in modals:** focus traps within the open modal; returns to the triggering element on close (Section 9).
- **Screen reader announcements:** filesystem changes are announced via ARIA live regions in plain language, sourced from the same event stream driving the visual animation (Architecture Document, Animation Engine) — guaranteeing the announcement and the animation can never fall out of sync with each other, since they share one source of truth.
- **Reduced motion:** a defined instant-update equivalent for every animation (Section 6.4), and respects the operating system's reduced-motion preference in addition to the in-app toggle.
- **Disabled controls used sparingly:** per the "restraint" principle, prefer an enabled control that explains why an action isn't available yet over a disabled control that gives no explanation on touch devices (which don't have hover-based tooltips to fall back on).
- **Icon-only controls always carry an accessible label**, even though the icon itself is `aria-hidden` decorative content.

---

## 15. Design Token Reference (Engineering Handoff Summary)

A consolidated index of every named token category introduced above, for quick lookup:

| Category | Token Prefix | Defined In |
|---|---|---|
| Surfaces | `surface-0` … `surface-3` | Section 1.1 |
| Semantic roles | `role-location`, `role-success`, `role-accent`, `role-warning`, `role-danger` | Section 1.2 |
| Text | `text-primary`, `text-secondary`, `text-muted` | Section 1.1 |
| Borders | `border`, `border-strong` | Section 1.1 |
| Typography | `display`, `heading-1/2/3`, `body`, `body-small`, `caption`, `code` | Section 2.2 |
| Spacing | `space-xs` … `space-4xl` | Section 3.1 |
| Radius | `radius-sm`, `radius-md`, `radius-lg`, `radius-pill` | Section 3.3 |
| Icon sizing | `icon-sm`, `icon-md`, `icon-lg` | Section 4.1 |
| Motion duration | `duration-fast/base/slow/beginner` | Section 6.1 |
| Motion easing | `ease-standard`, `ease-overshoot`, `ease-linear` | Section 6.2 |

Every component definition in Sections 7–13 is built exclusively from tokens in this table — no component should ever need a one-off value that isn't traceable to a named token here. If a new screen seems to need one, that's a signal to extend this table deliberately (Section 16), not to introduce an untracked exception.

---

## 16. Governance & Future Extensibility

- **New component proposals** (anything not covered in Sections 7–13) should be checked against existing tokens/components first — most "new" component needs turn out to be a composition of existing primitives (e.g., the Command Reference row in Practice Mode is just a dense-list row plus a tooltip, not a new component category).
- **Light theme:** additive, per Section 1.5 — a second value-set mapped to the same token names, not a redesign.
- **Localization:** the type scale's line-heights are set with enough headroom to accommodate moderately longer translated strings (e.g., German) without layout breakage; right-to-left language support, if ever pursued, would be a deliberate, separate future initiative given its structural implications (mirrored layouts, not just flipped text) — explicitly out of scope for the current token system rather than silently assumed to work.
- **Versioning:** this document is versioned alongside the other companion documents; a breaking token change (e.g., renaming `role-success`) should bump the version and note the migration in a changelog, the same discipline already applied to lesson content versioning in the Database Design document.

---

*End of Document — Version 1.0*
