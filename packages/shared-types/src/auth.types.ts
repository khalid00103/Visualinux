// Mirrors API Design §1 (Authentication API) exactly. The backend's zod request/response
// schemas are the runtime source of truth at the API boundary; these types exist so the
// frontend never hand-writes a shape that could silently drift from what the API returns.

export interface SignUpRequest {
  email: string;
  password: string;
  displayName: string;
  timezone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  userId: string;
  accessToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface SessionSummary {
  sessionId: string;
  deviceInfo: string | null;
  issuedAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface PasswordResetRequestBody {
  email: string;
}
