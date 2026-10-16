
export const LESSON_IDS = [
  "pwd",
  "ls",
  "cd",
  "mkdir",
  "touch",
  "rm",
  "cp",
  "mv",
  "cat",
  "echo",
  "head",
  "tail",
  "grep",
  "wc",
  "sort",
  "chmod",
  "chown",
  "whoami",
  "clear",
  "man",
] as const;

export type LessonId = (typeof LESSON_IDS)[number];