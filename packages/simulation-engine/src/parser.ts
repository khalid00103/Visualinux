import type { FilesystemTree } from "./tree.js";

export interface ParsedStage {
  commandName: string;
  args: string[];
  flags: string[];
}

export interface ParsedCommandLine {
  stages: ParsedStage[];
  redirect: { mode: ">" | ">>"; targetPath: string } | null;
}

/** Splits a raw string into tokens, respecting single/double-quoted substrings. */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quoteChar: string | null = null;

  for (const char of input) {
    if (quoteChar) {
      if (char === quoteChar) {
        quoteChar = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quoteChar = char;
      continue;
    }

    if (char === " ") {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current.length > 0) tokens.push(current);
  return tokens;
}

/**
 * Expands a single wildcard token (`*`, `prefix*`, `*suffix`) against the names
 * of the current directory's children. A token with no `*` is returned as-is.
 * MVP scope: only the current directory is searched (no recursive globbing).
 */
function expandWildcard(token: string, currentDirectoryId: string, tree: FilesystemTree): string[] {
  if (!token.includes("*")) return [token];

  const children = tree.getChildren(currentDirectoryId);
  if (token === "*") return children.map((c) => c.name);

  const [prefix, suffix] = token.split("*");
  return children.filter((c) => c.name.startsWith(prefix) && c.name.endsWith(suffix)).map((c) => c.name);
}

/**
 * Parses a full command line into one or more pipeline stages plus an optional
 * trailing redirect. Wildcard expansion happens here, against the given
 * current-directory context, before stages are split into command/args/flags.
 */
export function parseCommandLine(
  rawInput: string,
  currentDirectoryId: string,
  tree: FilesystemTree
): ParsedCommandLine {
  const trimmed = rawInput.trim();

  // Redirect detection: only meaningful at the very end of the full line, applying
  // to the pipeline's final output.
  let redirect: ParsedCommandLine["redirect"] = null;
  let withoutRedirect = trimmed;

  const appendMatch = trimmed.match(/^(.*)\s>>\s*(\S+)$/);
  const overwriteMatch = trimmed.match(/^(.*)\s>\s*(\S+)$/);

  if (appendMatch) {
    withoutRedirect = appendMatch[1];
    redirect = { mode: ">>", targetPath: appendMatch[2] };
  } else if (overwriteMatch) {
    withoutRedirect = overwriteMatch[1];
    redirect = { mode: ">", targetPath: overwriteMatch[2] };
  }

  const pipelineSegments = withoutRedirect.split("|").map((s) => s.trim());

  const stages: ParsedStage[] = pipelineSegments.map((segment) => {
    const rawTokens = tokenize(segment);
    const expandedTokens = rawTokens.flatMap((token, index) =>
      // Never wildcard-expand the command name itself (index 0).
      index === 0 ? [token] : expandWildcard(token, currentDirectoryId, tree)
    );

    const [commandName, ...rest] = expandedTokens;
    const flags = rest.filter((t) => t.startsWith("-"));
    const args = rest.filter((t) => !t.startsWith("-"));

    return { commandName: commandName ?? "", args, flags };
  });

  return { stages, redirect };
}
