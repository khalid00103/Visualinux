import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { ConflictError, UnauthorizedError, ValidationError } from "../../common/errors.js";
import { hashPassword, verifyPassword } from "../password.js";
import type { IdentityProvider, IdentityProviderAuthResult, IdentityProviderSignUpResult } from "../identity-provider.js";

// A small, local-only credentials table — deliberately NOT part of the main schema.ts
// (Database Design's schema has no password column on `users` at all, by design: in
// production, Auth0 owns credentials entirely). This table exists only to give the
// local-dev provider somewhere to store a hash, and is never created in production
// (see migrations — this table's migration is dev-only, applied manually, not part
// of the production migration set).
const localCredentials = pgTable("local_dev_credentials", {
  externalAuthId: uuid("external_auth_id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
});

export { localCredentials };

/**
 * Local development identity provider.
 *
 * Simulates what a managed provider does — validate a credential pair, return a
 * stable external identity ID — using our own local Postgres and Node's built-in
 * scrypt KDF. This is what makes it possible to actually run and test the full
 * signup → login → refresh → logout flow in this environment.
 *
 * Barred from production by config/env.ts's fail-fast check — this is not a
 * corner that's been cut, it's a deliberately scoped fallback for exactly the
 * environments (local dev, CI, this sandbox) that have no live provider access.
 */
export class LocalDevIdentityProvider implements IdentityProvider {
  async signUp(params: { email: string; password: string }): Promise<IdentityProviderSignUpResult> {
    const existing = await db
      .select()
      .from(localCredentials)
      .where(eq(localCredentials.email, params.email))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError("An account with this email already exists.");
    }

    const externalAuthId = randomUUID();
    const passwordHash = await hashPassword(params.password);

    await db.insert(localCredentials).values({
      externalAuthId,
      email: params.email,
      passwordHash,
    });

    return { externalAuthId };
  }

  async login(params: { email: string; password: string }): Promise<IdentityProviderAuthResult> {
    const rows = await db
      .select()
      .from(localCredentials)
      .where(eq(localCredentials.email, params.email))
      .limit(1);

    const record = rows[0];
    if (!record) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    const isValid = await verifyPassword(params.password, record.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    return { externalAuthId: record.externalAuthId };
  }

  async requestPasswordReset(): Promise<void> {
    // Local-dev stub: a real reset-token/email flow isn't meaningful without a real
    // mail provider. Always resolves, matching the interface contract.
    return;
  }

  async confirmPasswordReset(): Promise<void> {
    throw new ValidationError("Password reset confirmation is not implemented in local-dev mode.");
  }
}
