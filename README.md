# VisuaLinux

Interactive Visual Linux Learning Platform.

## Status

**Milestone 0 — Foundational Setup & Decision Lock-In** (in progress). See
`docs/MILESTONE_STATUS.md` for exact progress and `docs/ROADMAP.md` for the full
milestone plan.

## Documentation

All design documents live in `docs/`:

| Document | Covers |
|---|---|
| `docs/PRD.md` | Product requirements, personas, user stories, success metrics |
| `docs/ARCHITECTURE.md` | System architecture, every engine, tech stack, and their reasoning |
| `docs/DATABASE_DESIGN.md` | Every table, relation, index, and constraint |
| `docs/API_DESIGN.md` | Every REST endpoint, request/response, status codes, validation |
| `docs/UI_UX_DESIGN.md` | Every screen and component, responsive behavior, animation |
| `docs/DESIGN_SYSTEM.md` | Colors, typography, spacing, motion, and component tokens |
| `docs/COMPONENT_HIERARCHY.md` | Every React component, its props, and the folder structure |
| `docs/ROADMAP.md` | Every milestone, in dependency order, with acceptance criteria |
| `docs/DECISIONS.md` | The three previously-open decisions, now ratified |
| `docs/SETUP.md` | Manual account/infrastructure provisioning checklist |
| `docs/MILESTONE_STATUS.md` | Live tracker of what's actually built so far |

## Repository structure

```
apps/
  api/      — backend (Fastify + TypeScript), per docs/ARCHITECTURE.md
  web/      — frontend (React + Vite + TypeScript), per docs/COMPONENT_HIERARCHY.md
packages/
  shared-types/       — types shared between apps/web and apps/api
  command-registry/   — data-driven command definitions
infra/
  terraform/          — infrastructure as code (populated once real cloud accounts exist)
content/
  lessons/            — versioned lesson content (populated starting Milestone 7)
docs/                 — all design documents and living implementation trackers
```

## Getting started

```
npm install
npm run lint
npm run typecheck
npm run build
npm test
```

See `docs/SETUP.md` for the manual provisioning steps needed before the API can connect
to a real database, cache, or identity provider.
