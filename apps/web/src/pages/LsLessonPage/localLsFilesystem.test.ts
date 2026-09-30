import { describe, expect, it } from "vitest";
import {
  buildInitialFilesystem,
  runLs,
} from "./localLsFilesystem.js";

describe("local ls lesson", () => {
  it("lists the contents of the current directory", () => {
    const initial = buildInitialFilesystem();

    const result = runLs(
      "ls",
      initial.nodes,
      initial.studentId,
    );

    expect(result.success).toBe(true);
    expect(result.listedNames).toEqual([
      "documents",
      "downloads",
      "notes.txt",
    ]);
    expect(result.message).toBe(
      "documents  downloads  notes.txt",
    );
  });

  it("rejects ls options and paths", () => {
    const initial = buildInitialFilesystem();

    const result = runLs(
      "ls -l",
      initial.nodes,
      initial.studentId,
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain(
      "options and paths are not supported",
    );
  });

  it("rejects unsupported commands", () => {
    const initial = buildInitialFilesystem();

    const result = runLs(
      "pwd",
      initial.nodes,
      initial.studentId,
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain(
      "only teaches the ls command",
    );
  });

  it("rejects empty input", () => {
    const initial = buildInitialFilesystem();

    const result = runLs(
      "",
      initial.nodes,
      initial.studentId,
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Please type a command.",
    );
  });
});