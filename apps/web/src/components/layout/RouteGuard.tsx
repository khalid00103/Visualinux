import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore.js";

export interface RouteGuardProps {
  children: ReactNode;
}

/**
 * Milestone 1 scope: a single authenticated/unauthenticated check. The Admin-specific
 * platform-admin authorization check (API Design §12, Component Hierarchy §2) is a
 * separate, later concern — deliberately not built here, since no Admin routes exist yet.
 */
export function RouteGuard({ children }: RouteGuardProps) {
  const { accessToken, isInitializing } = useAuthStore();

  if (isInitializing) {
    return <div style={{ padding: "var(--space-xl)", color: "var(--text-secondary)" }}>Loading…</div>;
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
