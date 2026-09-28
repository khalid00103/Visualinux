import { buildApp } from "./app.js";
import { env } from "./config/env.js";

// Server startup only — app construction (routes, plugins, error handling) lives in
// app.js so it can be built and tested via Fastify's inject() without binding a port.

const app = await buildApp();

app
  .listen({ port: env.API_PORT, host: "0.0.0.0" })
  .then(() => {
    app.log.info(`visualinux-api listening on port ${env.API_PORT} (auth mode: ${env.AUTH_PROVIDER_MODE})`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
