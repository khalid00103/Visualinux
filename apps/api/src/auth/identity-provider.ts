// The Auth Service (auth.service.ts) depends on this interface only — never on a
// concrete provider. Two implementations exist:
//
//   - Auth0IdentityProvider  (providers/auth0-identity-provider.ts)
//        The real, production implementation, written against Auth0's actual
//        Authentication API contract. Requires live network access and real
//        credentials neither of which exist in this build sandbox — so it is
//        correct code, but has not been (and cannot be) exercised here.
//
//   - LocalDevIdentityProvider  (providers/local-dev-identity-provider.ts)
//        A real, fully self-contained implementation used for local development
//        and for every automated test in this milestone. It is explicitly barred
//        from running in production by config/env.ts's fail-fast check.
//
// This split is a standard enterprise pattern for exactly this situation: local
// development and CI need a working credential-verification path without live
// third-party network access, while production must use the real managed provider
// per the Architecture Document's decision (§5).

export interface IdentityProviderSignUpResult {
  externalAuthId: string;
}

export interface IdentityProviderAuthResult {
  externalAuthId: string;
}

export interface IdentityProvider {
  /**
   * Registers a new credential with the provider. Returns the provider's own
   * identifier for this identity, stored in users.external_auth_id.
   * Throws ConflictError if the email is already registered.
   */
  signUp(params: { email: string; password: string }): Promise<IdentityProviderSignUpResult>;

  /**
   * Validates a credential pair. Throws UnauthorizedError on any failure —
   * deliberately without distinguishing "wrong password" from "no such account"
   * in the error message, to avoid account enumeration.
   */
  login(params: { email: string; password: string }): Promise<IdentityProviderAuthResult>;

  /**
   * Initiates a password reset with the provider (sends the reset email).
   * Always resolves, regardless of whether the email exists — API Design §1
   * requires this to avoid leaking account existence.
   */
  requestPasswordReset(params: { email: string }): Promise<void>;

  /**
   * Completes a password reset using the provider's reset token.
   * Throws ValidationError if the token is invalid or expired.
   */
  confirmPasswordReset(params: { resetToken: string; newPassword: string }): Promise<void>;
}
