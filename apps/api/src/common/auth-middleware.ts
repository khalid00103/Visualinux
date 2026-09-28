import type { FastifyRequest } from "fastify";
import { verifyAccessToken } from "../auth/tokens.js";
import { UnauthorizedError } from "./errors.js";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
  }
}

export async function requireAuth(request: FastifyRequest): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new UnauthorizedError();
  }

  const token = header.slice("Bearer ".length);

  try {
    const claims = await verifyAccessToken(token);
    request.userId = claims.sub;
  } catch {
    throw new UnauthorizedError("Access token is invalid or expired.");
  }
}
