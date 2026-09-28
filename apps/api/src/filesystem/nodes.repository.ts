import { and, eq, isNull } from "drizzle-orm";
import { db, type DbHandle } from "../db/client.js";
import { filesystemNodes } from "../db/schema.js";
import { generateId } from "@visualinux/simulation-engine";
import type { NodeType } from "@visualinux/shared-types";

export interface NewNodeInput {
  id?: string;
  sandboxId: string;
  parentId: string | null;
  nodeType: NodeType;
  name: string;
  permissions: string;
  owner?: string;
  groupOwner?: string;
  content?: string | null;
  symlinkTargetId?: string | null;
}

// Every method accepts an optional transaction handle, defaulting to the
// global `db`. This is what lets terminal.service.ts wrap a whole command's
// operations in a single db.transaction() — a mid-sequence failure (like the
// FK violation caught during Milestone 3 verification) now rolls back
// entirely instead of leaving partially-applied state.

export const nodesRepository = {
  async findAllLiveForSandbox(sandboxId: string, tx: DbHandle = db) {
    return tx
      .select()
      .from(filesystemNodes)
      .where(and(eq(filesystemNodes.sandboxId, sandboxId), isNull(filesystemNodes.deletedAt)));
  },

  async findById(nodeId: string, tx: DbHandle = db) {
    const rows = await tx.select().from(filesystemNodes).where(eq(filesystemNodes.id, nodeId)).limit(1);
    return rows[0];
  },

  async create(input: NewNodeInput, tx: DbHandle = db) {
    const [node] = await tx
      .insert(filesystemNodes)
      .values({
        id: input.id ?? generateId(),
        sandboxId: input.sandboxId,
        parentId: input.parentId,
        nodeType: input.nodeType,
        name: input.name,
        permissions: input.permissions,
        owner: input.owner ?? "user",
        groupOwner: input.groupOwner ?? "user",
        content: input.content ?? null,
        symlinkTargetId: input.symlinkTargetId ?? null,
      })
      .returning();
    return node;
  },

  async update(
    nodeId: string,
    updates: Partial<{
      name: string;
      parentId: string | null;
      permissions: string;
      owner: string;
      groupOwner: string;
      content: string | null;
      symlinkTargetId: string | null;
    }>,
    tx: DbHandle = db
  ) {
    const [updated] = await tx
      .update(filesystemNodes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(filesystemNodes.id, nodeId))
      .returning();
    return updated;
  },

  /** Soft delete, per Database Design §5 — supports rm animation replay / AI context. */
  async softDelete(nodeId: string, tx: DbHandle = db) {
    await tx.update(filesystemNodes).set({ deletedAt: new Date() }).where(eq(filesystemNodes.id, nodeId));
  },

  async softDeleteMany(nodeIds: string[], tx: DbHandle = db) {
    for (const id of nodeIds) {
      await this.softDelete(id, tx);
    }
  },
};
