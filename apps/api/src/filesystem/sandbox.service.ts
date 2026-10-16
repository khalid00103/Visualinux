import { NotFoundError } from "../common/errors.js";
import { sandboxesRepository } from "./sandbox.repository.js";
import { templatesRepository } from "./templates.repository.js";
import { nodesRepository } from "./nodes.repository.js";
import type { FilesystemNodeDetail, FilesystemNodeSummary } from "@visualinux/shared-types";

export const sandboxService = {
  /**
   * Creates a new sandbox for a user, cloning every node from the named template.
   * Processes template nodes breadth-first (parents before children) so each
   * child's real, newly-generated parent id is already known by the time it's
   * created — this is what correctly rebuilds the hierarchy rather than just
   * copying flat rows.
   */
  async createFromTemplate(params: {
    userId: string;
    templateKey: string;
    sandboxType: "practice" | "lesson_step";
  }) {
    const template = await templatesRepository.findByKey(params.templateKey);
    if (!template) {
      throw new NotFoundError(`No filesystem template named '${params.templateKey}' exists.`);
    }

    const templateNodes = await templatesRepository.findAllNodesForTemplate(template.id);

    const sandbox = await sandboxesRepository.create({
      userId: params.userId,
      sandboxType: params.sandboxType,
      sourceTemplateId: template.id,
    });

    // Map: templateNodeId -> newly created live node id, built up as we go so
    // each node's real parentId is resolvable before its children are created.
    const idMap = new Map<string, string>();
    const byParent = new Map<string | null, typeof templateNodes>();
    for (const n of templateNodes) {
      const list = byParent.get(n.parentId) ?? [];
      list.push(n);
      byParent.set(n.parentId, list);
    }

    let rootLiveId: string | undefined;
    const queue = [...(byParent.get(null) ?? [])];

    while (queue.length > 0) {
      const templateNode = queue.shift()!;
      const newParentId = templateNode.parentId ? idMap.get(templateNode.parentId) ?? null : null;

      const liveNode = await nodesRepository.create({
        sandboxId: sandbox.id,
        parentId: newParentId,
        nodeType: templateNode.nodeType,
        name: templateNode.name,
        permissions: templateNode.permissions,
        owner: templateNode.owner,
        groupOwner: templateNode.groupOwner,
        content: templateNode.content,
        // Symlink target remapping happens in a second pass below, since the
        // target node may not have been created yet at this point.
      });

      idMap.set(templateNode.id, liveNode.id);
      if (!templateNode.parentId) rootLiveId = liveNode.id;

      queue.push(...(byParent.get(templateNode.id) ?? []));
    }

    // Second pass: now that every node exists, remap symlink targets from
    // template-node ids to their corresponding newly-created live-node ids.
    for (const templateNode of templateNodes) {
      if (templateNode.symlinkTargetId) {
        const liveId = idMap.get(templateNode.id);
        const liveTargetId = idMap.get(templateNode.symlinkTargetId);
        if (liveId && liveTargetId) {
          await nodesRepository.update(liveId, { symlinkTargetId: liveTargetId });
        }
      }
    }

    if (rootLiveId) {
      await sandboxesRepository.setRootNodeId(sandbox.id, rootLiveId);
    }

    return sandboxesRepository.findById(sandbox.id);
  },

  async getOrCreatePracticeSandbox(userId: string) {
  const existing = await sandboxesRepository.findPracticeByUserId(userId);

  if (existing) {
    return existing;
  }

  return this.createFromTemplate({
      userId,
      templateKey: "practice_default",
      sandboxType: "practice",
    });
  },

  async getTreeSummary(sandboxId: string): Promise<FilesystemNodeSummary[]> {
    const sandbox = await sandboxesRepository.findById(sandboxId);
    if (!sandbox) throw new NotFoundError("Sandbox not found.");

    const nodes = await nodesRepository.findAllLiveForSandbox(sandboxId);
    // "Current directory" is a client-side/session concept in later milestones
    // (the Terminal tracks it); at the pure filesystem-read level, the root is
    // the default reference point.
    return nodes.map((n) => ({
      nodeId: n.id,
      parentId: n.parentId,
      nodeType: n.nodeType,
      name: n.name,
      permissions: n.permissions,
      owner: n.owner,
      groupOwner: n.groupOwner,
      hasContent: n.content !== null,
      currentDirectory: n.id === sandbox.currentDirectoryId,
    }));
  },

  async getNodeDetail(sandboxId: string, nodeId: string): Promise<FilesystemNodeDetail> {
    const node = await nodesRepository.findById(nodeId);
    if (!node || node.sandboxId !== sandboxId || node.deletedAt) {
      throw new NotFoundError("Node not found.");
    }
    return {
      nodeId: node.id,
      parentId: node.parentId,
      nodeType: node.nodeType,
      name: node.name,
      permissions: node.permissions,
      owner: node.owner,
      groupOwner: node.groupOwner,
      hasContent: node.content !== null,
      currentDirectory: false,
      content: node.content,
      symlinkTargetId: node.symlinkTargetId,
    };
  },
};
