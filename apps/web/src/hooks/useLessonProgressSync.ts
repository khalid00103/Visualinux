
import { useEffect, useRef } from "react";
import { completeLesson } from "../api/learning.js";
import { useAuthStore } from "../store/authStore.js";

export function useLessonProgressSync(
  lessonId: string,
  taskComplete: boolean,
): void {
  const accessToken = useAuthStore((state) => state.accessToken);
  const saveAttemptedRef = useRef(false);

  useEffect(() => {
    if (!taskComplete) {
      saveAttemptedRef.current = false;
      return;
    }

    if (!accessToken || saveAttemptedRef.current) {
      return;
    }

    saveAttemptedRef.current = true;

    void completeLesson(lessonId, accessToken).catch(
      (error: unknown) => {
        saveAttemptedRef.current = false;
        console.error(
          `Failed to save progress for lesson "${lessonId}".`,
          error,
        );
      },
    );
  }, [accessToken, lessonId, taskComplete]);
}
