# @visualinux/api

The backend application implementing the API Design document's endpoint surface, built as
the modular monolith described in the Architecture Document (§4).

**Status:** Milestone 0 — a single `/health` endpoint only, to prove the deploy pipeline
end-to-end. Domain modules (Auth, Learning Engine, Filesystem Simulation Engine,
Gamification, AI Gateway) are added incrementally starting Milestone 1.

## Run locally
```
npm install
npm run dev --workspace=@visualinux/api
```
Then check `http://localhost:4000/health`.
