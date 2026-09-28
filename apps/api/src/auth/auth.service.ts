import { ConflictError, UnauthorizedError } from "../common/errors.js";
import { usersRepository } from "../users/users.repository.js";
import { sessionsRepository } from "./sessions.repository.js";
import { getIdentityProvider } from "./identity-provider-factory.js";
import { signAccessToken, generateRefreshToken, hashRefreshToken } from "./tokens.js";

export interface AuthResult {
  userId: string;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async signUp(params: { email: string; password: string; displayName: string; timezone?: string }): Promise<AuthResult> {
    const existing = await usersRepository.findByEmail(params.email);
    if (existing) {
      throw new ConflictError("An account with this email already exists.");
    }

    const provider = getIdentityProvider();
    const { externalAuthId } = await provider.signUp({ email: params.email, password: params.password });

    const user = await usersRepository.create({
      externalAuthId,
      email: params.email,
      displayName: params.displayName,
      timezone: params.timezone,
    });

    return issueSession(user.id);
  },

  async login(params: { email: string; password: string }): Promise<AuthResult> {
    const provider = getIdentityProvider();
    // Deliberately calls the provider first: if the provider says the credential is
    // invalid, we never reveal anything about whether a local user row exists.
    await provider.login({ email: params.email, password: params.password });

    const user = await usersRepository.findByEmail(params.email);
    if (!user) {
      // Provider validated a credential that has no corresponding local account —
      // treat identically to a bad credential rather than a distinct error.
      throw new UnauthorizedError("Invalid email or password.");
    }

    return issueSession(user.id);
  },

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const hash = hashRefreshToken(refreshToken);
    const session = await sessionsRepository.findActiveByHash(hash);

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedError("Refresh token is invalid, expired, or revoked.");
    }

    const accessToken = await signAccessToken(session.userId);
    return { accessToken };
  },

  async logout(refreshToken: string): Promise<void> {
    const hash = hashRefreshToken(refreshToken);
    const session = await sessionsRepository.findActiveByHash(hash);
    if (session) {
      await sessionsRepository.revoke(session.id);
    }
  },

  async logoutAll(userId: string): Promise<void> {
    await sessionsRepository.revokeAllForUser(userId);
  },

  async listSessions(userId: string, currentRefreshToken?: string) {
    const sessions = await sessionsRepository.listActiveForUser(userId);
    const currentHash = currentRefreshToken ? hashRefreshToken(currentRefreshToken) : undefined;
    return sessions.map((s) => ({
      sessionId: s.id,
      deviceInfo: s.deviceInfo,
      issuedAt: s.issuedAt,
      expiresAt: s.expiresAt,
      isCurrent: currentHash !== undefined && s.refreshTokenHash === currentHash,
    }));
  },

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const sessions = await sessionsRepository.listActiveForUser(userId);
    const owned = sessions.find((s) => s.id === sessionId);
    if (!owned) {
      // Deliberately the same error whether the session doesn't exist or belongs to
      // someone else — API Design §13's ownership-check convention.
      throw new UnauthorizedError("Session not found.");
    }
    await sessionsRepository.revoke(sessionId);
  },

  async requestPasswordReset(email: string): Promise<void> {
    const provider = getIdentityProvider();
    await provider.requestPasswordReset({ email });
    // Always resolves regardless of outcome — API Design §1 requirement to avoid
    // leaking account existence.
  },
};

async function issueSession(userId: string): Promise<AuthResult> {
  const accessToken = await signAccessToken(userId);
  const { token: refreshToken, hash, expiresAt } = generateRefreshToken();

  await sessionsRepository.create({ userId, refreshTokenHash: hash, expiresAt });

  return { userId, accessToken, refreshToken };
}
