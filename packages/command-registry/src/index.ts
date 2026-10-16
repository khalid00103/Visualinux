// Populated in Milestone 2. Combines Tier 1 (filesystem/permissions) and Tier 2
// (text/content processing) commands into the single registry consumed by:
//   - apps/api/src/db/seed-commands.ts (loads these into the `commands` table)
//   - Milestone 3's backend parser (authoritative execution)
//   - Milestone 4's frontend optimistic simulation
// per Architecture §6's data-driven, single-source-of-truth principle.

export * from "./types.js";
import { filesystemCommands } from "./commands/filesystem.js";
import { textProcessingCommands } from "./commands/text-processing.js";
import type { CommandDefinition } from "./types.js";
import { systemCommands } from "./commands/system.js";

export const ALL_COMMANDS: CommandDefinition[] = [...filesystemCommands, ...textProcessingCommands, ...systemCommands];

export const COMMAND_REGISTRY_PACKAGE_VERSION = "0.2.0";
