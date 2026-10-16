# @visualinux/command-registry

The data-driven definition of every supported Linux command in the MVP scope — grammar,
flags, difficulty, and animation type (Database Design §4, Architecture §6). Consumed by
both the backend interpreter (authoritative execution) and the frontend's optimistic
simulation (Architecture §3), so command behavior is defined once, not twice.

**Current registry:** 31 commands (18 Tier 1 filesystem/permissions + 13 Tier 2
text/content/system commands). The original Milestone 2 baseline had 28 commands; `clear`,
`man`, and `whoami` are now included so the registry and shared simulation engine cover all
20 guided lessons as well as the existing Practice command set.
Shell operators (pipes, redirection, wildcards) are a parser-level concern for
Milestone 3, not registry entries — they aren't named commands.
