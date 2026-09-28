import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { filesystemTemplates, filesystemTemplateNodes } from "../db/schema.js";

export const templatesRepository = {
  async findByKey(key: string) {
    const rows = await db.select().from(filesystemTemplates).where(eq(filesystemTemplates.key, key)).limit(1);
    return rows[0];
  },

  async findAllNodesForTemplate(templateId: string) {
    return db.select().from(filesystemTemplateNodes).where(eq(filesystemTemplateNodes.templateId, templateId));
  },
};
