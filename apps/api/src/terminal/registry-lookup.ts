import { commandsRepository } from "../commands/commands.repository.js";
import type { CommandRegistryLookup } from "@visualinux/simulation-engine";

/** Simple Levenshtein distance — used only for "did you mean" suggestions on typos. */
function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

interface CachedCommand {
  minArgs: number;
  maxArgs: number | null;
  shortDescription: string;
}

/**
 * The interpreter needs a synchronous lookup (so it stays a pure, easily
 * unit-testable function — see interpreter.test.ts). This factory fetches
 * every active command once, per call, and returns a closure over that
 * request-scoped snapshot. Deliberately NOT a module-level mutable cache: a
 * shared cross-request cache would need explicit invalidation on registry
 * updates and would complicate concurrent-request correctness for a lookup
 * this cheap to just refetch. Redis-backed caching of this data is the right
 * future optimization (Architecture §14) — this is the correct starting point
 * before that trigger is reached, not a shortcut around it.
 */
export async function createRegistryLookup(): Promise<CommandRegistryLookup> {
  const commands = await commandsRepository.listActive({});
  const byName = new Map<string, CachedCommand>();

  for (const command of commands) {
    const grammarSpec = command.grammarSpec as { minArgs: number; maxArgs: number | null };
    byName.set(command.name, {
      minArgs: grammarSpec.minArgs,
      maxArgs: grammarSpec.maxArgs,
      shortDescription: command.shortDescription,
    });
  }

  return {
    findByName(name: string) {
      return byName.get(name);
    },
    suggestSimilar(name: string) {
      let best: { name: string; description: string; distance: number } | undefined;
      for (const [candidateName, entry] of byName.entries()) {
        const distance = levenshtein(name, candidateName);
        if (distance <= 2 && (!best || distance < best.distance)) {
          best = { name: candidateName, description: entry.shortDescription, distance };
        }
      }
      return best ? { name: best.name, description: best.description } : undefined;
    },
  };
}
