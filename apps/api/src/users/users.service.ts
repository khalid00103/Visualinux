import { NotFoundError } from "../common/errors.js";
import { usersRepository } from "./users.repository.js";
import type { PublicProfile, UpdateProfileRequest, UserProfile } from "@visualinux/shared-types";

export const usersService = {
  async getProfile(userId: string): Promise<UserProfile> {
    const user = await usersRepository.findById(userId);
    if (!user) throw new NotFoundError("User not found.");

    return {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      timezone: user.timezone,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt.toISOString(),
    };
  },

  async updateProfile(userId: string, updates: UpdateProfileRequest): Promise<UserProfile> {
    const updated = await usersRepository.updateProfile(userId, updates);
    if (!updated) throw new NotFoundError("User not found.");
    return this.getProfile(userId);
  },

  async deleteAccount(userId: string): Promise<void> {
    await usersRepository.softDelete(userId);
  },

  /**
   * Deliberately minimal — never includes email or accountStatus, per API Design §2.
   * level/badgeCount are hardcoded to 0 here since Gamification (Milestone 9) doesn't
   * exist yet; this is a real, honest placeholder, not a fabricated value pretending
   * to be live data.
   */
  async getPublicProfile(userId: string): Promise<PublicProfile> {
    const user = await usersRepository.findById(userId);
    if (!user || user.accountStatus === "deleted") {
      throw new NotFoundError("User not found.");
    }

    return {
      displayName: user.displayName,
      level: 0,
      badgeCount: 0,
      joinedMonth: `${user.createdAt.getFullYear()}-${String(user.createdAt.getMonth() + 1).padStart(2, "0")}`,
    };
  },
};
