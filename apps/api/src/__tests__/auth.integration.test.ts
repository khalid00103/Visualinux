import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { closeDb } from "../db/client.js";

// Uses a unique email per test run so repeated runs never collide with leftover data
// from a previous run against the same local dev database.
const testEmail = `test-${Date.now()}@example.com`;
const testPassword = "correct-horse-battery";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp({ logger: false });
});

afterAll(async () => {
  await app.close();
  await closeDb();
});

function extractCookie(response: { headers: Record<string, unknown> }): string {
  const setCookie = response.headers["set-cookie"];
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return String(raw).split(";")[0];
}

describe("Auth flow (integration)", () => {
  let accessToken: string;
  let refreshCookie: string;

  it("signs up a new user", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/signup",
      payload: { email: testEmail, password: testPassword, displayName: "Test User" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.userId).toBeTypeOf("string");
    expect(body.accessToken).toBeTypeOf("string");

    accessToken = body.accessToken;
    refreshCookie = extractCookie(res);
  });

  it("rejects a duplicate signup with 409", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/signup",
      payload: { email: testEmail, password: testPassword, displayName: "Test User" },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("CONFLICT");
  });

  it("rejects signup with an invalid email via validation", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/signup",
      payload: { email: "not-an-email", password: testPassword, displayName: "Test User" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects login with the wrong password", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: testEmail, password: "wrong-password" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("logs in successfully with the correct password", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: testEmail, password: testPassword },
    });

    expect(res.statusCode).toBe(200);
    accessToken = res.json().accessToken;
    refreshCookie = extractCookie(res);
  });

  it("rejects an unauthenticated request to /users/me", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/users/me" });
    expect(res.statusCode).toBe(401);
  });

  it("returns the authenticated user's profile", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/users/me",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().email).toBe(testEmail);
  });

  it("accepts a valid alternative refresh token from the cookie", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: { cookie: refreshCookie },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().accessToken).toBeTypeOf("string");
  });

  it("rejects refresh with no cookie present", async () => {
    const res = await app.inject({ method: "POST", url: "/api/v1/auth/refresh" });
    expect(res.statusCode).toBe(401);
  });

  it("logs out and then rejects a subsequent refresh with the same token", async () => {
    const logoutRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: { cookie: refreshCookie },
    });
    expect(logoutRes.statusCode).toBe(204);

    const refreshRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: { cookie: refreshCookie },
    });
    expect(refreshRes.statusCode).toBe(401);
  });
});
