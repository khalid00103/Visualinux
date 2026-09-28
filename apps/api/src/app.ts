import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { registerErrorHandler } from "./common/error-handler.js";
import { registerAuthRoutes } from "./auth/auth.routes.js";
import { registerUsersRoutes } from "./users/users.routes.js";
import { registerCommandsRoutes } from "./commands/commands.routes.js";
import { registerFilesystemRoutes } from "./filesystem/filesystem.routes.js";
import { registerTerminalRoutes } from "./terminal/terminal.routes.js";
import { registerDevRoutes } from "./filesystem/dev-routes.js";
import { env } from "./config/env.js";

export async function buildApp(options: { logger?: boolean } = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? true });

  await app.register(cors, {
    origin: env.WEB_ORIGIN,
    credentials: true,
  });
  await app.register(cookie);

  registerErrorHandler(app);

  app.get("/health", async () => {
    return { status: "ok", service: "visualinux-api", version: "0.2.0" };
  });

  registerAuthRoutes(app);
  registerUsersRoutes(app);
  registerCommandsRoutes(app);
  registerFilesystemRoutes(app);
  registerTerminalRoutes(app);

  // TEMPORARY, Milestone 4 only — see dev-routes.ts. Gated to non-production so
  // it can never accidentally ship live even if the file isn't deleted in time.
  if (env.NODE_ENV !== "production") {
    registerDevRoutes(app);
  }

  return app;
}
