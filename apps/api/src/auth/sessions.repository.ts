import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { userSessions } from "../db/schema.js";

export const sessionsRepository = {
  async create(params: { userId: string; refreshTokenHash: string; expiresAt: Date; deviceInfo?: string }) {
    const [session] = await db
      .insert(userSessions)
      .values({
        userId: params.userId,
        refreshTokenHash: params.refreshTokenHash,
        expiresAt: params.expiresAt,
        deviceInfo: params.deviceInfo,
      })
      .returning();
    return session;
  },

  async findActiveByHash(refreshTokenHash: string) {
    const rows = await db
      .select()
      .from(userSessions)
      .where(and(eq(userSessions.refreshTokenHash, refreshTokenHash), isNull(userSessions.revokedAt)))
      .limit(1);
    return rows[0];
  },

  async listActiveForUser(userId: string) {
    return db
      .select()
      .from(userSessions)
      .where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)));
  },

  async revoke(sessionId: string) {
    await db.update(userSessions).set({ revokedAt: new Date() }).where(eq(userSessions.id, sessionId));
  },

  async revokeAllForUser(userId: string) {
    await db
      .update(userSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)));
  },
};
