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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { accessToken } = await authApi.login({ email, password });
      const profile = await usersApi.getMe(accessToken);
      setSession(accessToken, profile);
      navigate("/dashboard");
    } catch (err) {
      // Deliberately generic even in the UI layer — matches the API's account-
      // enumeration prevention (never hint whether the email exists).
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-4xl) var(--space-lg)" }}>
      <Card style={{ width: "100%", maxWidth: "380px" }}>
        <h1 style={{ fontSize: "18px", fontWeight: 500, marginTop: 0 }}>Log in</h1>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
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
          {error && <span style={{ fontSize: "13px", color: "var(--role-danger)" }}>{error}</span>}
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Log in
          </Button>
        </form>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: 0 }}>
          Don&rsquo;t have an account? <Link to="/signup">Sign up</Link>
        </p>
      </Card>
    </div>
  );
}
