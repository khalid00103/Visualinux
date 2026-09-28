import { and, eq, ilike } from "drizzle-orm";
import { db } from "../db/client.js";
import { commands, commandFlags } from "../db/schema.js";

export const commandsRepository = {
  async listActive(filters: { category?: string; difficulty?: string }) {
    const conditions = [eq(commands.isActive, true)];
    if (filters.category) {
      conditions.push(eq(commands.category, filters.category as (typeof commands.category.enumValues)[number]));
    }
    if (filters.difficulty) {
      conditions.push(eq(commands.difficulty, filters.difficulty as (typeof commands.difficulty.enumValues)[number]));
    }
    return db.select().from(commands).where(and(...conditions));
  },

  async findByName(name: string) {
    const rows = await db.select().from(commands).where(eq(commands.name, name)).limit(1);
    return rows[0];
  },

  async findFlagsByCommandId(commandId: string) {
    return db.select().from(commandFlags).where(eq(commandFlags.commandId, commandId));
  },

  /**
   * API Design §7: prefix match, capped at 10 results, kept fast and lightweight
   * since this is called on nearly every keystroke.
   */
  async autocomplete(prefix: string) {
    return db
      .select()
      .from(commands)
      .where(and(eq(commands.isActive, true), ilike(commands.name, `${prefix}%`)))
      .limit(10);
  },
};
