# Ratified Decisions

These three decisions were marked **[ASSUMED]** throughout the PRD, Architecture, Database
Design, API Design, and Roadmap documents. Milestone 0's Definition of Done requires them
to be formally ratified before implementation proceeds. In the absence of an explicit
override, they are ratified here using the defaults reasoned through across all eight
companion documents — every occurrence of "[ASSUMED]" in those documents should be read
as settled by this entry.

**This is easy to override.** If any of these should change, say so before Milestone 1
begins — that's the first milestone where they start constraining real feature code
(the Auth Service is built specifically around the managed-identity-provider decision).
Overriding after Milestone 1 is still possible but costs rework.

## 1. Command Execution Model
**Ratified:** Simulated engine for MVP (Architecture §12). No real code execution, no
Docker sandboxes, until a future phase whose trigger is named in the Architecture
Document's Future Scalability section (§22, item 6).

## 2. MVP Command / Shell Scope
**Ratified:** Tier 1 (filesystem/permissions) + Tier 2 (text/content commands) + basic
shell operators (piping, redirection, wildcards) + a basic text editor. The exact command
list is the one seeded in Milestone 2, per the Database Design's `commands` table.

## 3. Business Model
**Ratified:** Freemium — core lesson path free, certificates/advanced tracks/classroom
licensing paid. This affects the AI Tutor's rate-limit tier design (Milestone 10) and
nothing else in the MVP build; it can be revisited without schedule impact up until
Milestone 10 begins.

---

*Ratified: Milestone 0. Status: active until explicitly superseded.*
