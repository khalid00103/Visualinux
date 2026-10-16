import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RouteGuard } from "./components/layout/RouteGuard.js";
import { SignupPage } from "./pages/SignupPage/SignupPage.js";
import { LoginPage } from "./pages/LoginPage/LoginPage.js";
import { DashboardPage } from "./pages/DashboardPage/DashboardPage.js";
import { SettingsPage } from "./pages/SettingsPage/SettingsPage.js";
import { DevTerminalPage } from "./pages/DevTerminalPage/DevTerminalPage.js";
import { MkdirLessonPage } from "./pages/MkdirLessonPage/MkdirLessonPage.js";
import { LsLessonPage } from "./pages/LsLessonPage/LsLessonPage.js";
import { TouchLessonPage } from "./pages/TouchLessonPage/TouchLessonPage.js";
import { CdLessonPage } from "./pages/CdLessonPage/CdLessonPage.js";
import {PwdLessonPage} from "./pages/PwdLessonPage/PwdLessonPage.js";
import { RmLessonPage } from "./pages/RmLessonPage/RmLessonPage.js";
import { CpLessonPage } from "./pages/CpLessonPage/CpLessonPage.js";
import { MvLessonPage } from "./pages/MvLessonPage/MvLessonPage.js";
import { CatLessonPage } from "./pages/CatLessonPage/CatLessonPage.js";
import { EchoLessonPage } from "./pages/EchoLessonPage/EchoLessonPage.js";
import { HeadLessonPage } from "./pages/HeadLessonPage/HeadLessonPage.js";
import { TailLessonPage } from "./pages/TailLessonPage/TailLessonPage.js";
import { GrepLessonPage } from "./pages/GrepLessonPage/GrepLessonPage.js";
import { WcLessonPage } from "./pages/WcLessonPage/WcLessonPage.js";
import { SortLessonPage } from "./pages/SortLessonPage/SortLessonPage.js";
import { ChmodLessonPage } from "./pages/ChmodLessonPage/ChmodLessonPage.js";
import { ChownLessonPage } from "./pages/ChownLessonPage/ChownLessonPage.js";
import { WhoamiLessonPage } from "./pages/WhoamiLessonPage/WhoamiLessonPage.js";
import { ClearLessonPage } from "./pages/ClearLessonPage/ClearLessonPage.js";
import { ManLessonPage } from "./pages/ManLessonPage/ManLessonPage.js";
import { PracticePage } from "./pages/PracticePage/PracticePage.js";
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
        <Route path="/learn/ls" element={<LsLessonPage />} />
        <Route path="/learn/touch" element={<TouchLessonPage />} />
        <Route path="/learn/cd" element={<CdLessonPage />} />
        <Route path="/learn/pwd" element={<PwdLessonPage />} />
        <Route path="/learn/rm" element={<RmLessonPage />} />
        <Route path="/learn/cp" element={<CpLessonPage />} />
        <Route path="/learn/mv" element={<MvLessonPage />} />
        <Route path="/learn/cat" element={<CatLessonPage />} />
        <Route path="/learn/echo" element={<EchoLessonPage />} />
        <Route path="/learn/head" element={<HeadLessonPage />} />
        <Route path="/learn/tail" element={<TailLessonPage />} />
        <Route path="/learn/grep" element={<GrepLessonPage />} />
        <Route path="/learn/wc" element={<WcLessonPage />} />
        <Route path="/learn/sort" element={<SortLessonPage />} />
        <Route path="/learn/chmod" element={<ChmodLessonPage />} />
        <Route path="/learn/chown" element={<ChownLessonPage />} />
        <Route path="/learn/whoami" element={<WhoamiLessonPage />} />
        <Route path="/learn/clear" element={<ClearLessonPage />} />
        <Route path="/learn/man" element={<ManLessonPage />} />
        <Route path="/practice" element={<PracticePage />} />
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
