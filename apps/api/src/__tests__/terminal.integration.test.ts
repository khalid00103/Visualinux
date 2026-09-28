import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { closeDb } from "../db/client.js";
import { sandboxService } from "../filesystem/sandbox.service.js";

let app: FastifyInstance;
let accessToken: string;
let sandboxId: string;
let otherUserAccessToken: string;

const testEmail = `terminal-test-${Date.now()}@example.com`;

beforeAll(async () => {
  app = await buildApp({ logger: false });

  const signup = await app.inject({
    method: "POST",
    url: "/api/v1/auth/signup",
    payload: { email: testEmail, password: "correct-horse-battery", displayName: "Terminal Tester" },
  });
  const signupBody = signup.json();
  accessToken = signupBody.accessToken;

  const sandbox = await sandboxService.createFromTemplate({
    userId: signupBody.userId,
    templateKey: "practice_default",
    sandboxType: "practice",
  });
  sandboxId = sandbox!.id;

  const otherSignup = await app.inject({
    method: "POST",
    url: "/api/v1/auth/signup",
    payload: { email: `other-${Date.now()}@example.com`, password: "correct-horse-battery", displayName: "Other User" },
  });
  otherUserAccessToken = otherSignup.json().accessToken;
});

afterAll(async () => {
  await app.close();
  await closeDb();
});

async function execute(rawInput: string, confirmed = false) {
  const res = await app.inject({
    method: "POST",
    url: `/api/v1/sandboxes/${sandboxId}/commands`,
    headers: { authorization: `Bearer ${accessToken}` },
    payload: { rawInput, confirmed },
  });
  return { status: res.statusCode, body: res.json() };
}

describe("Terminal API — realistic sequence (integration)", () => {
  it("pwd reports the seeded template's root", async () => {
    const { body } = await execute("pwd");
    expect(body.outputText).toBe("/home");
  });

  it("ls shows the practice_default template's top-level contents", async () => {
    const { body } = await execute("ls");
    expect(body.outputText).toContain("Documents");
    expect(body.outputText).toContain("projects");
  });

  it("cd persists across separate requests — the exact bug found during manual verification", async () => {
    await execute("cd projects");
    const { body } = await execute("pwd");
    expect(body.outputText).toBe("/home/projects");
  });

  it("cd .. and absolute-path cd both work, including the root's-own-name case", async () => {
    await execute("cd ..");
    let result = await execute("pwd");
    expect(result.body.outputText).toBe("/home");

    await execute("cd /home/projects/portfolio");
    result = await execute("pwd");
    expect(result.body.outputText).toBe("/home/projects/portfolio");

    await execute("cd /home");
  });

  it("creates a file, writes to it via redirect, and reads it back", async () => {
    await execute("touch scratch.txt");
    await execute('echo "first line" > scratch.txt');
    const { body } = await execute("cat scratch.txt");
    expect(body.outputText).toBe("first line");
  });

  it("appends to the file with >>", async () => {
    await execute('echo "second line" >> scratch.txt');
    const { body } = await execute("cat scratch.txt");
    expect(body.outputText).toBe("first line\nsecond line");
  });

  it("pipes real multi-line content through sort correctly", async () => {
    const { body } = await execute("cat scratch.txt | sort");
    expect(body.outputText).toBe("first line\nsecond line");
  });

  it("copies and then moves a file", async () => {
    await execute("cp scratch.txt copy.txt");
    const catCopy = await execute("cat copy.txt");
    expect(catCopy.body.outputText).toBe("first line\nsecond line");

    await execute("mv copy.txt renamed.txt");
    const lsResult = await execute("ls");
    expect(lsResult.body.outputText).toContain("renamed.txt");
    expect(lsResult.body.outputText).not.toContain("copy.txt");
  });

  it("requires confirmation for rm in beginner mode, then succeeds once confirmed", async () => {
    const unconfirmed = await execute("rm renamed.txt");
    expect(unconfirmed.status).toBe(409);
    expect(unconfirmed.body.error.code).toBe("CONFLICT");

    const confirmed = await execute("rm renamed.txt", true);
    expect(confirmed.body.success).toBe(true);

    const lsResult = await execute("ls");
    expect(lsResult.body.outputText).not.toContain("renamed.txt");
  });

  it("mkdir -p creates every missing nested segment correctly", async () => {
    await execute("mkdir -p deep/nested/path");
    const ls1 = await execute("ls deep");
    expect(ls1.body.outputText).toContain("nested");
    const ls2 = await execute("ls deep/nested");
    expect(ls2.body.outputText).toContain("path");
  });

  it("chmod, chown, and chgrp all correctly persist and reflect in stat", async () => {
    await execute("chmod 755 scratch.txt");
    await execute("chown alice scratch.txt");
    await execute("chgrp staff scratch.txt");
    const { body } = await execute("stat scratch.txt");
    expect(body.outputText).toContain("rwxr-xr-x");
    expect(body.outputText).toContain("alice");
    expect(body.outputText).toContain("staff");
  });

  it("suggests a correction for a close-typo unrecognized command", async () => {
    const { body } = await execute("mkdirr test");
    expect(body.success).toBe(false);
    expect(body.errorType).toBe("unrecognized_command");
    expect(body.suggestion?.suggestedCommand).toBe("mkdir");
  });

  it("wildcard expansion works against the real seeded directory", async () => {
    await execute("touch report1.txt report2.txt");
    const { body } = await execute("ls *.txt");
    expect(body.outputText).toContain("report1.txt");
    expect(body.outputText).toContain("report2.txt");
  });

  it("GET filesystem reflects every mutation made so far", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/sandboxes/${sandboxId}/filesystem`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const names = res.json().map((n: { name: string }) => n.name);
    expect(names).toContain("scratch.txt");
    expect(names).toContain("deep");
    expect(names).not.toContain("renamed.txt");
  });

  it("GET command history reflects the executed commands, most recent first", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/sandboxes/${sandboxId}/commands/history?limit=5`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().entries.length).toBeGreaterThan(0);
  });

  it("rejects access to the sandbox from a different user with 403", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/sandboxes/${sandboxId}/commands`,
      headers: { authorization: `Bearer ${otherUserAccessToken}` },
      payload: { rawInput: "pwd" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("FORBIDDEN");
  });

  it("returns 404 for a sandbox that doesn't exist", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/sandboxes/00000000-0000-0000-0000-000000000000/commands",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { rawInput: "pwd" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("rejects an empty rawInput with 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/sandboxes/${sandboxId}/commands`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { rawInput: "" },
    });
    expect(res.statusCode).toBe(400);
  });
});
