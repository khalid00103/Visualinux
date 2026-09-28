// Mirrors API Design §2 (Users API).

export type UserRole = "learner" | "instructor" | "org_admin";
export type AccountStatus = "active" | "suspended" | "deleted";

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  timezone: string;
  accountStatus: AccountStatus;
  createdAt: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  timezone?: string;
}

export interface PublicProfile {
  displayName: string;
  level: number;
  badgeCount: number;
  joinedMonth: string;
}
