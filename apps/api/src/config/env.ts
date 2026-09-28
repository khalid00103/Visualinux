import { z } from "zod";

// Fails fast at process startup if configuration is missing or malformed — an
// enterprise-standard practice that avoids a misconfigured deploy silently
// starting up and failing confusingly on the first real request instead.

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),

  // The frontend's origin, needed for CORS (credentialed cross-origin requests
  // from apps/web require an exact, non-wildcard Access-Control-Allow-Origin).
  WEB_ORIGIN: z.string().default("http://localhost:5173"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Selects which IdentityProvider implementation is used (see src/auth/identity-provider.ts).
  // Defaults to "local" for development, per docs/SETUP.md. Production deploys must set this
  // to "auth0" explicitly — see the fail-fast check below.
  AUTH_PROVIDER_MODE: z.enum(["local", "auth0"]).default("local"),
  AUTH_PROVIDER_DOMAIN: z.string().optional(),
  AUTH_PROVIDER_CLIENT_ID: z.string().optional(),
  AUTH_PROVIDER_CLIENT_SECRET: z.string().optional(),

  // Signing secret for our own session JWTs (Architecture §5 token model) — issued by
  // our API regardless of which identity provider validated the original credentials.
  SESSION_JWT_SECRET: z
    .string()
    .min(32, "SESSION_JWT_SECRET must be at least 32 characters"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

// Never allow the weaker local-dev identity provider to run in production — this is
// exactly the kind of "silent fallback to a less-secure mode" that Section 5 of the
// Architecture Document exists to prevent.
if (env.NODE_ENV === "production" && env.AUTH_PROVIDER_MODE !== "auth0") {
  console.error(
    "AUTH_PROVIDER_MODE must be 'auth0' in production. Refusing to start with the local development identity provider active in production."
  );
  process.exit(1);
}

if (
  env.AUTH_PROVIDER_MODE === "auth0" &&
  (!env.AUTH_PROVIDER_DOMAIN || !env.AUTH_PROVIDER_CLIENT_ID || !env.AUTH_PROVIDER_CLIENT_SECRET)
) {
  console.error(
    "AUTH_PROVIDER_MODE=auth0 requires AUTH_PROVIDER_DOMAIN, AUTH_PROVIDER_CLIENT_ID, and AUTH_PROVIDER_CLIENT_SECRET."
  );
  process.exit(1);
}
