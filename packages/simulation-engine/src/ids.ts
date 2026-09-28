import { uuidv7 } from "uuidv7";

/** Time-ordered UUID for high-write append-only tables (Architecture §0). */
export function generateId(): string {
  return uuidv7();
}
