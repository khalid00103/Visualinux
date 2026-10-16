
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../common/auth-middleware.js";
import { parseOrThrow } from "../common/validation.js";
import { learningService } from "./learning.service.js";
import { LESSON_IDS } from "./lesson-catalog.js";

const completeLessonParamsSchema = z.object({
  lessonId: z.enum(LESSON_IDS),
});

export function registerLearningRoutes(app: FastifyInstance): void {
  app.get(
    "/api/v1/learning/progress",
    { preHandler: requireAuth },
    async (request, reply) => {
      const progress = await learningService.getProgress(request.userId!);
      reply.status(200).send(progress);
    },
  );

  app.post<{ Params: { lessonId: string } }>(
    "/api/v1/learning/progress/:lessonId/complete",
    { preHandler: requireAuth },
    async (request, reply) => {
      const params = parseOrThrow(
        completeLessonParamsSchema,
        request.params,
      );

      const completion = await learningService.completeLesson(
        request.userId!,
        params.lessonId,
      );

      reply.status(200).send(completion);
    },
  );
}
