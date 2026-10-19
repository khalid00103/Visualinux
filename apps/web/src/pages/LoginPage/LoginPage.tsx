
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/primitives/Button.js";
import { TextInput } from "../../components/primitives/TextInput.js";
import { Card } from "../../components/primitives/Card.js";
import { authApi } from "../../api/authApi.js";
import { usersApi } from "../../api/usersApi.js";
import { useAuthStore } from "../../store/authStore.js";
import { ApiError } from "../../api/client.js";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  const [showWelcomeTerminal, setShowWelcomeTerminal] = useState(false);
  const [welcomeUsername, setWelcomeUsername] = useState("");

  const ENABLE_TEMPORARY_TERMINAL_BUTTON = false;

  const [showDashboardButton, setShowDashboardButton] = useState(false);

  const [pendingSession, setPendingSession] = useState<{
    accessToken: string;
    profile: Awaited<ReturnType<typeof usersApi.getMe>>;
  } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { accessToken } = await authApi.login({ email, password });
      const profile = await usersApi.getMe(accessToken);

      setPendingSession({ accessToken, profile });

      setWelcomeUsername(
        profile.displayName?.trim() ||
          profile.email?.split("@")[0] ||
          "there",
      );

      setShowWelcomeTerminal(true);

      window.setTimeout(() => {
        if (ENABLE_TEMPORARY_TERMINAL_BUTTON) {
          setShowDashboardButton(true);
        } else {
          setSession(accessToken, profile);
          navigate("/dashboard", { replace: true });
        }
      }, 6000);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      {showWelcomeTerminal && (
        <div
          className="welcome-terminal-overlay"
          role="status"
          aria-live="polite"
          aria-label="Login successful"
        >
          <div className="welcome-terminal-window">
            <div className="welcome-terminal-topbar" aria-hidden="true">
              <span className="welcome-terminal-dot welcome-terminal-dot-red" />
              <span className="welcome-terminal-dot welcome-terminal-dot-yellow" />
              <span className="welcome-terminal-dot welcome-terminal-dot-green" />
            </div>

            <div className="welcome-terminal-body">
              <div className="welcome-terminal-command-line">
                <span className="welcome-terminal-prompt" aria-hidden="true">
                  &gt;
                </span>

                <span className="welcome-terminal-typing-clip">
                  <span className="welcome-terminal-command">Visualinux</span>
                  <span className="welcome-terminal-cursor">_</span>
                </span>
              </div>

              <div className="welcome-terminal-output">
                Welcome {welcomeUsername} to Visualinux!
              </div>
              {showDashboardButton && (
                <button
                  type="button"
                  className="welcome-terminal-continue"
                  onClick={() => {
                    if (!pendingSession) return;

                    setSession(
                      pendingSession.accessToken,
                      pendingSession.profile,
                    );

                    navigate("/dashboard", { replace: true });
                  }}
                >
                  Continue to dashboard →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes loginReveal {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .login-logo,
        .login-brand,
        .login-form-wrapper {
          opacity: 0;
          animation: loginReveal 750ms cubic-bezier(.22, 1, .36, 1) forwards;
        }

        .login-logo {
          animation-delay: 100ms;
        }

        .login-brand {
          animation-delay: 550ms;
        }

        .login-form-wrapper {
          animation-delay: 1000ms;
        }

        .login-page {
          box-sizing: border-box;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 36px 20px;
        }

        .login-logo {
          width: 76px;
          height: 76px;
          object-fit: contain;
          display: block;
          margin-bottom: 10px;
        }

        .login-brand {
          text-align: center;
          margin-bottom: 28px;
        }

        .login-form-wrapper {
          width: 100%;
          max-width: 380px;
        }

        .login-title {
          font-size: 18px;
          font-weight: 500;
          margin-top: 0;
        }

        @media (prefers-reduced-motion: reduce) {
          .login-logo,
          .login-brand,
          .login-form-wrapper {
            opacity: 1;
            animation: none;
            transform: none;
          }
        }
        
        /* Full-screen terminal shown after successful login */
        .welcome-terminal-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
          box-sizing: border-box;
          animation: welcomeTerminalAppear 180ms ease-out both;
        }

        .welcome-terminal-window {
          width: min(992px, 80vw);
          height: min(575px, 80vh);
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #1e293b;
          border: clamp(8px, 1.8vw, 16px) solid #64748b;
          border-radius: clamp(22px, 3.4vw, 48px);
        }

        /* Three terminal window controls */
        .welcome-terminal-topbar {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 30px 30px 0;
          flex-shrink: 0;
        }

        .welcome-terminal-dot {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .welcome-terminal-dot-red {
          background: #ff5f57;
        }

        .welcome-terminal-dot-yellow {
          background: #febc2e;
        }

        .welcome-terminal-dot-green {
          background: #28c840;
        }

        /* Terminal prompt and command */
        .welcome-terminal-body {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 0 24px 32px;
          color: #e2e8f0;
          font-family: Consolas, "Courier New", monospace;
        }

        .welcome-terminal-command-line {
          display: flex;
          align-items: baseline;
          gap: 16px;
          white-space: nowrap;
        }

        .welcome-terminal-prompt {
          color: #f9a51a;
          font-size: clamp(22px, 4vw, 46px);
          font-weight: 400;
          line-height: 1;
          flex-shrink: 0;
        }

        .welcome-terminal-typing-clip {
          display: inline-block;
          width: 0;
          overflow: hidden;
          white-space: nowrap;
          vertical-align: bottom;
          font-size: clamp(22px, 3vw, 44px);
          line-height: 1;
          padding-bottom: clamp(8px, 1.5vw, 20px);
          animation: welcomeTerminalType 1500ms steps(11, end) forwards;
        }

        .welcome-terminal-command {
          color: #e2e8f0;
        }

        .welcome-terminal-cursor {
          color: #3b82f6;
          animation: welcomeTerminalBlink 667ms steps(1, end) 1500ms 3;
        }

        /* The welcome output appears after typing and blinking */
        .welcome-terminal-output {
          margin-top: clamp(18px, 3vh, 30px);
          color: #e2e8f0;
          font-size: clamp(16px, 2.2vw, 32px);
          line-height: 1.5;
          overflow-wrap: anywhere;
          opacity: 0;
          animation: welcomeTerminalOutput 1ms linear 3500ms forwards;
        }

        @keyframes welcomeTerminalAppear {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes welcomeTerminalType {
          from {
            width: 0;
          }

          to {
            width: 11ch;
          }
        }

        @keyframes welcomeTerminalBlink {
          0%,
          49% {
            opacity: 1;
          }

          50%,
          100% {
            opacity: 0;
          }
        }

        @keyframes welcomeTerminalOutput {
          to {
            opacity: 1;
          }
        }

        /* Keep the terminal readable on smaller screens */
        @media (max-width: 600px) {
          .welcome-terminal-window {
            width: 80vw;
            height: min(575px, calc(100vh - 32px));
          }

          .welcome-terminal-body {
            padding: 0 16px 24px;
          }

          .welcome-terminal-command-line {
            gap: 12px;
          }

          .welcome-terminal-prompt {
            font-size: clamp(18px, 4vw, 26px);
          }

          .welcome-terminal-typing-clip {
            font-size: clamp(18px, 4vw, 26px);
          }
        }

        /* Respect reduced-motion preferences */
        @media (prefers-reduced-motion: reduce) {
          .welcome-terminal-overlay {
            animation: none;
          }

          .welcome-terminal-typing-clip {
            width: 11ch;
            animation: none;
          }

          .welcome-terminal-cursor {
            animation: none;
            opacity: 1;
          }

          .welcome-terminal-output {
            opacity: 1;
            animation: none;
          }
        }

        .welcome-terminal-continue {
          align-self: flex-start;
          margin-top: 24px;
          padding: 12px 20px;
          border: 1px solid #64748b;
          border-radius: 8px;
          background: #3b82f6;
          color: #ffffff;
          font-family: inherit;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          opacity: 0;
          animation: welcomeTerminalButtonAppear 300ms ease-out forwards;
          transition:
            background 180ms ease,
            transform 180ms ease;
        }

        .welcome-terminal-continue:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }

        .welcome-terminal-continue:focus-visible {
          outline: 2px solid #93c5fd;
          outline-offset: 4px;
        }

        @keyframes welcomeTerminalButtonAppear {
          from {
            opacity: 0;
            transform: translateY(8px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <img
        className="login-logo"
        src="/linux_logo.png"
        alt="VisuaLinux logo"
      />

      <header className="login-brand">
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 600,
            margin: 0,
            letterSpacing: "-0.5px",
          }}
        >
          VisuaLinux
        </h1>

        <p
          style={{
            fontSize: "13px",
            color: "var(--text-secondary)",
            margin: "8px 0 0",
          }}
        >
          Learn Linux visually, one command at a time.
        </p>
      </header>

      <div className="login-form-wrapper">
        <Card style={{ width: "100%", boxSizing: "border-box" }}>
          <h2 className="login-title">Log in</h2>

          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-lg)",
            }}
          >
            <TextInput
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <TextInput
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <span
                style={{
                  fontSize: "13px",
                  color: "var(--role-danger)",
                }}
              >
                {error}
              </span>
            )}

            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Log in
            </Button>
          </form>

          <p
            style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              marginBottom: 0,
            }}
          >
            Don&rsquo;t have an account? <Link to="/signup">Sign up</Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
