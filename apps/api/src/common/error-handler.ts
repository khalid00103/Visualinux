import type { FastifyInstance, FastifyError } from "fastify";
import { AppError } from "./errors.js";

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | AppError, request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      });
      return;
    }

    // Fastify's own validation errors (e.g. malformed JSON body) — normalize to the
    // same envelope rather than leaking Fastify's internal error shape to clients.
    if ("validation" in error && error.validation) {
      reply.status(400).send({
        error: {
          code: "VALIDATION_FAILED",
          message: error.message,
          details: error.validation,
        },
      });
      return;
    }

    // Anything unexpected: log the real error server-side, but never leak internal
    // details to the client — a deliberate, standard security practice.
    request.log.error(error);
    reply.status(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
      },
    });
  });
}
