import type { FastifyInstance } from "fastify";
import { requireAuth } from "../common/auth-middleware.js";
import { sandboxService } from "./sandbox.service.js";

/**
 * TEMPORARY — not part of the production API surface, not documented in
 * API_DESIGN.md, and deliberately not under the standard route conventions so
 * it's easy to grep for and delete. Exists solely to unblock Milestone 4's
 * frontend verification, since Milestone 6's real get-or-create Practice
 * sandbox endpoint doesn't exist yet.
 *
 * DELETE THIS FILE once Milestone 6 ships the real Practice API.
 */
export function registerDevRoutes(app: FastifyInstance): void {
  app.post("/api/v1/dev/sandbox", { preHandler: requireAuth }, async (request, reply) => {
    const sandbox = await sandboxService.createFromTemplate({
      userId: request.userId!,
      templateKey: "practice_default",
      sandboxType: "practice",
    });
    reply.status(201).send(sandbox);
  });
}
