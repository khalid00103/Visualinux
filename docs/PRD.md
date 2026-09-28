# Product Requirements Document (PRD)

## VisuaLinux — Interactive Visual Linux Learning Platform

| Field | Value |
|---|---|
| Document Version | 1.0 (Draft) |
| Status | Pending stakeholder sign-off on 3 open decisions (see below) |
| Product Name | VisuaLinux *(working title, pending branding)* |
| Document Owner | Product & Engineering |
| Audience | Founders, Engineering, Design, QA, Future Hires, Investors |

---

## 0. Document Control & Key Assumptions

This PRD is written as the single source of truth for the product. However, three foundational decisions were raised during discovery and have not yet been confirmed by you. To avoid blocking progress, this document proceeds with the following **provisional defaults**, clearly marked wherever they affect a requirement. Each should be explicitly ratified or overridden before engineering estimation begins.

| # | Decision | Provisional Default Used In This PRD | Rationale |
|---|---|---|---|
| 1 | Command execution model | **Simulated engine in MVP** (virtual filesystem/state machine, no real OS execution), with **real Docker sandboxes deferred to a later phase** | Matches your original vision document's own phrasing ("eventually real Docker sandboxes"); lowest cost, lowest security risk, fastest path to validating the core animation thesis |
| 2 | MVP command/shell scope | **Tier 1 (filesystem/permissions) + Tier 2 (text/content commands) + basic shell operators** (pipes, redirection, wildcards) + a basic text editor (`nano`) | Matches the Tier 1/Tier 2 scope we agreed was fully animatable and high-value; excludes process/Git/Docker/networking from MVP |
| 3 | Business model | **Freemium**: core lesson path free, certificates/advanced tracks/classroom licensing paid | Reasonable default for an education product needing to fund AI tutor inference costs; easiest to relax to "fully free" or tighten to "subscription" later without restructuring the product |

Any section below marked **[ASSUMED]** depends on one of these three decisions and will need revision once you confirm.

---

## 1. Executive Summary

VisuaLinux is a browser-based, interactive learning platform that teaches Linux to complete beginners by making the operating system **visible**, not just typeable. Where every existing Linux tutorial site gives users a bare terminal and text output, VisuaLinux pairs a real-feeling terminal with a live, animated visual filesystem, a context-aware AI tutor, a structured lesson curriculum, and gamified progress tracking — all synchronized in real time.

The product's core bet is that beginners fail to learn Linux not because commands are hard to type, but because they cannot form a correct mental model of what a command actually *does*. By animating every filesystem-affecting command — folders growing, files fading, permissions morphing, the "current directory" marker physically moving — VisuaLinux converts an abstract, text-only skill into a spatial, intuitive one.

MVP scope is deliberately bounded to the commands and shell behaviors that are both pedagogically essential *and* meaningfully animatable (see Section 20, Future Features, for what is intentionally deferred: Git, Docker, Kubernetes, networking, real sandboxes). This keeps the initial build achievable while preserving a credible, ambitious long-term roadmap toward becoming the default place a beginner — student, career switcher, or engineer prepping for interviews — learns Linux from zero.

---

## 2. Vision

A world where nobody's first experience of Linux is a blinking cursor and a wall of confusing text — where anyone, anywhere, can *see* how an operating system works well enough to use it confidently within hours, not months.

---

## 3. Mission

To build the most intuitive, visual, and beginner-safe way to learn Linux — by turning every command into something the learner can watch happen, not just something they're told happened.

---

## 4. Problem Statement

**Current state:** Nearly every existing Linux education resource (interactive terminals, YouTube tutorials, static documentation, university coursework) teaches Linux the same way: present a command, ask the user to type it, show text output. This format assumes the learner can mentally simulate the filesystem changes a command causes — an assumption that holds for people who already understand filesystems, and fails for the complete beginners these platforms claim to serve.

**Why it fails beginners specifically:**
- Text output like `mkdir: cannot create directory 'x': File exists` requires the learner to already understand *what a directory is, why it "exists," and what "creating" it spatially means* — the very things they're trying to learn.
- There is no persistent, glanceable answer to "where am I right now?" — a question every beginner asks constantly and that plain-text prompts answer poorly.
- Mistakes produce cryptic errors with no bridge back to understanding, causing many beginners to associate the terminal with anxiety rather than curiosity, and to abandon self-teaching.
- Existing platforms are either (a) unstructured playgrounds with no curriculum, requiring the learner to already know what to search for, or (b) rigid video courses with no hands-on interactivity.

**Cost of the problem:** Learners give up early, arrive at technical interviews and DevOps roles with shallow command-line fluency, and companies spend onboarding time re-teaching fundamentals that should have been intuitive from the start.

**The opportunity:** No mainstream product currently treats the visual filesystem as a first-class, always-synchronized panel rather than a decorative sidebar. This is a genuine, defensible product gap.

---

## 5. Target Audience

**Primary:**
- Absolute beginners with zero prior command-line exposure
- College/university students in CS, IT, or engineering programs
- Self-taught developers who have avoided Linux until now

**Secondary:**
- Developers switching from Windows/macOS-only workflows to Linux-based environments
- Backend developers formalizing ad hoc Linux knowledge
- DevOps/SRE-track learners building foundational skills before tackling containers/orchestration
- Candidates preparing for technical interviews that assume command-line fluency

**Tertiary (future, not MVP):**
- Bootcamp and university instructors seeking a classroom-ready teaching tool
- Corporate L&D teams onboarding non-Linux engineers

---

## 6. Goals

**Product Goals**
1. Reduce the time for a complete beginner to become independently comfortable in a Linux terminal, compared to text-only tutorials.
2. Make the visual filesystem panel indispensable — measured by learners actively referencing it, not ignoring it in favor of the terminal alone.
3. Achieve lesson-to-lesson retention through Lesson 10 (the point most competing platforms lose beginners) at a materially higher rate than industry-typical online-course completion rates.
4. Make error messages a moment of learning rather than a moment of abandonment.

**Business Goals [ASSUMED — depends on Decision #3]**
1. Build a large, engaged free user base as a funnel into paid certificates/advanced tracks.
2. Establish VisuaLinux as a recognizable name in beginner Linux/DevOps education within its first year of public availability.
3. Keep AI tutor inference cost per active user within a sustainable margin relative to monetization.

---

## 7. Non-Goals

To keep scope honest, VisuaLinux explicitly will **not**, at least in MVP and near-term phases:

- Be a general-purpose cloud development environment or code editor replacement.
- Provide real, unrestricted internet-connected shell access (security risk; see Non-Functional Requirements).
- Attempt to animate every Linux command in existence — networking, Kubernetes, and cloud CLI commands are explicitly deferred (see Section 20).
- Function as a proctored, exam-grade certification body competing with formal certifications (e.g., RHCSA, LPIC) — its certificates are learning-completion credentials, not industry certifications, and must be labeled as such.
- Ship a native mobile app in MVP — mobile is served via responsive web only.
- Support offline usage in MVP.
- Replace a full computer science curriculum or formal DevOps training.
- Guarantee real-command parity with a genuine Linux shell in MVP, given the simulated execution model **[ASSUMED]** — this must be communicated honestly to users (see Edge Cases, Section 21).

---

## 8. Personas

**1. Ritika — The CS Undergraduate**
Second-year computer science student. Has used Linux only inside a VM for one assignment and found it intimidating. Needs to pass a systems course that assumes command-line fluency. Motivated by grades and genuine curiosity, low tolerance for frustration, learns best with visual analogies.

**2. Daniel — The Career Switcher**
Former marketing professional, self-teaching web development. Every tutorial he follows assumes Linux/terminal familiarity he doesn't have. High motivation, no formal CS background, needs everything explained from first principles without feeling condescended to.

**3. Amara — The Backend Developer**
Two years into a backend role, uses `cd`, `ls`, `git` daily but has never learned permissions, process management, or shell scripting properly — she's pattern-matched her way through. Wants to fill specific gaps quickly, will be impatient with beginner-paced content and needs an "Advanced Mode" or skip-ahead path.

**4. Sam — The Interview Candidate**
Preparing for SRE/DevOps interviews in the next 6 weeks. Needs targeted, realistic practice under time pressure, cares about command accuracy and edge cases (permissions, symlinks) more than gamification.

**5. (Future persona, not MVP) Mr. Okafor — The Bootcamp Instructor**
Runs a 12-week bootcamp cohort. Wants to assign structured lessons, track cohort progress, and reduce time spent answering the same beginner Linux questions repeatedly. Represents the future classroom/B2B opportunity — informs design decisions now (e.g., account model should not preclude a future "organization" concept) without being built in MVP.

---

## 9. User Stories

Organized by epic. Format: *As a [persona], I want to [action], so that [benefit].*

**Onboarding & Accounts**
- As a new user, I want to create an account with minimal friction (email or SSO), so that my progress is saved.
- As a returning user, I want to resume exactly where I left off, so that I don't lose progress or momentum.
- As a new user, I want an optional placement check, so that I'm not forced through lessons I already know (serves Amara).

**Lessons**
- As a beginner, I want lessons presented in a fixed, sensible order, so that I never have to guess what to learn next.
- As a learner, I want every new concept explained before I'm asked to use it, so that I'm never guessing blindly.
- As a learner, I want to see an animated demonstration of a command before I try it myself, so that I know what "success" should look like.
- As a learner, I want to practice a command in a safe sandbox immediately after seeing it demonstrated, so that the concept is reinforced immediately.
- As a learner, I want a short quiz at the end of a lesson, so that I can confirm I actually understood it, not just copied it.
- As a learner, I want to choose "Practice Again" or "Next Lesson" after completing a lesson, so that I control my own pace.

**Terminal & Visual Filesystem**
- As a learner, I want the terminal to feel like a real terminal (history, tab-complete, arrow navigation), so that my skills transfer to real Linux use.
- As a learner, I want to always see which directory I'm currently in, highlighted clearly in the visual filesystem, so that I never feel lost.
- As a learner, I want every command I run to visibly change the filesystem panel, so that I understand cause and effect instantly.
- As a learner, I want folders and files to animate distinctly for create/delete/move/copy, so that I don't have to infer what happened from text alone.

**Practice Mode**
- As a learner, I want a pre-populated, realistic filesystem to practice in outside of lessons, so that I can experiment freely.
- As a learner, I want a one-click way to reset my practice filesystem, so that mistakes are never permanent or scary.
- As an advanced user (Amara, Sam), I want to jump directly into practice mode without going through beginner lessons, so that I can drill specific skills.

**AI Tutor**
- As a learner, I want to ask "why did this fail?" and get an answer based on exactly what I just typed, so that I don't get generic, unhelpful explanations.
- As a learner, I want to ask conceptual questions ("what's the difference between cp and mv?") at any time, so that I'm never stuck waiting for a human.
- As a learner mid-quiz, I want the AI tutor to guide me toward the answer rather than give it outright, so that quizzes still measure my understanding.

**Error Handling**
- As a beginner, I want a mistyped command to explain what I likely meant, so that I don't have to leave the platform to search the error.
- As a beginner, I want a warning before a destructive command executes, so that I don't accidentally "break" my practice environment without understanding why.

**Gamification**
- As a learner, I want to earn XP and see my streak, so that I stay motivated to return daily.
- As a learner, I want a certificate when I complete a track, so that I have something concrete to show for my effort.

**Accessibility**
- As a screen reader user, I want filesystem changes announced in text, so that the visual-first design doesn't exclude me.
- As a user sensitive to motion, I want to reduce or disable animations, so that the platform is usable for me too.

---

## 10. User Journey

| Stage | User Action | User Feeling (if done well) | Key Touchpoints |
|---|---|---|---|
| Discovery | Finds VisuaLinux via search, social, or referral | Curious, slightly skeptical of "another Linux tutorial" | Landing page demo animation (no signup required) |
| Signup | Creates account | Low friction, quick | Auth flow |
| Onboarding | Optional placement check; sets Beginner/Advanced mode | Feels the product adapts to them, not the other way around | Onboarding wizard |
| First Lesson | Completes Lesson 1 ("What is Linux?") | "Oh — I actually get this" | Lesson engine, first animation |
| Early Momentum | Completes Lessons 2–8 (terminal → mkdir/touch basics) | Building confidence, small wins (XP, streak) | Lesson flow, gamification |
| Free Exploration | Enters Practice Mode between lessons | Feels safe to experiment, not afraid of "breaking" something | Practice sandbox, reset button |
| Friction Point | Hits a confusing error or a hard concept (permissions, symlinks) | Momentary frustration | AI tutor, contextual error explanations |
| Recovery | Asks AI tutor or reads adaptive error explanation | Frustration resolved without leaving the platform | AI tutor panel |
| Mid-Course Plateau | Reaches intermediate lessons, motivation naturally dips | Needs external motivation | Streaks, badges, reminder notifications |
| Completion | Finishes a track, receives certificate | Pride, sense of accomplishment | Certificate, completion screen |
| Advocacy / Retention | Shares certificate, returns for next track (e.g., Git/Docker when released) | Sees VisuaLinux as their ongoing "Linux home," not a one-off course | Future tracks, leaderboard, referral |

---

## 11. Functional Requirements

**FR-1: Authentication & Account Management**
1.1 The system shall support account creation via email/password and at least one SSO provider.
1.2 The system shall persist user progress, XP, streaks, and settings server-side, tied to the account.
1.3 The system shall support password reset and basic account settings management.

**FR-2: Onboarding**
2.1 The system shall present a first-run onboarding flow explaining the panel layout before the first lesson.
2.2 The system shall offer an optional placement/skip-ahead assessment.
2.3 The system shall allow the user to select Beginner or Advanced mode, changeable later in settings.

**FR-3: Lesson Engine**
3.1 The system shall present lessons in a fixed, sequential curriculum order, grouped into tracks (e.g., "Linux Fundamentals").
3.2 Each lesson shall include: explanation content, an animated demonstration, an interactive practice step, a quiz, and a completion state.
3.3 The system shall validate user command input against the lesson's expected outcome(s), allowing for reasonable valid alternatives (e.g., different but correct flag combinations) where applicable.
3.4 The system shall track per-lesson completion status per user.
3.5 Upon lesson completion, the system shall present "Practice Again" and "Next Lesson" options.
3.6 The system shall allow escalating hints after repeated failed attempts within a lesson step.

**FR-4: Terminal Engine**
4.1 The system shall provide a terminal interface supporting command history (up/down arrow navigation), tab-completion, copy/paste, and standard keyboard shortcuts.
4.2 The system shall provide syntax highlighting for recognized commands, flags, and arguments.
4.3 The terminal shall visually and behaviorally resemble a standard Ubuntu terminal.
4.4 **[ASSUMED — Decision #1]** The terminal shall execute commands against a simulated filesystem/state engine in MVP, not a real OS process.

**FR-5: Command Autocomplete**
5.1 As the user types, the system shall display a dropdown of matching commands.
5.2 Each suggestion shall display: command name, icon, one-line description, example usage, difficulty level, and category.
5.3 The system shall support keyboard navigation of the suggestion dropdown (arrow keys, tab/enter to accept).

**FR-6: Visual Filesystem Engine**
6.1 The system shall render the complete current filesystem state as an expandable/collapsible tree with folder and file icons.
6.2 The system shall always highlight the current working directory using a distinct, consistent visual treatment (not color alone — see Accessibility).
6.3 The tree view shall update within a perceptible, near-immediate timeframe of any command that changes filesystem state.
6.4 The system shall support smooth expand/collapse animations for nested directories.
6.5 The system shall remain performant (no visible lag) for filesystems up to a defined reasonable node count **[to be finalized with Engineering; recommend virtualized rendering beyond ~500 visible nodes]**.

**FR-7: Command Execution & Animation Engine [ASSUMED — Decision #2 defines scope]**
7.1 The system shall define an explicit animation behavior for every command in the MVP command set (see Section 13, Complete Feature List, for the list).
7.2 Each animation shall have distinct visual treatments per action type: create (grow), delete (fade), move (slide), copy (duplicate), permission change (icon transition), and symbolic link (connecting indicator).
7.3 The system shall support common flag variations for MVP commands (e.g., `mkdir -p`, `rm -r`, `rm -f`) with appropriate visual and behavioral differences.
7.4 The system shall support basic shell operators in MVP: piping (`|`), output redirection (`>`, `>>`), and wildcard expansion (`*`).
7.5 Undefined or unsupported commands shall degrade gracefully per FR-10 (Error Handling), never crash the session.

**FR-8: Practice Mode**
8.1 The system shall provide a pre-seeded, realistic demo filesystem (home directory with common folders/files) on entry to Practice Mode.
8.2 The system shall allow free-form command execution outside the lesson structure.
8.3 The system shall provide a one-click "Reset Sandbox" action restoring the default demo filesystem.
8.4 The system shall allow entry into Practice Mode focused on a specific command selected from a command reference list.

**FR-9: AI Tutor**
9.1 The AI tutor shall be accessible at all times via a persistent panel or entry point.
9.2 The AI tutor's responses shall incorporate: current filesystem state, recent command history, and current lesson context (when applicable).
9.3 The AI tutor shall be able to answer conceptual questions independent of any specific error.
9.4 During active quiz steps, the AI tutor shall default to guided/Socratic responses rather than revealing direct answers, unless the user explicitly overrides this.
9.5 The system shall rate-limit AI tutor usage per user tier **[ASSUMED — Decision #3 affects tier definitions]**.
9.6 If the AI service is unavailable, the system shall degrade gracefully with a clear, friendly message — never a silent failure.

**FR-10: Error Handling System**
10.1 On an invalid or unrecognized command, the system shall never display a bare "command not found."
10.2 The system shall attempt fuzzy-match suggestion ("Did you mean...") for likely typos of known commands.
10.3 The system shall explain, in plain language, what the correct command does when suggesting it.
10.4 Before executing a recognized destructive command (e.g., `rm -rf`) in Beginner Mode, the system shall present a confirmation warning describing the consequence.
10.5 Error explanations shall be context-aware (e.g., a "permission denied" explanation shall reference the actual permission state involved).

**FR-11: Gamification System**
11.1 The system shall award XP for defined actions (lesson completion, quiz pass, daily login, challenge completion).
11.2 The system shall track and display a daily streak with a defined grace/freeze mechanism.
11.3 The system shall define discrete levels derived from cumulative XP.
11.4 The system shall award badges for defined achievement conditions (e.g., "Completed Filesystem Basics," "7-day streak").
11.5 The system shall generate a shareable completion certificate upon finishing a full track, clearly labeled as a learning-completion credential (not a professional certification).
11.6 The system shall provide a leaderboard scoped at minimum globally, with weekly reset **[exact scope — global/friends/cohort — to be finalized in design phase]**.

**FR-12: Progress Tracking & Persistence**
12.1 All lesson progress, XP, streaks, badges, and settings shall persist across sessions and devices tied to the user account.
12.2 The system shall allow a user to view their overall progress (completed lessons, tracks, time spent) in a dashboard.

**FR-13: Mode Settings (Beginner / Advanced)**
13.1 Beginner Mode shall include slower default animation speed, persistent hints, and destructive-command warnings.
13.2 Advanced Mode shall minimize hints/explanations by default and behave closer to a real terminal, while retaining the visual filesystem panel.
13.3 The user shall be able to switch modes at any time from settings without losing progress.

**FR-14: Notifications**
14.1 The system shall support opt-in streak-reminder notifications (email and/or push, platform-dependent).

---

## 12. Non-Functional Requirements

**Performance**
- Command execution and corresponding animation shall begin within a perceptibly instant timeframe (target: under ~150ms perceived latency for simulated commands).
- Animations shall target 60fps on mid-range consumer hardware; the system shall gracefully reduce animation complexity on lower-end devices rather than drop frames badly.

**Scalability**
- The platform shall support growth toward "thousands of concurrent students" without architectural rework, meaning stateless, horizontally scalable services wherever session state allows it. *(Detailed architecture to follow in a separate Architecture Document, per project process — not defined here.)*

**Security [ASSUMED — Decision #1 affects severity]**
- Given a simulated (non-real-OS) execution engine in MVP, the primary security concerns are input sanitization (preventing injection into any backend systems, e.g., via AI tutor prompts) and standard web application security (auth, session handling, XSS/CSRF protection) rather than sandbox/container escape — the latter becomes critical only if/when real sandboxes are introduced in a later phase, at which point this section must be revisited in full.
- User-generated input (filenames, file contents in practice mode) shall never be rendered unsanitized in any panel.

**Reliability & Availability**
- Core lesson and practice functionality shall remain available even if the AI tutor subsystem is degraded or unavailable (AI tutor is additive, not a hard dependency for core learning flow).
- Target uptime for core platform: standard consumer SaaS expectation (defined precisely with Engineering during architecture phase).

**Usability**
- A first-time user shall be able to complete Lesson 1 without external help, instructions, or documentation.
- The interface shall clearly communicate current state (current directory, current lesson step, current mode) at all times without requiring the user to hunt for it.

**Accessibility**
- Target WCAG 2.1 AA conformance. (Full detail in Section 21.)

**Browser & Platform Support [ASSUMED — Decision affects nothing critical, but stated for completeness]**
- Support latest two versions of Chrome, Firefox, Safari, and Edge.
- Fully responsive down to tablet width in MVP; phone-width support is a defined but reduced experience (see Non-Goals — native app deferred).

**Maintainability**
- The command/animation definitions (behavior + visual mapping) shall be structured as data-driven configuration wherever feasible, so new commands can be added without rearchitecting the execution engine. *(Implementation detail for the Architecture phase — noted here as a constraint on that future design.)*

**Localization Readiness**
- All user-facing strings shall be externalized from the start (even though only one language ships in MVP), to avoid costly retrofitting when localization becomes a priority.

**Observability**
- The system shall log lesson drop-off points, command error frequency, and AI tutor usage patterns (in aggregate/anonymized form) to inform curriculum and product iteration.

**Compliance & Privacy**
- The system shall comply with applicable data privacy regulations (e.g., GDPR) for account and usage data.
- Given the audience includes college and potentially younger students, the platform shall clearly define its minimum age policy and comply with relevant child-data-protection requirements if the target age range extends to minors — **this must be explicitly decided; not assumed in this document.**

---

## 13. Complete Feature List

**MVP (Phase 1) — [ASSUMED scope per Decision #2]**

*Core Platform*
- Account creation & login (email + 1 SSO)
- Onboarding flow + optional placement check
- Beginner / Advanced mode toggle
- Progress dashboard

*Terminal*
- Realistic terminal UI (history, tab-complete, shortcuts, syntax highlighting)
- Command autocomplete with rich metadata (icon, description, example, difficulty, category)

*Visual Filesystem*
- Full tree view with expand/collapse, icons, nesting
- Persistent current-directory highlight
- Real-time synchronized updates

*Animated Commands (Tier 1 — Filesystem/Permissions)*
`pwd`, `ls`, `cd`, `mkdir` (incl. `-p`), `rmdir`, `touch`, `rm` (incl. `-r`, `-f`), `cp`, `mv`, `ln -s`, `tree`, `chmod`, `chown`, `chgrp`, `find`, `stat`, `du`, `df`

*Animated Commands (Tier 2 — Text/Content)*
`cat`, `head`, `tail`, `grep`, `sort`, `uniq`, `wc`, `diff`, `echo`, basic `nano` editing

*Basic Shell Operators*
Piping (`|`), redirection (`>`, `>>`), wildcards (`*`)

*Lessons*
- Full sequential Linux Fundamentals track (Lesson 1 through Tier 1/Tier 2 command coverage)
- Explanation + animation + demo + practice + quiz + completion per lesson

*Practice Mode*
- Pre-seeded demo filesystem
- Free command execution
- Reset-to-default sandbox

*AI Tutor*
- Context-aware Q&A (filesystem state, history, lesson context)
- Error explanation on demand
- Guided (non-answer-revealing) mode during quizzes

*Error Handling*
- "Did you mean" suggestions
- Plain-language failure explanations
- Destructive-command confirmation (Beginner Mode)

*Gamification*
- XP, levels, streaks (with grace mechanism), badges, one certificate per completed track, global leaderboard

*Accessibility*
- Keyboard-only operability
- Screen-reader announcements for filesystem changes
- Reduced-motion setting
- Color-independent current-directory indicator

**Phase 2 (Post-MVP)**
- Process management visuals (`ps`, `top`, `kill`) with process-tree visualization
- Git track with commit-graph visualizer
- Expanded shell scripting (variables, conditionals, loops)
- Classroom/instructor dashboard (serves the Mr. Okafor persona)
- Additional SSO providers, richer profile/social features

**Phase 3 (Long-Term)**
- Docker track with container/image/layer visualizer
- Real, opt-in Docker sandbox environments for advanced practice
- Networking fundamentals (conceptual/diagram-based, not live-animated — see feasibility discussion)
- Kubernetes, AWS CLI tracks
- SSH, remote-session simulation
- Interview-prep mode (timed challenges, realistic scenario sets)
- Native mobile apps
- Full localization/multi-language support
- Community/forum layer

---

## 14. Workflow (High-Level Functional Flow)

*This describes product behavior, not system architecture — architecture is a separate downstream document per our agreed process.*

1. User types input into the terminal.
2. As they type, the autocomplete engine surfaces matching command suggestions with metadata.
3. On submit, the input is parsed and validated against the known MVP command/operator set.
4. If invalid/unrecognized → Error Handling flow (Section 21 / FR-10) is triggered instead of execution.
5. If valid, the command is evaluated against the current simulated filesystem state, producing a state diff (what was created, deleted, moved, changed).
6. The state diff is broadcast to all relevant panels simultaneously:
 - Visual Filesystem panel plays the corresponding animation and updates the tree.
 - Terminal panel prints the resulting text output.
 - Explanation panel updates with a contextual note (if in Lesson Mode or Beginner Mode).
 - Output Console reflects any additional detail (errors, warnings).
7. If in Lesson Mode, the lesson engine checks whether this action satisfies the current lesson step's success criteria.
8. Gamification engine evaluates whether this action triggers XP, streak, or badge updates.
9. Progress state is persisted.

---

## 15. Lesson Flow

1. **Lesson Selection** — User enters the fixed-order lesson list; the next incomplete lesson is highlighted as recommended, but completed lessons remain revisitable.
2. **Concept Introduction** — Short explanation of the concept in plain language, paired with a simple static or animated visual aid.
3. **Guided Demonstration** — The system auto-plays an animation of the command being executed against a lesson-specific filesystem, narrated by the explanation panel.
4. **Interactive Practice** — The user is prompted to execute the command themselves in a scoped lesson sandbox.
 - On success: immediate positive visual/textual confirmation, proceed to quiz.
 - On failure: contextual hint shown; after repeated failures, hint escalates (from nudge → partial answer → full worked example), never leaving the user stuck indefinitely.
5. **Quiz** — A short check (multiple choice, fill-in-command, or "predict the output") confirming conceptual understanding, not just muscle memory.
6. **Completion Screen** — XP awarded, streak updated, badge check performed; two clear actions presented: **Practice Again** (replay this lesson's sandbox freely) or **Next Lesson**.

---

## 16. Practice Flow

1. **Entry** — User enters Practice Mode from the dashboard, from a specific command in the command reference, or via "Practice Again" from a completed lesson.
2. **Environment Load** — A realistic default filesystem (home directory with Documents, Downloads, Desktop, Pictures, Videos, Music, and a sample projects/ structure) is loaded.
3. **Free Execution** — User runs any supported command with no scripted success criteria; all visual/animation behavior remains fully active.
4. **Assistance on Demand** — AI tutor and command autocomplete remain available throughout.
5. **Reset** — A persistent, clearly visible "Reset Sandbox" control restores the default filesystem at any time, with a confirmation step to prevent accidental resets.
6. **Session End** — State is saved so the user can optionally resume their exact practice filesystem later, in addition to being able to reset it.

---

## 17. AI Flow

1. **Trigger** — User-initiated (typed question, "explain this error" button) or system-suggested (proactive tip after repeated failure on the same step).
2. **Context Assembly** — The system gathers: current filesystem state, recent command history (bounded window), current lesson/step (if any), and the specific error or question text.
3. **Response Generation** — The AI tutor generates a response grounded in the assembled context, not generic documentation text.
4. **Mode-Aware Behavior** — During active quiz evaluation, responses default to guided/Socratic hints; outside quizzes, direct explanations are given freely.
5. **Rendering** — Response appears in the dedicated AI tutor panel/chat, preserving conversation history within the session.
6. **Fallback** — If the AI service is unavailable or rate-limited, the system shows a clear, friendly fallback message and — where possible — surfaces the closest matching static help content instead of failing silently.

---

## 18. Gamification

**XP** — Awarded for: lesson completion, quiz pass (with a bonus for first-attempt success), daily first login, and completing a challenge. Exact point values to be tuned during design/balancing, not fixed in this document.

**Streaks** — A calendar-day counter of consecutive days with at least one qualifying action (e.g., one lesson step or practice session). Includes a limited "streak freeze" grace mechanism to avoid punishing single missed days too harshly, which is a known driver of churn in comparable products.

**Levels** — Derived from cumulative XP on a defined curve (to be tuned), giving a sense of long-term progression independent of any single track.

**Badges** — Categorized into: Skill badges (e.g., "Filesystem Fundamentals," "Permissions Pro"), Streak badges (7/30/100-day), and Challenge badges (special timed or difficulty-based tasks).

**Certificates** — Issued on full track completion; shareable (e.g., a public verification link) and explicitly labeled as a learning-completion credential, not a substitute for an accredited certification.

**Leaderboard** — At minimum, a global leaderboard with weekly reset in MVP; friend/cohort-scoped leaderboards are a Phase 2 consideration tied to expanded social/classroom features.

**Anti-gaming safeguards** — XP-earning actions shall be rate-limited or de-duplicated where trivially repeatable (e.g., repeatedly running the same harmless command should not farm XP).

---

## 19. Edge Cases

*Filesystem & Command Edge Cases*
- Destructive/wide-reaching commands (e.g., `rm -rf /`-equivalent within the simulated root) must be handled safely — either scoped so they cannot affect anything outside the user's own sandbox, or explicitly blocked with an explanation, never literally simulated to catastrophic effect.
- Symbolic link cycles (`ln -s` pointing back to an ancestor) must not cause infinite loops in `tree`/`find` rendering.
- Extremely deep directory nesting must not break tree rendering or performance.
- Name collisions (creating a file/folder that already exists) must produce the correct real-Linux-equivalent error, not a silent overwrite, unless the command's real flags specify otherwise.
- Chained commands where one succeeds and a later one fails (e.g., via `&&` in later phases) must reflect partial state accurately.
- Empty command submission must be a no-op, not an error.
- Extremely long pasted input must be handled without freezing the terminal.
- `chmod` sequences that remove the user's own access to their simulated home directory must be recoverable (e.g., a "Reset Sandbox" escape hatch always available).

*Session & Account Edge Cases*
- Same account active in multiple tabs/devices simultaneously — last-write-wins behavior (or better) must be defined so progress isn't silently lost.
- Session expiry mid-command must not corrupt saved filesystem/progress state.
- Lesson content updated by the platform while a user is mid-lesson must not strand the user in a broken state.
- Timezone handling for streak calculation must be consistent and clearly defined (user's local day, not server UTC day, to avoid unfair streak breaks).

*AI Tutor Edge Cases*
- AI service downtime or rate-limit exhaustion must degrade gracefully (see AI Flow, step 6), never block core lesson/practice functionality.
- AI must not reveal quiz answers outright by default, including via indirect phrasing tricks — this needs explicit prompt-design safeguards, noted here as a requirement for whoever designs the AI tutor's system prompt.

*Accessibility Edge Cases*
- Rapid animations must not conflict with or overwhelm screen reader announcements — announcements should describe end-state changes, not narrate every animation frame.
- Reduced-motion users must get an instant-state-update alternative that conveys the same information (e.g., a brief highlight flash) rather than losing the feedback entirely.

*Input & Environment Edge Cases*
- Non-English keyboard layouts and IME input must not break terminal input handling.
- Browser extensions that inject content into text inputs must not corrupt terminal state.
- Copy-pasted commands from external sources should still go through the same validation/warning flow as typed commands — no bypass of destructive-command confirmations.

*Trust & Expectation Edge Cases* **[ASSUMED — Decision #1]**
- Because MVP uses a simulated (non-real) engine, the product must clearly and honestly communicate this to users (e.g., a small persistent indicator or onboarding note) so they don't mistakenly believe they are on a real Linux machine — this matters both ethically and for setting correct expectations about what will/won't work (e.g., real package installation).

---

## 20. Accessibility

Target: **WCAG 2.1 Level AA**, with specific attention to the challenges created by a visually-driven product:

- **Keyboard operability** — Every action achievable via mouse (expanding tree nodes, accepting autocomplete suggestions, dismissing dialogs) must have a full keyboard equivalent.
- **Screen reader support** — Filesystem changes must be announced via ARIA live regions in plain language (e.g., "Folder 'project' created in home directory") in addition to the visual animation, not as a replacement for it.
- **Color independence** — The current-directory highlight and any status indicators (permission states, error states) must never rely on color alone; pair with icons, labels, or patterns for colorblind users.
- **Reduced motion** — The system must respect the operating system's `prefers-reduced-motion` setting and additionally offer an in-app toggle, providing an instant-update alternative that preserves informational content.
- **Contrast & typography** — Text and icon contrast must meet AA minimums in both the default dark mode and any future light mode.
- **Focus management** — Clear, visible focus indicators throughout; modal dialogs (e.g., destructive-command confirmations) must trap focus appropriately and return focus correctly on close.
- **Animation speed control** — Beginner Mode's slower animation speed doubles as an accessibility affordance and should remain user-adjustable independent of mode.

---

## 21. Future Features

(Consolidated from Section 13 Phase 2/3 plus additional ideas surfaced during discovery, for roadmap visibility — not committed scope.)

- Git track with commit-graph visualization
- Docker track with container/image/layer visualization
- Real, opt-in Docker sandbox environments
- Process management visuals (`ps`, `top`, `kill`, job control)
- Basic and advanced Bash scripting (variables, conditionals, loops, functions)
- Networking fundamentals (diagram/conceptual, not live-animated)
- Kubernetes and AWS CLI tracks
- SSH / remote session simulation
- Interview-prep mode with timed, realistic scenarios
- Classroom/instructor dashboard for cohort assignment and tracking (B2B opportunity)
- Native mobile apps (iOS/Android)
- Full multi-language localization
- Community/forum layer for peer help
- Voice-guided tutor mode
- Portfolio/resume integration for completed tracks and certificates

---

## 22. Acceptance Criteria

*Representative criteria for the most critical features, in Given/When/Then form. Granular, per-command acceptance criteria (covering every flag and error state across ~40–50 MVP commands) will be maintained as a companion "Command Specification" document rather than duplicated here, given its scale.*

**Visual Filesystem Synchronization**
- Given a user is viewing the filesystem panel, when they execute any state-changing command in the terminal, then the filesystem panel reflects the change with the correct animation type within a perceptibly immediate timeframe, without requiring a manual refresh.

**Current Directory Highlight**
- Given a user executes `cd` to a valid directory, when the command completes, then the highlighted current-directory indicator moves to the new location and no other location remains highlighted.

**Lesson Completion**
- Given a user completes all required steps of a lesson (practice + quiz) successfully, when the final step is submitted, then XP is awarded, the lesson is marked complete in their profile, and the "Practice Again / Next Lesson" screen is shown.

**AI Tutor Context Accuracy**
- Given a user's last command produced an error, when they ask the AI tutor to "explain this error," then the response references the specific command and error the user actually encountered, not a generic explanation of that error category.

**Command Autocomplete**
- Given a user types a partial command, when at least one known command matches the prefix, then a dropdown appears within a perceptibly immediate timeframe showing matching commands with icon, description, example, difficulty, and category.

**Error Handling — Unrecognized Command**
- Given a user submits a command that does not exist in the known command set, when it is closely similar (edit-distance within a reasonable threshold) to a known command, then the system suggests that command by name along with a one-line explanation of what it does.

**Destructive Command Confirmation (Beginner Mode)**
- Given a user in Beginner Mode submits a recognized destructive command, when the command targets existing files/folders, then a confirmation dialog describing the consequence is shown before execution proceeds.

**Practice Sandbox Reset**
- Given a user has modified their practice filesystem, when they select "Reset Sandbox" and confirm, then the filesystem returns exactly to the default seeded state.

---

## 23. Technical Constraints

*(Boundary conditions for the future Architecture Document — not architectural decisions themselves.)*

- Must run entirely in a modern web browser with no local installation required.
- **[ASSUMED — Decision #1]** MVP must not execute arbitrary real code or provide real OS-level shell access; all command behavior is defined by a simulated engine.
- Must support the browser matrix defined in Non-Functional Requirements (Section 12).
- Must function with the AI tutor subsystem fully unavailable, degrading gracefully rather than blocking core learning flows.
- Must externalize all user-facing text strings from day one to avoid a costly localization retrofit later.
- Animation/rendering approach must scale to reasonably large simulated filesystems without visible performance degradation (recommend virtualized/lazy rendering strategies beyond a defined node-count threshold, to be set with Engineering).
- AI tutor usage must be rate-limited per user tier to keep inference cost bounded — exact limits depend on Decision #3 (business model).
- No sensitive real-world credentials, tokens, or real system access should ever be requested from or exposed to the simulated environment.

---

## 24. Success Metrics

**Activation**
- % of new signups completing Lesson 1
- % of new signups completing the full onboarding flow

**Engagement & Retention**
- Day 1 / Day 7 / Day 30 retention
- Average streak length distribution
- Average lessons completed per active week
- Average session duration

**Learning Outcomes**
- Lesson completion rate (per lesson, to identify drop-off points)
- Quiz first-attempt pass rate (too low may indicate unclear teaching; too high may indicate trivial quizzes)
- Practice Mode usage rate following lesson completion (signal that the visual filesystem panel is genuinely valued, not just tolerated)

**AI Tutor Health**
- AI tutor engagement rate (% of active users who use it weekly)
- Response helpfulness rate (thumbs up/down or equivalent feedback signal)
- Fallback/unavailability rate

**Growth [ASSUMED — Decision #3]**
- Signup growth rate and source breakdown
- Referral/sharing rate (e.g., certificate shares)
- Free-to-paid conversion rate (if freemium is confirmed)

**Technical Health**
- Animation frame rate distribution across device tiers
- Command execution error/crash rate
- Platform uptime

---

## 25. Sign-Off Checklist

Before this PRD moves from Draft to Approved status and engineering estimation begins, the following must be explicitly confirmed:

- [ ] Decision #1 — Command execution model (simulated / real / hybrid, and phasing)
- [ ] Decision #2 — MVP command and shell scope
- [ ] Decision #3 — Business model
- [ ] Minimum age policy / minor-user data handling approach
- [ ] Leaderboard scope (global-only vs. friends/cohort in MVP)
- [ ] XP values, level curve, and streak-freeze mechanics (design/balancing pass)

---

*End of Document — Version 1.0*
