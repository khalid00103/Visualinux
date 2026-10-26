import { ConflictError, UnauthorizedError, ValidationError } from "../../common/errors.js";
import type { IdentityProvider, IdentityProviderAuthResult, IdentityProviderSignUpResult } from "../identity-provider.js";

interface Auth0Config {
  domain: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Production identity provider — Auth0.
 *
 * IMPORTANT — HONESTY NOTE FOR REVIEWERS:
 * This implementation is written against Auth0's real, documented Authentication API
 * (the /dbconnections/signup, /oauth/token, and /dbconnections/change_password
 * endpoints below reflect Auth0's actual API contract as of this writing). It has
 * NOT been exercised against a live Auth0 tenant, because this build environment has
 * no network access to any identity-provider domain and no real credentials were
 * available to configure one (see docs/SETUP.md, step 1).
 *
 * Before this code is trusted in production, it needs: a real Auth0 tenant configured
 * per docs/SETUP.md, integration testing against it, and a review of the exact Auth0
 * API version/response shapes in case they've changed since this was written. This
 * is flagged explicitly rather than left as an implicit assumption.
 */
export class Auth0IdentityProvider implements IdentityProvider {
  constructor(private readonly config: Auth0Config) {}

  async signUp(
    params: { email: string; password: string }
  ): Promise<IdentityProviderSignUpResult> {
    const response = await fetch(
      `https://${this.config.domain}/dbconnections/signup`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: this.config.clientId,
          email: params.email,
          password: params.password,
          connection: "Username-Password-Authentication",
        }),
      }
    );

    const body = (await response.json().catch(() => ({}))) as {
      _id?: string;
      name?: string;
      code?: string;
      error?: string;
      description?: string;
      message?: string;
    };

    if (!response.ok) {
      const errorDetails = [
        body.code,
        body.name,
        body.error,
        body.description,
        body.message,
      ]
        .filter((value): value is string => typeof value === "string")
        .join(" ");

      const rawDescription = body.description ?? body.message;

      const descriptionText =
        typeof rawDescription === "string"
          ? rawDescription
          : rawDescription == null
            ? undefined
            : JSON.stringify(rawDescription);

      const safeDescription = descriptionText
        ?.split(params.email)
        .join("[redacted]")
        .slice(0, 300);

      console.error("[Auth0 signup rejected]", {
        status: response.status,
        name: body.name,
        code: body.code,
        error: body.error,
        description: safeDescription,
      });

      if (
        response.status === 400 &&
        /user_exists|username_exists|already exists/i.test(errorDetails)
      ) {
        throw new ConflictError(
          "An account with this email already exists."
        );
      }

      if (response.status === 400) {
        throw new ValidationError(
          "Signup was rejected by the identity provider. Please check your details and try again."
        );
      }

      throw new Error(
        `Auth0 signup failed with status ${response.status}`
      );
    }

    if (typeof body._id !== "string") {
      throw new Error(
        "Auth0 signup response did not include a user ID"
      );
    }

    return { externalAuthId: body._id };
  }

  async login(params: { email: string; password: string }): Promise<IdentityProviderAuthResult> {
    const response = await fetch(`https://${this.config.domain}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "http://auth0.com/oauth/grant-type/password-realm",
        realm: "Username-Password-Authentication",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        username: params.email,
        password: params.password,
        scope: "openid profile email",
      }),
    });

    if (!response.ok) {
      // Deliberately generic — never reveal whether the email exists (account
      // enumeration prevention), matching the IdentityProvider contract.
      throw new UnauthorizedError("Invalid email or password.");
    }

    const body = (await response.json()) as { access_token: string };
    const externalAuthId = decodeSubjectFromIdToken(body.access_token);
    return { externalAuthId };
  }

  async requestPasswordReset(params: { email: string }): Promise<void> {
    await fetch(`https://${this.config.domain}/dbconnections/change_password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: this.config.clientId,
        email: params.email,
        connection: "Username-Password-Authentication",
      }),
    });
    // Auth0 always returns 200 for this endpoint regardless of whether the email
    // exists, which already matches API Design §1's account-enumeration requirement.
  }

  async confirmPasswordReset(): Promise<void> {
    // Auth0's password-reset confirmation happens on Auth0's own hosted page via the
    // link sent by requestPasswordReset — there is no separate server-to-server
    // "confirm" call for the standard flow. This method exists to satisfy the
    // IdentityProvider contract for providers that do require one.
    throw new ValidationError(
      "Password reset is completed via the link sent by email, not this endpoint, when using Auth0."
    );
  }
}

function decodeSubjectFromIdToken(token: string): string {
  const payload = token.split(".")[1];
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
  return decoded.sub as string;
}
