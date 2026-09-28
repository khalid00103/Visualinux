import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";
import { env } from "../config/env.js";

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle(pool, { schema });

/** Covers both the global db instance and a transaction handle from db.transaction(), so repositories can accept either. */
export type DbHandle = NodePgDatabase<typeof schema>;

export async function closeDb(): Promise<void> {
  await pool.end();
}
