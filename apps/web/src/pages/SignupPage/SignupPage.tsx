import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/primitives/Button.js";
import { TextInput } from "../../components/primitives/TextInput.js";
import { Card } from "../../components/primitives/Card.js";
import { authApi } from "../../api/authApi.js";
import { usersApi } from "../../api/usersApi.js";
import { useAuthStore } from "../../store/authStore.js";
import { ApiError } from "../../api/client.js";

export function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { userId, accessToken } = await authApi.signUp({ email, password, displayName });
      const profile = await usersApi.getMe(accessToken);
      setSession(accessToken, profile);
      navigate("/dashboard");
      void userId;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-4xl) var(--space-lg)" }}>
      <Card style={{ width: "100%", maxWidth: "380px" }}>
        <h1 style={{ fontSize: "18px", fontWeight: 500, marginTop: 0 }}>Create your account</h1>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          <TextInput
            label="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            maxLength={50}
          />
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
            minLength={15}
            maxLength={72}
          />
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>
            Password must be between 15 and 72 characters.
          </p>
          {error && <span style={{ fontSize: "13px", color: "var(--role-danger)" }}>{error}</span>}
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Sign up
          </Button>
        </form>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: 0 }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </Card>
    </div>
  );
}
