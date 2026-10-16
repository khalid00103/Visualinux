# Shared Command Runtime and Presentation

## Goal

Guided Lessons and Practice Mode should share the same command semantics and visual-presentation rules without sharing the same persistence model or lesson-task state.

## Execution boundaries

- `packages/simulation-engine` owns parsing, command interpretation, filesystem operations, command output, and semantic animation events.
- `apps/web/src/terminal/lessonCommandRuntime.ts` adapts the same simulation engine for a guided lesson. It adds lesson-specific input restrictions, deterministic lesson file fixtures, and educational messages while preserving the lesson page's task-completion checks.
- Practice Mode executes commands through the API. `apps/api/src/terminal/terminal.service.ts` runs the same simulation engine and persists operations to the sandbox. The browser reconciles the authoritative response rather than persisting an optimistic simulation.
- `apps/web/src/terminal/commandPresentation.ts` translates execution results into educational terminal output and a filesystem animation plan. It uses command-specific rules where required and otherwise uses semantic backend animation events.
- `apps/web/src/terminal/useFilesystemAnimationController.ts` owns animation timing and lifecycle: highlight restart, red removal state, parent expansion, frame/timer cleanup, and delayed visual deletion.
- The existing `TreeNode`, `LessonTerminal`, and Practice terminal components remain responsible for rendering.

## Command-specific presentation examples

- `mkdir` and `touch`: the newly created item is highlighted for 10 seconds and simple lesson-style commands show a visualized directory tree.
- `ls`: every child of the current directory is highlighted for 10 seconds even though the filesystem is unchanged; the terminal displays a sorted tree-style listing.
- `pwd`: the nodes on the current path are highlighted and expanded, and the terminal shows the path.
- `cd`: the current directory and terminal path change, the path is expanded, and no yellow highlight is applied.
- `cp`: highlight the new copy rather than the source.
- `mv`: highlight the moved item and expand relevant source/destination parents. Backend move diffs must include the actual old parent ID.
- `rm`: retain the deleted node in the display while it is red, then remove it after 3 seconds.
- `cat` and other content-reading commands: `content_display` is not automatically treated as a yellow filesystem highlight.
- Failed commands do not receive a success animation or mutate the simulated filesystem.

## Updating the supported command registry

The registry now contains 31 commands, including `clear`, `man`, and `whoami` to support all 20 lessons. If a developer has already seeded an older command registry database, rerun the idempotent command seed after configuring the local `.env`:

```powershell
npm run db:seed-commands --workspace @visualinux/api
```

This updates/creates the command definitions and their flags. It does not run database migrations; follow the normal migration instructions when schema changes are introduced.

## Verification

From the repository root:

```powershell
npm ci
npm run typecheck
npm test
npm run build
```

The source ZIP intentionally does not include `node_modules`; install dependencies for the local platform with `npm ci` before running these commands.
