// TEMPORARY DEV/TEST TOOL — not part of the production API surface.
// Creates a sandbox directly via sandboxService, bypassing HTTP, since the
// public "create sandbox" endpoint is Milestone 6's scope (Practice Mode),
// not this milestone's. Used only to obtain a real sandboxId for manual and
// automated verification of the Filesystem/Terminal engine built here.
import { sandboxService } from "./sandbox.service.js";
import { closeDb } from "../db/client.js";

const userId = process.argv[2];
if (!userId) {
  console.error("Usage: tsx src/filesystem/dev-create-sandbox.ts <userId>");
  process.exit(1);
}

sandboxService
  .createFromTemplate({ userId, templateKey: "practice_default", sandboxType: "practice" })
  .then((sandbox) => {
    console.log(JSON.stringify(sandbox, null, 2));
  })
  .finally(() => closeDb());
