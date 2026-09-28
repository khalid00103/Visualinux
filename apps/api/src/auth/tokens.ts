import { SignJWT, jwtVerify } from "jose";
import { randomBytes, createHash } from "node:crypto";
import { env } from "../config/env.js";

const secretKey = new TextEncoder().encode(env.SESSION_JWT_SECRET);
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface AccessTokenClaims {
  sub: string; // users.id
}

/** Issues a short-lived signed JWT carrying only the user id — kept deliberately minimal. */
export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(secretKey);
}

/** Verifies and decodes an access token. Throws if invalid, expired, or malformed. */
export async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
  const { payload } = await jwtVerify(token, secretKey);
  if (!payload.sub) {
    throw new Error("Access token missing subject claim");
  }
  return { sub: payload.sub };
}

/**
 * Refresh tokens are opaque random strings, not JWTs — only their hash is stored
 * (user_sessions.refresh_token_hash per Database Design §2), so a database leak
 * alone can never be used to forge a session.
 */
export function generateRefreshToken(): { token: string; hash: string; expiresAt: Date } {
  const token = randomBytes(48).toString("hex");
  const hash = hashRefreshToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  return { token, hash, expiresAt };
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
