import { eq } from "drizzle-orm";
import { db, closeDb } from "./client.js";
import { commands, commandFlags } from "./schema.js";
import { ALL_COMMANDS } from "@visualinux/command-registry";

async function main() {
  console.log(`Seeding ${ALL_COMMANDS.length} commands...`);

  for (const def of ALL_COMMANDS) {
    const existing = await db.select().from(commands).where(eq(commands.name, def.name)).limit(1);

    let commandId: string;

    if (existing[0]) {
      // Upsert: re-running this script after a registry update (e.g. a new
      // description or flag) should apply the change, not skip it.
      await db
        .update(commands)
        .set({
          category: def.category,
          difficulty: def.difficulty,
          shortDescription: def.shortDescription,
          longDescription: def.longDescription,
          exampleUsage: def.exampleUsage,
          iconKey: def.iconKey,
          animationType: def.animationType,
          grammarSpec: def.grammarSpec,
          updatedAt: new Date(),
        })
        .where(eq(commands.id, existing[0].id));
      commandId = existing[0].id;

      // Flags are fully replaced rather than diffed — simplest correct approach
      // given how small this set is per command.
      await db.delete(commandFlags).where(eq(commandFlags.commandId, commandId));
    } else {
      const [inserted] = await db
        .insert(commands)
        .values({
          name: def.name,
          category: def.category,
          difficulty: def.difficulty,
          shortDescription: def.shortDescription,
          longDescription: def.longDescription,
          exampleUsage: def.exampleUsage,
          iconKey: def.iconKey,
          animationType: def.animationType,
          grammarSpec: def.grammarSpec,
        })
        .returning();
      commandId = inserted.id;
    }

    if (def.flags.length > 0) {
      await db.insert(commandFlags).values(
        def.flags.map((f) => ({
          commandId,
          flag: f.flag,
          description: f.description,
          changesAnimationBehavior: f.changesAnimationBehavior ?? false,
        }))
      );
    }
  }

  console.log("Command registry seed complete.");
}

main()
  .then(() => closeDb())
  .catch((err) => {
    console.error("Seeding commands failed:", err);
    process.exit(1);
  });
