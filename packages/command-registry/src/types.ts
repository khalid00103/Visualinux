// The declarative shape every MVP command is defined in. A backend seed script
// (apps/api/src/db/seed-commands.ts) loads these into the `commands` table; the
// same objects are the ones Milestone 3's parser and Milestone 4's frontend
// optimistic simulation will import directly, so there is exactly one place a
// command's behavior is described, per Architecture §6's data-driven principle.

export type CommandCategory = "filesystem" | "permissions" | "text_processing";
export type CommandDifficulty = "beginner" | "intermediate" | "advanced";

/**
 * Note on animation types: this list extends the four-value set implied by the
 * original Database Design draft (create/delete/move/copy/permission_change/
 * symlink/content_display/none) with two refinements discovered while actually
 * populating real command data in this milestone:
 *   - `directory_change` for `cd` — gliding the current-directory marker is a
 *     conceptually distinct animation from `move` (which slides an actual node),
 *     and conflating them would make Milestone 5's Animation Engine ambiguous.
 *   - `ownership_change` for `chown`/`chgrp` — distinct from `permission_change`
 *     (chmod's icon crossfade) per the Design System's own animation table (§6.3),
 *     which already described these as different visual treatments without the
 *     schema previously having a value for it.
 * Both additions are reflected back into docs/DATABASE_DESIGN.md's enum definition
 * as part of this milestone, not left as an undocumented drift between the data
 * model and the actual seeded data.
 */
export type AnimationType =
  | "create"
  | "delete"
  | "move"
  | "copy"
  | "permission_change"
  | "ownership_change"
  | "symlink"
  | "directory_change"
  | "content_display"
  | "none";

export interface CommandFlagDefinition {
  flag: string;
  description: string;
  changesAnimationBehavior?: boolean;
}

export interface CommandGrammarSpec {
  /** Minimum number of positional arguments required. */
  minArgs: number;
  /** Maximum number of positional arguments allowed, or null for unlimited. */
  maxArgs: number | null;
  /** What kind of positional argument this command expects. */
  argumentType: "path" | "paths" | "none" | "text";
}

export interface CommandDefinition {
  name: string;
  category: CommandCategory;
  difficulty: CommandDifficulty;
  shortDescription: string;
  longDescription: string;
  exampleUsage: string;
  iconKey: string;
  animationType: AnimationType;
  grammarSpec: CommandGrammarSpec;
  flags: CommandFlagDefinition[];
}
