import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RouteGuard } from "./components/layout/RouteGuard.js";
import { SignupPage } from "./pages/SignupPage/SignupPage.js";
import { LoginPage } from "./pages/LoginPage/LoginPage.js";
import { DashboardPage } from "./pages/DashboardPage/DashboardPage.js";
import { SettingsPage } from "./pages/SettingsPage/SettingsPage.js";
import { DevTerminalPage } from "./pages/DevTerminalPage/DevTerminalPage.js";
import { MkdirLessonPage } from "./pages/MkdirLessonPage/MkdirLessonPage.js";
import { useAuthStore } from "./store/authStore.js";
import { authApi } from "./api/authApi.js";
import { usersApi } from "./api/usersApi.js";

// Milestone 1 scope: Signup/Login (public) and Dashboard/Settings (authenticated,
// behind RouteGuard). LandingPage (UI/UX §1) and every other authenticated screen
// (LessonPage, PracticePage, etc.) arrive in their own later milestones — this is
// not a preview of the full route tree from Component Hierarchy §1, only the
// slice Milestone 1 actually needs.

export function App() {
  const { setSession, clearSession } = useAuthStore();

  useEffect(() => {
    // On load, attempt to restore a session from the httpOnly refresh-token
    // cookie (if present) rather than always starting logged out — this is what
    // makes a page reload not silently discard a valid, already-logged-in session.
    async function bootstrap() {
      try {
        const { accessToken } = await authApi.refresh();
        const profile = await usersApi.getMe(accessToken);
        setSession(accessToken, profile);
      } catch {
        clearSession();
      }
    }
    void bootstrap();
  }, [setSession, clearSession]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/learn/mkdir" element={<MkdirLessonPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <RouteGuard>
              <DashboardPage />
            </RouteGuard>
          }
        />
        <Route
          path="/settings"
          element={
            <RouteGuard>
              <SettingsPage />
            </RouteGuard>
          }
        />
        {/* TEMPORARY — Milestone 4 verification route. Remove once Milestone 6
            ships the real Practice Mode page. */}
        <Route
          path="/dev-terminal"
          element={
            <RouteGuard>
              <DevTerminalPage />
            </RouteGuard>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
