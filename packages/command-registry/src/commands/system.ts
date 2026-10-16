import type { CommandDefinition } from "../types.js";

/** Small shell/session commands taught by VisuaLinux lessons. */
export const systemCommands: CommandDefinition[] = [
  {
    name: "clear",
    category: "text_processing",
    difficulty: "beginner",
    shortDescription: "Clear the terminal display",
    longDescription: "Clears the current terminal output without changing the filesystem.",
    exampleUsage: "clear",
    iconKey: "eraser",
    animationType: "none",
    grammarSpec: { minArgs: 0, maxArgs: 0, argumentType: "none" },
    flags: [],
  },
  {
    name: "man",
    category: "text_processing",
    difficulty: "beginner",
    shortDescription: "Read a command manual",
    longDescription: "Displays the manual entry for a supported command.",
    exampleUsage: "man ls",
    iconKey: "book-open",
    animationType: "none",
    grammarSpec: { minArgs: 1, maxArgs: 1, argumentType: "path" },
    flags: [],
  },
  {
    name: "whoami",
    category: "text_processing",
    difficulty: "beginner",
    shortDescription: "Display the current simulated user",
    longDescription: "Prints the username used by the simulated shell.",
    exampleUsage: "whoami",
    iconKey: "user",
    animationType: "none",
    grammarSpec: { minArgs: 0, maxArgs: 0, argumentType: "none" },
    flags: [],
  },
];
