
import { useNavigate } from "react-router-dom";
import { Button } from "../primitives/Button.js";
import { useAuthStore } from "../../store/authStore.js";
import { authApi } from "../../api/authApi.js";

export function TopNav() {
  const { user, clearSession } = useAuthStore();
  const navigate = useNavigate();

  async function handleLogout() {
    await authApi.logout().catch(() => {
      // Allow local logout even if the network request fails.
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
        backgroundColor: "#352d74",
      }}
    >
      {/* Brand logo and name */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          minWidth: 0,
        }}
      >
        <img
          src="/linux_logo.png"
          alt=""
          aria-hidden="true"
          style={{
            width: "28px",
            height: "28px",
            objectFit: "contain",
            display: "block",
            flexShrink: 0,
          }}
        />

        <span style={{ fontWeight: 500, fontSize: "15px" }}>
          VisuaLinux
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-lg)",
        }}
      >
        {user && (
          <span
            style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
            }}
          >
            {user.displayName}
          </span>
        )}

        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Log out
        </Button>
      </div>
    </nav>
  );
}
