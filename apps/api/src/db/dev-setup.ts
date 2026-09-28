import { db, closeDb } from "./client.js";
import { sql } from "drizzle-orm";
import { env } from "../config/env.js";

// This script exists ONLY to support local development and automated testing
// (AUTH_PROVIDER_MODE=local). It is never run against a production database —
// there is no production deploy step that invokes this file, and env.ts already
// refuses to boot the API with AUTH_PROVIDER_MODE=local when NODE_ENV=production.

async function main() {
  if (env.AUTH_PROVIDER_MODE !== "local") {
    console.log("AUTH_PROVIDER_MODE is not 'local' — skipping dev credentials table setup.");
    return;
  }

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS local_dev_credentials (
      external_auth_id UUID PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL
    );
  `);

  console.log("Local dev credentials table ready.");
}

main()
  .then(() => closeDb())
  .catch((err) => {
    console.error("Dev setup failed:", err);
    process.exit(1);
  });
