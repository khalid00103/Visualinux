
import { apiRequest } from "./client";

export interface LessonCompletion {
  lessonId: string;
  completedAt: string;
}

export interface LearningProgress {
  completedLessonIds: string[];
  completions: LessonCompletion[];
  completedCount: number;
  totalLessons: number;
}

export function getLearningProgress(accessToken: string) {
  return apiRequest<LearningProgress>(
    "/api/v1/learning/progress",
    {
      method: "GET",
      accessToken,
    },
  );
}

export function completeLesson(
  lessonId: string,
  accessToken: string,
) {
  return apiRequest<LessonCompletion>(
    `/api/v1/learning/progress/${encodeURIComponent(lessonId)}/complete`,
    {
      method: "POST",
      accessToken,
    },
  );
}
