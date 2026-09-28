import { describe, it, expect } from "vitest";
import { buildInitialFilesystem, runMkdir } from "./localMkdirFilesystem.js";

describe("runMkdir", () => {
  it("creates a directory under the current directory", () => {
    const { nodes, studentId } = buildInitialFilesystem();
    const result = runMkdir("mkdir my-project", nodes, studentId);
    expect(result.success).toBe(true);
    expect(result.createdName).toBe("my-project");
    expect(result.nodes.some((n) => n.name === "my-project" && n.parentId === studentId)).toBe(true);
  });

  it("returns missing operand for bare mkdir", () => {
    const { nodes, studentId } = buildInitialFilesystem();
    const result = runMkdir("mkdir", nodes, studentId);
    expect(result.success).toBe(false);
    expect(result.message).toContain("missing operand");
  });

  it("returns too many arguments for multiple names", () => {
    const { nodes, studentId } = buildInitialFilesystem();
    const result = runMkdir("mkdir one two", nodes, studentId);
    expect(result.success).toBe(false);
    expect(result.message).toContain("too many arguments");
  });

  it("rejects -p as unsupported in this lesson", () => {
    const { nodes, studentId } = buildInitialFilesystem();
    const result = runMkdir("mkdir -p my-project", nodes, studentId);
    expect(result.success).toBe(false);
    expect(result.message).toContain("not supported in this lesson");
  });

  it("rejects a duplicate directory with File exists", () => {
    const { nodes, studentId } = buildInitialFilesystem();
    const first = runMkdir("mkdir my-project", nodes, studentId);
    const second = runMkdir("mkdir my-project", first.nodes, studentId);
    expect(second.success).toBe(false);
    expect(second.message).toContain("File exists");
    expect(second.nodes.filter((n) => n.name === "my-project")).toHaveLength(1);
  });

  it("rejects any command other than mkdir", () => {
    const { nodes, studentId } = buildInitialFilesystem();
    const result = runMkdir("touch test.txt", nodes, studentId);
    expect(result.success).toBe(false);
    expect(result.message).toContain("only teaches the mkdir command");
  });

  it("rejects an invalid directory name", () => {
    const { nodes, studentId } = buildInitialFilesystem();
    const result = runMkdir("mkdir ../etc", nodes, studentId);
    expect(result.success).toBe(false);
  });
});
