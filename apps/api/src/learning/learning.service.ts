
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { lessonCompletions } from "../db/schema.js";
import { LESSON_IDS, type LessonId } from "./lesson-catalog.js";

class LearningService {
  async getProgress(userId: string) {
    const completions = await db
      .select({
        lessonId: lessonCompletions.lessonId,
        completedAt: lessonCompletions.completedAt,
      })
      .from(lessonCompletions)
      .where(eq(lessonCompletions.userId, userId))
      .orderBy(desc(lessonCompletions.completedAt));

    return {
      completedLessonIds: completions.map((item) => item.lessonId),
      completions,
      completedCount: completions.length,
      totalLessons: LESSON_IDS.length,
    };
  }

  async completeLesson(userId: string, lessonId: LessonId) {
    await db
      .insert(lessonCompletions)
      .values({ userId, lessonId })
      .onConflictDoNothing({
        target: [
          lessonCompletions.userId,
          lessonCompletions.lessonId,
        ],
      });

    // Return the existing record if the lesson was already completed.
    const [completion] = await db
      .select({
        lessonId: lessonCompletions.lessonId,
        completedAt: lessonCompletions.completedAt,
      })
      .from(lessonCompletions)
      .where(
        and(
          eq(lessonCompletions.userId, userId),
          eq(lessonCompletions.lessonId, lessonId),
        ),
      )
      .limit(1);

    if (!completion) {
      throw new Error("Failed to retrieve the saved lesson completion.");
    }

    return completion;
  }
}

export const learningService = new LearningService();
