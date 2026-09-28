import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "../db/client.js";
import { commandHistory } from "../db/schema.js";
import { requireAuth } from "../common/auth-middleware.js";
import { ForbiddenError, NotFoundError } from "../common/errors.js";
import { parseOrThrow } from "../common/validation.js";
import { sandboxesRepository } from "../filesystem/sandbox.repository.js";
import { userSettingsRepository } from "../users/users.repository.js";
import { terminalService } from "./terminal.service.js";
import type { CommandExecutionRequest } from "@visualinux/shared-types";

const executeCommandSchema = z.object({
  rawInput: z
    .string()
    .trim()
    .min(1, "rawInput must not be empty")
    .max(1000, "rawInput must be 1000 characters or fewer"),
  confirmed: z.boolean().optional(),
});

const historyQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

async function assertOwnership(sandboxId: string, userId: string) {
  const sandbox = await sandboxesRepository.findById(sandboxId);
  if (!sandbox) throw new NotFoundError("Sandbox not found.");
  if (sandbox.userId !== userId) throw new ForbiddenError("This sandbox belongs to another user.");
  return sandbox;
}

export function registerTerminalRoutes(app: FastifyInstance): void {
  app.post<{ Params: { sandboxId: string }; Body: CommandExecutionRequest }>(
    "/api/v1/sandboxes/:sandboxId/commands",
    { preHandler: requireAuth },
    async (request, reply) => {
      await assertOwnership(request.params.sandboxId, request.userId!);
      const body = parseOrThrow(executeCommandSchema, request.body);

      const settings = await userSettingsRepository.findByUserId(request.userId!);
      const experienceMode = settings?.experienceMode ?? "beginner";

      const result = await terminalService.executeCommand({
        sandboxId: request.params.sandboxId,
        userId: request.userId!,
        rawInput: body.rawInput,
        confirmed: body.confirmed ?? false,
        experienceMode,
      });

      // Per API Design §0: a command that fails as a Linux command (unrecognized,
      // permission denied, etc.) is still a successful API interaction — always 200.
      reply.status(200).send(result);
    }
  );

  app.get<{ Params: { sandboxId: string } }>(
    "/api/v1/sandboxes/:sandboxId/commands/history",
    { preHandler: requireAuth },
    async (request, reply) => {
      await assertOwnership(request.params.sandboxId, request.userId!);
      const query = parseOrThrow(historyQuerySchema, request.query);

      const cursorCondition = query.cursor ? lt(commandHistory.executedAt, decodeCursor(query.cursor)) : undefined;

      const rows = await db
        .select()
        .from(commandHistory)
        .where(
          cursorCondition
            ? and(eq(commandHistory.sandboxId, request.params.sandboxId), cursorCondition)
            : eq(commandHistory.sandboxId, request.params.sandboxId)
        )
        .orderBy(desc(commandHistory.executedAt))
        .limit(query.limit);

      const nextCursor = rows.length === query.limit ? encodeCursor(rows[rows.length - 1].executedAt) : null;

      reply.status(200).send({
        entries: rows.map((r) => ({
          commandHistoryId: r.id,
          rawInput: r.rawInput,
          commandName: r.commandName,
          wasSuccessful: r.wasSuccessful,
          executedAt: r.executedAt.toISOString(),
        })),
        nextCursor,
      });
    }
  );
}

function encodeCursor(date: Date): string {
  return Buffer.from(date.toISOString()).toString("base64url");
}

function decodeCursor(cursor: string): Date {
  return new Date(Buffer.from(cursor, "base64url").toString("utf-8"));
}
