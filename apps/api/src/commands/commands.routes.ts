import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { commandsService } from "./commands.service.js";
import { parseOrThrow } from "../common/validation.js";
import { ValidationError } from "../common/errors.js";

const listQuerySchema = z.object({
  category: z.enum(["filesystem", "permissions", "text_processing"]).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
});

const autocompleteQuerySchema = z.object({
  prefix: z.string().min(1).max(30),
});

export function registerCommandsRoutes(app: FastifyInstance): void {
  app.get("/api/v1/commands", async (request, reply) => {
    const query = parseOrThrow(listQuerySchema, request.query);
    const result = await commandsService.list(query);
    reply.status(200).send(result);
  });

  // Registered before the dynamic /:name route so "autocomplete" is never
  // mistakenly matched as a literal command name.
  app.get("/api/v1/commands/autocomplete", async (request, reply) => {
    const parsed = autocompleteQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      // API Design §7: an empty/missing prefix is explicitly a 400, not "return
      // everything" — keeps this endpoint's response always small and fast.
      throw new ValidationError("A non-empty 'prefix' query parameter is required.", parsed.error.flatten());
    }
    const result = await commandsService.autocomplete(parsed.data.prefix);
    reply.status(200).send(result);
  });

  app.get<{ Params: { name: string } }>("/api/v1/commands/:name", async (request, reply) => {
    const result = await commandsService.getByName(request.params.name);
    reply.status(200).send(result);
  });
}
