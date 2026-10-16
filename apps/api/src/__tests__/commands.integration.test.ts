import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { closeDb } from "../db/client.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp({ logger: false });
});

afterAll(async () => {
  await app.close();
  await closeDb();
});

describe("Commands API (integration)", () => {
  it("lists all 31 seeded commands", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/commands" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(31);
  });

  it("filters by category", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/commands?category=permissions" });
    expect(res.statusCode).toBe(200);
    const names = res.json().map((c: { name: string }) => c.name).sort();
    expect(names).toEqual(["chgrp", "chmod", "chown"]);
  });

  it("rejects an invalid category filter with 400", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/commands?category=nonsense" });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VALIDATION_FAILED");
  });

  it("returns full detail including flags for a known command", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/commands/mkdir" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe("mkdir");
    expect(body.animationType).toBe("create");
    expect(body.flags).toEqual(expect.arrayContaining([expect.objectContaining({ flag: "-p" })]));
  });

  it("returns 404 for an unknown command", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/commands/notarealcommand" });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("NOT_FOUND");
  });

  it("autocompletes a unique prefix to the single matching command", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/commands/autocomplete?prefix=mk" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("mkdir");
  });

  it("autocompletes an ambiguous prefix to all matching commands", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/commands/autocomplete?prefix=ch" });
    expect(res.statusCode).toBe(200);
    const names = res.json().map((c: { name: string }) => c.name).sort();
    expect(names).toEqual(["chgrp", "chmod", "chown"]);
  });

  it("rejects an empty prefix with 400 rather than returning the full list", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/commands/autocomplete?prefix=" });
    expect(res.statusCode).toBe(400);
  });

  it("returns each autocomplete suggestion with the full field set the UI needs", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/commands/autocomplete?prefix=mkdir" });
    const [suggestion] = res.json();
    expect(suggestion).toMatchObject({
      name: expect.any(String),
      iconKey: expect.any(String),
      shortDescription: expect.any(String),
      exampleUsage: expect.any(String),
      difficulty: expect.any(String),
      category: expect.any(String),
    });
  });
});
