import { NotFoundError } from "../common/errors.js";
import { commandsRepository } from "./commands.repository.js";
import type { AutocompleteSuggestion, CommandDetail, CommandSummary } from "@visualinux/shared-types";

export const commandsService = {
  async list(filters: { category?: string; difficulty?: string }): Promise<CommandSummary[]> {
    const rows = await commandsRepository.listActive(filters);
    return rows.map((c) => ({
      name: c.name,
      category: c.category,
      difficulty: c.difficulty,
      shortDescription: c.shortDescription,
      iconKey: c.iconKey,
    }));
  },

  async getByName(name: string): Promise<CommandDetail> {
    const command = await commandsRepository.findByName(name);
    if (!command) throw new NotFoundError(`No command named '${name}' exists.`);

    const flags = await commandsRepository.findFlagsByCommandId(command.id);

    return {
      name: command.name,
      longDescription: command.longDescription,
      exampleUsage: command.exampleUsage,
      animationType: command.animationType,
      flags: flags.map((f) => ({ flag: f.flag, description: f.description })),
    };
  },

  async autocomplete(prefix: string): Promise<AutocompleteSuggestion[]> {
    const rows = await commandsRepository.autocomplete(prefix);
    return rows.map((c) => ({
      name: c.name,
      iconKey: c.iconKey,
      shortDescription: c.shortDescription,
      exampleUsage: c.exampleUsage,
      difficulty: c.difficulty,
      category: c.category,
    }));
  },
};
