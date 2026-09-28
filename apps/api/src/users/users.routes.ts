import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { UpdateProfileRequest } from "@visualinux/shared-types";
import { usersService } from "./users.service.js";
import { parseOrThrow } from "../common/validation.js";
import { requireAuth } from "../common/auth-middleware.js";

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  timezone: z.string().optional(),
});

export function registerUsersRoutes(app: FastifyInstance): void {
  app.get("/api/v1/users/me", { preHandler: requireAuth }, async (request, reply) => {
    const profile = await usersService.getProfile(request.userId!);
    reply.status(200).send(profile);
  });

  app.patch<{ Body: UpdateProfileRequest }>(
    "/api/v1/users/me",
    { preHandler: requireAuth },
    async (request, reply) => {
      const body = parseOrThrow(updateProfileSchema, request.body);
      const profile = await usersService.updateProfile(request.userId!, body);
      reply.status(200).send(profile);
    }
  );

  app.delete("/api/v1/users/me", { preHandler: requireAuth }, async (request, reply) => {
    await usersService.deleteAccount(request.userId!);
    reply.status(202).send();
  });

  app.get<{ Params: { userId: string } }>("/api/v1/users/:userId/public-profile", async (request, reply) => {
    const profile = await usersService.getPublicProfile(request.params.userId);
    reply.status(200).send(profile);
  });
}
