import { ALL_COMMANDS } from "@visualinux/command-registry";
import type { CommandRegistryLookup } from "@visualinux/simulation-engine";

/**
 * The client doesn't duplicate the backend's Levenshtein "did you mean" logic —
 * suggestSimilar always returns undefined here. If a command is genuinely
 * unrecognized, the server's reconciliation response (which does compute a real
 * suggestion) arrives moments later and corrects the displayed output. Not worth
 * duplicating that logic for a purely-cosmetic few-hundred-millisecond gap.
 */
export function createClientRegistryLookup(): CommandRegistryLookup {
  return {
    findByName(name: string) {
      const command = ALL_COMMANDS.find((c) => c.name === name);
      if (!command) return undefined;
      return { minArgs: command.grammarSpec.minArgs, maxArgs: command.grammarSpec.maxArgs };
    },
    suggestSimilar() {
      return undefined;
    },
  };
}
