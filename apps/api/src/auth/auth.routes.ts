import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AuthResponse, LoginRequest, RefreshResponse, SignUpRequest } from "@visualinux/shared-types";
import { authService } from "./auth.service.js";
import { parseOrThrow } from "../common/validation.js";
import { requireAuth } from "../common/auth-middleware.js";
import { UnauthorizedError, ValidationError } from "../common/errors.js";

const REFRESH_COOKIE_NAME = "visualinux_refresh_token";
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
  path: "/api/v1/auth",
};

// API Design §1 validation rules, expressed as zod schemas.
const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(1).max(50),
  timezone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export function registerAuthRoutes(app: FastifyInstance): void {
  app.post<{ Body: SignUpRequest }>("/api/v1/auth/signup", async (request, reply) => {
    const body = parseOrThrow(signUpSchema, request.body);
    const result = await authService.signUp(body);

    reply.setCookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);
    const response: AuthResponse = { userId: result.userId, accessToken: result.accessToken };
    reply.status(201).send(response);
  });

  app.post<{ Body: LoginRequest }>("/api/v1/auth/login", async (request, reply) => {
    const body = parseOrThrow(loginSchema, request.body);
    const result = await authService.login(body);

    reply.setCookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);
    const response: AuthResponse = { userId: result.userId, accessToken: result.accessToken };
    reply.status(200).send(response);
  });

  app.post("/api/v1/auth/refresh", async (request, reply) => {
    const refreshToken = request.cookies[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      throw new UnauthorizedError("No refresh token present.");
    }

    const result = await authService.refresh(refreshToken);
    const response: RefreshResponse = { accessToken: result.accessToken };
    reply.status(200).send(response);
  });

  app.post("/api/v1/auth/logout", async (request, reply) => {
    const refreshToken = request.cookies[REFRESH_COOKIE_NAME];
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    reply.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_OPTIONS.path });
    reply.status(204).send();
  });

  app.post("/api/v1/auth/logout-all", { preHandler: requireAuth }, async (request, reply) => {
    await authService.logoutAll(request.userId!);
    reply.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_OPTIONS.path });
    reply.status(204).send();
  });

  app.post("/api/v1/auth/password-reset/request", async (request, reply) => {
    const body = parseOrThrow(passwordResetRequestSchema, request.body);
    await authService.requestPasswordReset(body.email);
    // Always 202, regardless of whether the email exists — API Design §1.
    reply.status(202).send();
  });

  app.post("/api/v1/auth/password-reset/confirm", async () => {
    // Delegates to the identity provider's own hosted flow in production (Auth0);
    // see Auth0IdentityProvider.confirmPasswordReset for why this is a no-op path
    // for the standard managed-provider flow. Kept as a route for API-contract
    // completeness (API Design §1) and for providers that do support it directly.
    throw new ValidationError(
      "Password reset is completed via the emailed link, not this endpoint, with the current identity provider."
    );
  });

  app.get("/api/v1/auth/sessions", { preHandler: requireAuth }, async (request, reply) => {
    const currentRefreshToken = request.cookies[REFRESH_COOKIE_NAME];
    const sessions = await authService.listSessions(request.userId!, currentRefreshToken);
    reply.status(200).send(sessions);
  });

  app.delete<{ Params: { sessionId: string } }>(
    "/api/v1/auth/sessions/:sessionId",
    { preHandler: requireAuth },
    async (request, reply) => {
      await authService.revokeSession(request.userId!, request.params.sessionId);
      reply.status(204).send();
    }
  );
}
