import { describe, it, expect } from "vitest";
import { parseCommandLine } from "./parser.js";
import { FilesystemTree, type TreeNode } from "./tree.js";

function buildTreeWithFiles(): FilesystemTree {
  const nodes: TreeNode[] = [
    { id: "home", parentId: null, nodeType: "directory", name: "home", permissions: "rwxr-xr-x", owner: "user", groupOwner: "user", content: null, symlinkTargetId: null },
    { id: "f1", parentId: "home", nodeType: "file", name: "file1.txt", permissions: "rw-r--r--", owner: "user", groupOwner: "user", content: "", symlinkTargetId: null },
    { id: "f2", parentId: "home", nodeType: "file", name: "file2.txt", permissions: "rw-r--r--", owner: "user", groupOwner: "user", content: "", symlinkTargetId: null },
    { id: "f3", parentId: "home", nodeType: "file", name: "notes.log", permissions: "rw-r--r--", owner: "user", groupOwner: "user", content: "", symlinkTargetId: null },
  ];
  return new FilesystemTree(nodes);
}

describe("parseCommandLine — tokenizing", () => {
  it("splits a simple command into name, args, and flags", () => {
    const tree = buildTreeWithFiles();
    const result = parseCommandLine("mkdir -p project", "home", tree);
    expect(result.stages).toHaveLength(1);
    expect(result.stages[0]).toEqual({ commandName: "mkdir", args: ["project"], flags: ["-p"] });
  });

  it("keeps a double-quoted string as a single token even with spaces", () => {
    const tree = buildTreeWithFiles();
    const result = parseCommandLine('echo "hello world"', "home", tree);
    expect(result.stages[0].args).toEqual(["hello world"]);
  });

  it("keeps a single-quoted string as a single token", () => {
    const tree = buildTreeWithFiles();
    const result = parseCommandLine("echo 'hello world'", "home", tree);
    expect(result.stages[0].args).toEqual(["hello world"]);
  });
});

describe("parseCommandLine — pipes", () => {
  it("splits a piped command line into separate stages", () => {
    const tree = buildTreeWithFiles();
    const result = parseCommandLine("cat file1.txt | grep hello", "home", tree);
    expect(result.stages).toHaveLength(2);
    expect(result.stages[0].commandName).toBe("cat");
    expect(result.stages[1].commandName).toBe("grep");
  });

  it("handles a three-stage pipeline", () => {
    const tree = buildTreeWithFiles();
    const result = parseCommandLine("cat file1.txt | sort | uniq", "home", tree);
    expect(result.stages.map((s) => s.commandName)).toEqual(["cat", "sort", "uniq"]);
  });
});

describe("parseCommandLine — redirects", () => {
  it("detects a trailing overwrite redirect and strips it from the pipeline", () => {
    const tree = buildTreeWithFiles();
    const result = parseCommandLine("echo hello > output.txt", "home", tree);
    expect(result.redirect).toEqual({ mode: ">", targetPath: "output.txt" });
    expect(result.stages[0].commandName).toBe("echo");
    expect(result.stages[0].args).toEqual(["hello"]);
  });

  it("detects a trailing append redirect", () => {
    const tree = buildTreeWithFiles();
    const result = parseCommandLine("echo hello >> output.txt", "home", tree);
    expect(result.redirect).toEqual({ mode: ">>", targetPath: "output.txt" });
  });

  it("has no redirect when none is present", () => {
    const tree = buildTreeWithFiles();
    const result = parseCommandLine("ls", "home", tree);
    expect(result.redirect).toBeNull();
  });
});

describe("parseCommandLine — wildcard expansion", () => {
  it("expands a bare * to every child name in the current directory", () => {
    const tree = buildTreeWithFiles();
    const result = parseCommandLine("ls *", "home", tree);
    expect(result.stages[0].args.sort()).toEqual(["file1.txt", "file2.txt", "notes.log"].sort());
  });

  it("expands a suffix wildcard to only matching names", () => {
    const tree = buildTreeWithFiles();
    const result = parseCommandLine("ls *.txt", "home", tree);
    expect(result.stages[0].args.sort()).toEqual(["file1.txt", "file2.txt"].sort());
  });

  it("never expands the command name itself, even if it contained a wildcard character", () => {
    const tree = buildTreeWithFiles();
    const result = parseCommandLine("ls file1.txt", "home", tree);
    expect(result.stages[0].commandName).toBe("ls");
  });

  it("leaves a token with no wildcard character unchanged", () => {
    const tree = buildTreeWithFiles();
    const result = parseCommandLine("cat file1.txt", "home", tree);
    expect(result.stages[0].args).toEqual(["file1.txt"]);
  });
});
