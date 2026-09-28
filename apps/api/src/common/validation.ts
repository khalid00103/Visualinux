import type { ZodTypeAny, z } from "zod";
import { ValidationError } from "./errors.js";

/**
 * Generic over the schema type itself (S extends ZodTypeAny) rather than
 * `ZodSchema<T>` directly, and derives the return type via `z.infer<S>`.
 * This matters specifically for schemas using `.default()` or `.transform()`,
 * where the input type and output type differ — binding only the first type
 * parameter of `ZodSchema<T>` let TypeScript infer an overly-wide type in
 * exactly that case (caught by a real compile error in terminal.routes.ts).
 */
export function parseOrThrow<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError("Request validation failed.", result.error.flatten());
  }
  return result.data;
}
