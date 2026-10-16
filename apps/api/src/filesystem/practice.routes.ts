import type { FastifyInstance } from "fastify";
import { requireAuth } from "../common/auth-middleware.js";
import { sandboxService } from "./sandbox.service.js";

export function registerPracticeRoutes(app: FastifyInstance): void {
  app.post(
    "/api/v1/practice/sandbox",
    { preHandler: requireAuth },
    async (request, reply) => {
      const sandbox = await sandboxService.getOrCreatePracticeSandbox(request.userId!);

      reply.status(200).send({
        id: sandbox!.id,
        currentDirectoryId: sandbox!.currentDirectoryId,
      });
    }
  );
}