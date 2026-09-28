import { TopNav } from "../../components/layout/TopNav.js";
import { useAuthStore } from "../../store/authStore.js";

/**
 * Milestone 1 scope, per the roadmap's own Goal: "land on an empty authenticated
 * shell." This is deliberately not a preview of the real Dashboard (Component
 * Hierarchy §6, ContinueCard/TrackProgressCard/StreakWidget) — those depend on
 * Lessons and Gamification data that doesn't exist until Milestones 8-9.
 */
export function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div>
      <TopNav />
      <div style={{ padding: "var(--space-2xl)" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 500 }}>
          Welcome{user ? `, ${user.displayName}` : ""}.
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Your account is set up. Lessons, Practice Mode, and progress tracking arrive in later
          milestones.
        </p>
      </div>
    </div>
  );
}
