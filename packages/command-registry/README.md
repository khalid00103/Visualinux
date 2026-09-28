# @visualinux/command-registry

The data-driven definition of every supported Linux command in the MVP scope — grammar,
flags, difficulty, and animation type (Database Design §4, Architecture §6). Consumed by
both the backend interpreter (authoritative execution) and the frontend's optimistic
simulation (Architecture §3), so command behavior is defined once, not twice.

**Status:** Milestone 2 — 28 commands (18 Tier 1 filesystem/permissions + 10 Tier 2
text/content processing), matching the MVP scope ratified in `docs/DECISIONS.md`.
Shell operators (pipes, redirection, wildcards) are a parser-level concern for
Milestone 3, not registry entries — they aren't named commands.
