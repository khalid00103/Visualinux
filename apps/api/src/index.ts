import Fastify from "fastify";
import { configureApp } from "./application.js";
import { env } from "./config/env.js";

const app = Fastify({ logger: true });

await configureApp(app);

app
  .listen({ port: env.API_PORT, host: "0.0.0.0" })
  .then(() => {
    app.log.info(
      `visualinux-api listening on port ${env.API_PORT} (auth mode: ${env.AUTH_PROVIDER_MODE})`,
    );
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });