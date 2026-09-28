import { describe, it, expect } from "vitest";
import { signAccessToken, verifyAccessToken, generateRefreshToken, hashRefreshToken } from "./tokens.js";

describe("access tokens", () => {
  it("round-trips a user id through sign and verify", async () => {
    const token = await signAccessToken("user-123");
    const claims = await verifyAccessToken(token);
    expect(claims.sub).toBe("user-123");
  });

  it("rejects a malformed token", async () => {
    await expect(verifyAccessToken("not-a-real-token")).rejects.toThrow();
  });

  it("rejects a token signed with a different secret", async () => {
    // A token that's simply the wrong shape/signature should fail verification —
    // this is what actually matters for session security, not just "well-formed JWTs work."
    const token = await signAccessToken("user-123");
    const tampered = token.slice(0, -5) + "AAAAA";
    await expect(verifyAccessToken(tampered)).rejects.toThrow();
  });
});

describe("refresh tokens", () => {
  it("generates a token whose hash matches hashRefreshToken", () => {
    const { token, hash } = generateRefreshToken();
    expect(hashRefreshToken(token)).toBe(hash);
  });

  it("generates a future expiry date", () => {
    const { expiresAt } = generateRefreshToken();
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("generates a different token on every call", () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a.token).not.toEqual(b.token);
  });
});
