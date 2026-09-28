import { env } from "../config/env.js";
import type { IdentityProvider } from "./identity-provider.js";
import { Auth0IdentityProvider } from "./providers/auth0-identity-provider.js";
import { LocalDevIdentityProvider } from "./providers/local-dev-identity-provider.js";

let cachedProvider: IdentityProvider | undefined;

export function getIdentityProvider(): IdentityProvider {
  if (cachedProvider) return cachedProvider;

  if (env.AUTH_PROVIDER_MODE === "auth0") {
    cachedProvider = new Auth0IdentityProvider({
      domain: env.AUTH_PROVIDER_DOMAIN!,
      clientId: env.AUTH_PROVIDER_CLIENT_ID!,
      clientSecret: env.AUTH_PROVIDER_CLIENT_SECRET!,
    });
  } else {
    cachedProvider = new LocalDevIdentityProvider();
  }

  return cachedProvider;
}
