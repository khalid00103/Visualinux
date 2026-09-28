# Infrastructure as Code

Per Architecture §15, environment setup is defined here as code once real cloud accounts
exist. **This cannot be built by an AI assistant with no cloud credentials** — the actual
account provisioning (managed identity provider, Postgres, Redis, container platform) is
a manual step. See `docs/SETUP.md` for the exact checklist.

**Status:** placeholder (Milestone 0). Real Terraform configuration is added once the
underlying accounts exist and the resources they'll manage are defined by later milestones.
