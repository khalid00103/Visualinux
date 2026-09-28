import type { CommandHandler } from "../types.js";
import { pwd, ls, cd, mkdir, rmdir, touch, rm, cp, mv, ln, treeCommand, find, stat, du, df } from "./filesystem-handlers.js";
import { chmod, chown, chgrp } from "./permission-handlers.js";
import { cat, head, tail, grep, sort, uniq, wc, diff, echo, nano } from "./text-handlers.js";

export const COMMAND_HANDLERS: Record<string, CommandHandler> = {
  pwd, ls, cd, mkdir, rmdir, touch, rm, cp, mv, ln,
  tree: treeCommand,
  find, stat, du, df,
  chmod, chown, chgrp,
  cat, head, tail, grep, sort, uniq, wc, diff, echo, nano,
};

/**
 * Commands whose effect is inherently irreversible-feeling enough to warrant
 * the Beginner Mode confirmation flow (API Design §9 / PRD FR-10.4).
 *
 * Note: `rmdir` is deliberately excluded. API Design §9's original wording listed
 * "rmdir on a non-empty directory" as a destructive case, but real Unix `rmdir`
 * semantics simply refuse to remove a non-empty directory (see the handler's
 * `directory_not_empty` error) rather than forcing it — so that scenario can
 * never actually delete anything, and doesn't need a confirmation gate.
 */
export function isDestructiveInvocation(commandName: string): boolean {
  return commandName === "rm";
}
