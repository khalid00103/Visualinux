import type { FastifyInstance } from "fastify";
import { requireAuth } from "../common/auth-middleware.js";
import { ForbiddenError, NotFoundError } from "../common/errors.js";
import { sandboxesRepository } from "./sandbox.repository.js";
import { sandboxService } from "./sandbox.service.js";

async function assertOwnership(sandboxId: string, userId: string) {
  const sandbox = await sandboxesRepository.findById(sandboxId);
  if (!sandbox) throw new NotFoundError("Sandbox not found.");
  if (sandbox.userId !== userId) throw new ForbiddenError("This sandbox belongs to another user.");
  return sandbox;
}

export function registerFilesystemRoutes(app: FastifyInstance): void {
  app.get<{ Params: { sandboxId: string } }>(
    "/api/v1/sandboxes/:sandboxId/filesystem",
    { preHandler: requireAuth },
    async (request, reply) => {
      await assertOwnership(request.params.sandboxId, request.userId!);
      const tree = await sandboxService.getTreeSummary(request.params.sandboxId);
      reply.status(200).send(tree);
    }
  );

  app.get<{ Params: { sandboxId: string; nodeId: string } }>(
    "/api/v1/sandboxes/:sandboxId/filesystem/nodes/:nodeId",
    { preHandler: requireAuth },
    async (request, reply) => {
      await assertOwnership(request.params.sandboxId, request.userId!);
      const node = await sandboxService.getNodeDetail(request.params.sandboxId, request.params.nodeId);
      reply.status(200).send(node);
    }
  );
}
