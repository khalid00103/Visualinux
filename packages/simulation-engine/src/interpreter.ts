import type { FilesystemTree } from "./tree.js";
import type { ParsedCommandLine } from "./parser.js";
import { COMMAND_HANDLERS } from "./handlers/index.js";
import { generateId } from "./ids.js";
import type { HandlerResult } from "./types.js";

export interface CommandRegistryLookup {
  findByName(name: string): { minArgs: number; maxArgs: number | null } | undefined;
  suggestSimilar(name: string): { name: string; description: string } | undefined;
}

export interface InterpretResult {
  success: boolean;
  outputText: string;
  commandName: string | null;
  errorType?: string;
  suggestion?: { suggestedCommand: string; description: string };
  operations: HandlerResult["operations"];
  animationEvents: HandlerResult["animationEvents"];
  newCurrentDirectoryId?: string;
  isDestructive: boolean;
}

export function interpret(
  parsed: ParsedCommandLine,
  currentDirectoryId: string,
  tree: FilesystemTree,
  registry: CommandRegistryLookup
): InterpretResult {
  const firstStage = parsed.stages[0];
  const primaryCommandName = firstStage?.commandName ?? "";

  const definition = registry.findByName(primaryCommandName);
  if (!definition) {
    const suggestion = registry.suggestSimilar(primaryCommandName);
    return {
      success: false,
      outputText: suggestion
        ? `Command not found: ${primaryCommandName}. Did you mean '${suggestion.name}'? ${suggestion.description}`
        : `Command not found: ${primaryCommandName}`,
      commandName: null,
      errorType: "unrecognized_command",
      suggestion: suggestion ? { suggestedCommand: suggestion.name, description: suggestion.description } : undefined,
      operations: [],
      animationEvents: [],
      isDestructive: false,
    };
  }

  let stdin: string | undefined;
  let allOperations: HandlerResult["operations"] = [];
  let allAnimationEvents: HandlerResult["animationEvents"] = [];
  let newCurrentDirectoryId: string | undefined;
  let finalOutput = "";
  let isDestructive = false;

  for (const [stageIndex, stage] of parsed.stages.entries()) {
    const stageDefinition = registry.findByName(stage.commandName);
    if (!stageDefinition) {
      return {
        success: false,
        outputText: `Command not found: ${stage.commandName}`,
        commandName: primaryCommandName,
        errorType: "unrecognized_command",
        operations: [],
        animationEvents: [],
        isDestructive: false,
      };
    }

    // A stage past the first receives piped stdin, which substitutes for the
    // file-path argument its grammar spec would otherwise require — e.g.
    // `sort` normally needs one file argument, but `cat file | sort` needs
    // zero, since stdin fills that role. maxArgs is unaffected: `grep -i`
    // still can't take more positional args than its spec allows.
    const receivesStdin = stageIndex > 0;
    const effectiveDefinition = receivesStdin
      ? { ...stageDefinition, minArgs: Math.max(0, stageDefinition.minArgs - 1) }
      : stageDefinition;

    const argCountError = validateArgCount(stage.commandName, stage.args.length, effectiveDefinition);
    if (argCountError) {
      return {
        success: false,
        outputText: argCountError,
        commandName: primaryCommandName,
        errorType: "invalid_arguments",
        operations: allOperations,
        animationEvents: allAnimationEvents,
        isDestructive: false,
      };
    }

    const handler = COMMAND_HANDLERS[stage.commandName];
    if (!handler) {
      return {
        success: false,
        outputText: `'${stage.commandName}' is registered but has no implementation yet.`,
        commandName: primaryCommandName,
        errorType: "unrecognized_command",
        operations: allOperations,
        animationEvents: allAnimationEvents,
        isDestructive: false,
      };
    }

    const result = handler({ tree, currentDirectoryId, args: stage.args, flags: stage.flags, stdin });

    allOperations = allOperations.concat(result.operations);
    allAnimationEvents = allAnimationEvents.concat(result.animationEvents);
    if (result.newCurrentDirectoryId) newCurrentDirectoryId = result.newCurrentDirectoryId;
    if (result.isDestructive) isDestructive = true;

    if (!result.success) {
      return {
        success: false,
        outputText: result.outputText,
        commandName: primaryCommandName,
        errorType: result.errorType,
        operations: allOperations,
        animationEvents: allAnimationEvents,
        newCurrentDirectoryId,
        isDestructive,
      };
    }

    finalOutput = result.outputText;
    stdin = result.outputText; // feeds the next pipeline stage, if any
  }

  if (parsed.redirect) {
    const resolved = tree.resolve(currentDirectoryId, parsed.redirect.targetPath);
    if ("node" in resolved && resolved.node) {
      const existingContent = parsed.redirect.mode === ">>" ? (resolved.node.content ?? "") + "\n" : "";
      allOperations.push({
        type: "updateNode",
        nodeId: resolved.node.id,
        updates: { content: existingContent + finalOutput },
      });
      allAnimationEvents.push({ type: "content_display", nodeId: resolved.node.id });
    } else if ("parent" in resolved && resolved.parent && resolved.missingSegments.length === 1) {
      const id = generateId();
      allOperations.push({
        type: "createNode",
        id,
        parentId: resolved.parent.id,
        nodeType: "file",
        name: resolved.missingSegments[0],
        permissions: "rw-r--r--",
        content: finalOutput,
      });
      allAnimationEvents.push({ type: "create", nodeId: id });
    } else {
      return {
        success: false,
        outputText: `Cannot redirect to '${parsed.redirect.targetPath}': No such directory`,
        commandName: primaryCommandName,
        errorType: "not_found",
        operations: allOperations,
        animationEvents: allAnimationEvents,
        isDestructive,
      };
    }
    finalOutput = ""; // redirected output doesn't also print to the terminal
  }

  return {
    success: true,
    outputText: finalOutput,
    commandName: primaryCommandName,
    operations: allOperations,
    animationEvents: allAnimationEvents,
    newCurrentDirectoryId,
    isDestructive,
  };
}

function validateArgCount(
  commandName: string,
  argCount: number,
  definition: { minArgs: number; maxArgs: number | null }
): string | null {
  if (argCount < definition.minArgs) {
    return `${commandName}: missing operand`;
  }
  if (definition.maxArgs !== null && argCount > definition.maxArgs) {
    return `${commandName}: too many arguments`;
  }
  return null;
}
