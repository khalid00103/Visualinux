# Setup Guide

## What's already done (Milestone 0)
The monorepo, CI pipeline, and build tooling are fully scaffolded and verified working —
see `docs/MILESTONE_STATUS.md`. Nothing below is required for `npm install` and local
builds to succeed; it's required for the app to actually connect to real services.

## Manual steps required (cannot be automated from this environment)

These require creating accounts and provisioning real infrastructure — steps an AI
assistant with no cloud credentials or payment method cannot perform on your behalf.

1. **Managed identity provider** (Architecture §5) — sign up with a provider (e.g., Auth0,
   Clerk, or a cloud-native equivalent). Create an application, note the domain, client ID,
   and client secret.
2. **PostgreSQL instance** (Database Design v1.0) — provision a hosted instance (e.g., via
   Neon, Supabase, or a cloud provider's managed Postgres). Note the connection string.
3. **Redis instance** (Architecture §14) — provision a hosted instance (e.g., via Upstash
   or a cloud provider's managed Redis). Note the connection string.

Once provisioned, copy `.env.example` to `.env` at the repository root and fill in the
values from the steps above. Milestone 1 also introduces two variables you can set
yourself, no external account needed:

- `SESSION_JWT_SECRET` — any random string 32+ characters long (this signs our own
  session tokens, independent of whichever identity provider validates credentials).
- `AUTH_PROVIDER_MODE` — set to `local` for development (uses Node's built-in `scrypt`
  against your local Postgres instead of a live provider — see
  `apps/api/src/auth/providers/local-dev-identity-provider.ts` for why this exists and
  why it's refused in production).

```
cp .env.example .env
```

**None of the external-account steps above are required yet for local development** —
Milestone 1 runs entirely against your local Postgres with `AUTH_PROVIDER_MODE=local`.
They become required only when `AUTH_PROVIDER_MODE=auth0` is actually used (i.e., a
real production deploy).

## Local development

First-time setup (after `.env` exists and Postgres is running locally):

```
npm install
npm run build --workspace=@visualinux/shared-types
npm run db:migrate --workspace=@visualinux/api
npm run db:dev-setup --workspace=@visualinux/api
```

Then, in two terminals:

```
npm run dev --workspace=@visualinux/api    # http://localhost:4000/health
npm run dev --workspace=@visualinux/web    # http://localhost:5173
```

## Verifying the full pipeline locally (what CI runs)

```
npm run lint
npm run typecheck
npm run build
npm test
```
