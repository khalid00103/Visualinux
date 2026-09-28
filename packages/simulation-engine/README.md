# @visualinux/simulation-engine

The Filesystem Simulation Engine (Architecture §6-7) — the tree data structure,
command-line parser, interpreter, and every command handler — extracted into its
own package specifically so it can be imported by **both** `apps/api` (server-side
authoritative execution) and `apps/web` (client-side optimistic simulation,
Architecture §3). This is what makes the hybrid execution model safe: one
implementation of "what does `mkdir` do," not two that could quietly drift apart.

**Status:** Extracted in Milestone 4, moved from `apps/api` where it was originally
built in Milestone 3. Pure TypeScript — no Node-specific or database dependencies,
by design.
