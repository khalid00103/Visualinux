import { useState, type FormEvent } from "react";
import { TopNav } from "../../components/layout/TopNav.js";
import { Card } from "../../components/primitives/Card.js";
import { TextInput } from "../../components/primitives/TextInput.js";
import { Button } from "../../components/primitives/Button.js";
import { useAuthStore } from "../../store/authStore.js";
import { usersApi } from "../../api/usersApi.js";

/**
 * Milestone 1 scope: Account section only (display name, timezone, email — read-only).
 * The Experience section (Beginner/Advanced mode, animation speed, reduced motion) and
 * Notifications section from the UI/UX Design document arrive in Milestone 5, once
 * there's a real animation system for those settings to actually affect.
 */
export function SettingsPage() {
  const { user, accessToken, setSession } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;

    setStatus("saving");
    try {
      const updated = await usersApi.updateMe(accessToken, { displayName });
      setSession(accessToken, updated);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      <TopNav />
      <div style={{ padding: "var(--space-2xl)", display: "flex", justifyContent: "center" }}>
        <Card style={{ width: "100%", maxWidth: "480px" }}>
          <h1 style={{ fontSize: "18px", fontWeight: 500, marginTop: 0 }}>Account</h1>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
            <TextInput label="Email" value={user?.email ?? ""} disabled />
            <TextInput
              label="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
            />
            <Button type="submit" variant="primary" isLoading={status === "saving"}>
              Save changes
            </Button>
            {status === "saved" && (
              <span style={{ fontSize: "13px", color: "var(--role-success)" }}>Saved.</span>
            )}
            {status === "error" && (
              <span style={{ fontSize: "13px", color: "var(--role-danger)" }}>
                Something went wrong. Please try again.
              </span>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}
