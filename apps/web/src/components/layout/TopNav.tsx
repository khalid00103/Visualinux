import { useNavigate } from "react-router-dom";
import { Button } from "../primitives/Button.js";
import { useAuthStore } from "../../store/authStore.js";
import { authApi } from "../../api/authApi.js";

/**
 * Milestone 1 scope: logo + display name + logout only. Streak/XP indicators
 * (UI/UX §2) are not shown yet — there is no real gamification data until
 * Milestone 9, and showing a fake "0" would misrepresent the product rather
 * than honestly reflect what's built so far.
 */
export function TopNav() {
  const { user, clearSession } = useAuthStore();
  const navigate = useNavigate();

  async function handleLogout() {
    await authApi.logout().catch(() => {
      // Even if the network call fails, clear local session state — the user's
      // intent to log out should never be blocked by a flaky request.
    });
    clearSession();
    navigate("/login");
  }

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--space-md) var(--space-xl)",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface-1)",
      }}
    >
      <span style={{ fontWeight: 500, fontSize: "15px" }}>VisuaLinux</span>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-lg)" }}>
        {user && <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{user.displayName}</span>}
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Log out
        </Button>
      </div>
    </nav>
  );
}
