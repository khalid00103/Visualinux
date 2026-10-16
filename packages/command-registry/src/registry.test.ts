import { describe, it, expect } from "vitest";
import { ALL_COMMANDS } from "./index.js";

// The exact list ratified in docs/DECISIONS.md (Decision #2) and enumerated in
// PRD §13's Complete Feature List — Tier 1 (filesystem/permissions) + Tier 2
// (text/content processing). This test exists specifically to catch scope
// drift: someone adding or removing a command later without updating the
// ratified decision should see this test fail.

const EXPECTED_TIER_1 = [
  "pwd", "ls", "cd", "mkdir", "rmdir", "touch", "rm", "cp", "mv", "ln",
  "tree", "chmod", "chown", "chgrp", "find", "stat", "du", "df",
];

const EXPECTED_TIER_2 = [
  "cat", "head", "tail", "grep", "sort", "uniq", "wc", "diff", "echo", "nano",
  "clear", "man", "whoami",
];

describe("command registry — MVP scope integrity", () => {
  it("contains exactly the ratified Tier 1 + Tier 2 commands, no more, no less", () => {
    const actualNames = ALL_COMMANDS.map((c) => c.name).sort();
    const expectedNames = [...EXPECTED_TIER_1, ...EXPECTED_TIER_2].sort();
    expect(actualNames).toEqual(expectedNames);
  });

  it("has no duplicate command names", () => {
    const names = ALL_COMMANDS.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("gives every command a non-empty description and example", () => {
    for (const command of ALL_COMMANDS) {
      expect(command.shortDescription.length).toBeGreaterThan(0);
      expect(command.longDescription.length).toBeGreaterThan(0);
      expect(command.exampleUsage.length).toBeGreaterThan(0);
    }
  });

  it("gives every command a grammar spec with a valid argument type", () => {
    const validArgumentTypes = ["path", "paths", "none", "text"];
    for (const command of ALL_COMMANDS) {
      expect(validArgumentTypes).toContain(command.grammarSpec.argumentType);
    }
  });

  it("only categorizes permission commands as chmod/chown/chgrp", () => {
    const permissionCommands = ALL_COMMANDS.filter((c) => c.category === "permissions").map((c) => c.name);
    expect(permissionCommands.sort()).toEqual(["chgrp", "chmod", "chown"]);
  });
});
