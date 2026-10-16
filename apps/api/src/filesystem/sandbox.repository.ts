import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { sandboxes } from "../db/schema.js";

export const sandboxesRepository = {
  async create(params: { userId: string; sandboxType: "practice" | "lesson_step"; sourceTemplateId: string }) {
    const [sandbox] = await db
      .insert(sandboxes)
      .values({
        userId: params.userId,
        sandboxType: params.sandboxType,
        sourceTemplateId: params.sourceTemplateId,
      })
      .returning();
    return sandbox;
  },

  async findById(id: string) {
    const rows = await db.select().from(sandboxes).where(eq(sandboxes.id, id)).limit(1);
    return rows[0];
  },

  async findPracticeByUserId(userId: string) {
  const rows = await db
    .select()
    .from(sandboxes)
    .where(eq(sandboxes.userId, userId))
    .limit(50);

  return rows.find((sandbox) => sandbox.sandboxType === "practice");
},

  async setRootNodeId(sandboxId: string, rootNodeId: string) {
    // A freshly created sandbox starts "in" its root directory — both fields
    // are set together so there's never a moment where one exists without the other.
    await db
      .update(sandboxes)
      .set({ rootNodeId, currentDirectoryId: rootNodeId, updatedAt: new Date() })
      .where(eq(sandboxes.id, sandboxId));
  },

  async setCurrentDirectoryId(sandboxId: string, currentDirectoryId: string) {
    await db.update(sandboxes).set({ currentDirectoryId, updatedAt: new Date() }).where(eq(sandboxes.id, sandboxId));
  },

  async touchLastReset(sandboxId: string) {
    const sandbox = await this.findById(sandboxId);
    await db
      .update(sandboxes)
      .set({ lastResetAt: new Date(), updatedAt: new Date(), currentDirectoryId: sandbox?.rootNodeId ?? null })
      .where(eq(sandboxes.id, sandboxId));
  },
};
