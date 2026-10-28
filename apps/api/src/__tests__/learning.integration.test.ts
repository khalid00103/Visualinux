
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../application.js";
import { closeDb } from "../db/client.js";

describe("Learning progress API", () => {
  let app: FastifyInstance;
  let accessToken = "";

  const testEmail = `learning-${Date.now()}@example.com`;
  const testPassword = "correct-horse-battery";

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
    await closeDb();
  });

  it("rejects requests without authentication", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/learning/progress",
    });

    expect(response.statusCode).toBe(401);
  });

  it("saves lesson progress and prevents duplicate completions", async () => {
    const signupResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/signup",
      payload: {
        email: testEmail,
        password: testPassword,
        displayName: "Learning Test User",
      },
    });

    expect(signupResponse.statusCode).toBe(201);

    const signupBody = signupResponse.json() as {
      accessToken: string;
    };

    expect(signupBody.accessToken).toBeTruthy();
    accessToken = signupBody.accessToken;

    const headers = {
      authorization: `Bearer ${accessToken}`,
    };

    const initialResponse = await app.inject({
      method: "GET",
      url: "/api/v1/learning/progress",
      headers,
    });

    expect(initialResponse.statusCode).toBe(200);

    const initialProgress = initialResponse.json() as {
      completedLessonIds: string[];
      completedCount: number;
      totalLessons: number;
    };

    expect(initialProgress.completedLessonIds).toEqual([]);
    expect(initialProgress.completedCount).toBe(0);
    expect(initialProgress.totalLessons).toBe(20);

    const completionResponse = await app.inject({
      method: "POST",
      url: "/api/v1/learning/progress/mkdir/complete",
      headers,
    });

    expect(completionResponse.statusCode).toBe(200);
    expect(
      completionResponse.json().lessonId,
    ).toBe("mkdir");

    const duplicateResponse = await app.inject({
      method: "POST",
      url: "/api/v1/learning/progress/mkdir/complete",
      headers,
    });

    expect(duplicateResponse.statusCode).toBe(200);

    const finalResponse = await app.inject({
      method: "GET",
      url: "/api/v1/learning/progress",
      headers,
    });

    expect(finalResponse.statusCode).toBe(200);

    const finalProgress = finalResponse.json() as {
      completedLessonIds: string[];
      completedCount: number;
      totalLessons: number;
    };

    expect(finalProgress.completedLessonIds).toContain("mkdir");
    expect(finalProgress.completedCount).toBe(1);
    expect(finalProgress.totalLessons).toBe(20);
  });

  it("rejects unknown lesson IDs", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/learning/progress/not-a-real-lesson/complete",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(400);
  });
});
