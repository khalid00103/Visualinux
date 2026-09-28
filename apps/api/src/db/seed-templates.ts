import { eq } from "drizzle-orm";
import { db, closeDb } from "./client.js";
import { filesystemTemplates, filesystemTemplateNodes } from "./schema.js";

interface NodeSpec {
  name: string;
  nodeType: "file" | "directory";
  content?: string;
  children?: NodeSpec[];
}

// The exact structure from the PRD's Practice Mode section: a realistic home
// directory a beginner can immediately explore and experiment in.
const PRACTICE_DEFAULT: NodeSpec = {
  name: "home",
  nodeType: "directory",
  children: [
    {
      name: "Documents",
      nodeType: "directory",
      children: [
        { name: "notes.txt", nodeType: "file", content: "Things to remember:\n- Learn Linux\n- Practice every day\n" },
        { name: "resume.pdf", nodeType: "file", content: "(binary content simulated as placeholder text)" },
      ],
    },
    { name: "Downloads", nodeType: "directory", children: [] },
    { name: "Desktop", nodeType: "directory", children: [] },
    {
      name: "Pictures",
      nodeType: "directory",
      children: [{ name: "photo.jpg", nodeType: "file", content: "(binary content simulated as placeholder text)" }],
    },
    { name: "Videos", nodeType: "directory", children: [] },
    { name: "Music", nodeType: "directory", children: [] },
    {
      name: "projects",
      nodeType: "directory",
      children: [
        { name: "portfolio", nodeType: "directory", children: [] },
        { name: "website", nodeType: "directory", children: [] },
      ],
    },
  ],
};

async function insertTree(templateId: string, spec: NodeSpec, parentId: string | null): Promise<void> {
  const [node] = await db
    .insert(filesystemTemplateNodes)
    .values({
      templateId,
      parentId,
      nodeType: spec.nodeType,
      name: spec.name,
      permissions: spec.nodeType === "directory" ? "rwxr-xr-x" : "rw-r--r--",
      content: spec.content ?? null,
    })
    .returning();

  for (const child of spec.children ?? []) {
    await insertTree(templateId, child, node.id);
  }
}

async function main() {
  const existing = await db
    .select()
    .from(filesystemTemplates)
    .where(eq(filesystemTemplates.key, "practice_default"))
    .limit(1);

  if (existing.length > 0) {
    console.log("practice_default template already exists — skipping (delete it manually to reseed).");
    return;
  }

  const [template] = await db
    .insert(filesystemTemplates)
    .values({ key: "practice_default", description: "Default Practice Mode home directory, per the PRD." })
    .returning();

  await insertTree(template.id, PRACTICE_DEFAULT, null);
  console.log("Seeded practice_default filesystem template.");
}

main()
  .then(() => closeDb())
  .catch((err) => {
    console.error("Seeding practice_default template failed:", err);
    process.exit(1);
  });
