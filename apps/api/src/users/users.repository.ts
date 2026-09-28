import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users, userSettings } from "../db/schema.js";

export interface CreateUserInput {
  externalAuthId: string;
  email: string;
  displayName: string;
  timezone?: string;
}

export const usersRepository = {
  async create(input: CreateUserInput) {
    const [user] = await db
      .insert(users)
      .values({
        externalAuthId: input.externalAuthId,
        email: input.email,
        displayName: input.displayName,
        timezone: input.timezone ?? "UTC",
      })
      .returning();

    // Every user gets a settings row at creation time (1:1, Database Design §2) —
    // never lazily created on first settings read, which would leave a window
    // where a user exists but GET /settings has nothing to return.
    await db.insert(userSettings).values({ userId: user.id });

    return user;
  },

  async findByEmail(email: string) {
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return rows[0];
  },

  async findById(id: string) {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0];
  },

  async updateProfile(id: string, updates: { displayName?: string; timezone?: string }) {
    const [updated] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  },

  /** Soft delete only — per Database Design §0, hard delete is never used for accounts. */
  async softDelete(id: string) {
    await db.update(users).set({ accountStatus: "deleted", deletedAt: new Date() }).where(eq(users.id, id));
  },
};

export const userSettingsRepository = {
  async findByUserId(userId: string) {
    const rows = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
    return rows[0];
  },
};
