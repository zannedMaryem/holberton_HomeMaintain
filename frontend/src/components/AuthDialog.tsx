import { useState, type FormEvent } from "react";
import { ArrowRight, X } from "lucide-react";
import { apiRequest, type Account } from "../api";

type AuthMode = "login" | "register";

interface AuthDialogProps {
  initialMode: AuthMode;
  onClose: () => void;
  onAuthenticated: (token: string, user: Account) => void;
}

interface AuthResponse {
  token: string;
  user: Account;
}

export default function AuthDialog({
  initialMode,
  onClose,
  onAuthenticated,
}: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (mode === "register") {
        await apiRequest("/auth/register", null, {
          method: "POST",
          body: { firstName, lastName, email, password },
        });
      }

      const session = await apiRequest<AuthResponse>("/auth/login", null, {
        method: "POST",
        body: { email, password },
      });
      onAuthenticated(session.token, session.user);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "We could not sign you in. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError("");
  };

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
        <button
          className="icon-button dialog-close"
          type="button"
          aria-label="Close sign-in dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <span className="eyebrow">WELCOME TO HOME MAINTAIN</span>
        <h2 id="auth-title">
          {mode === "login" ? "Welcome back." : "Make home care simpler."}
        </h2>
        <p className="muted">
          {mode === "login"
            ? "Sign in to pick up where you left off."
            : "Create a homeowner account to post and manage repairs."}
        </p>

        <form className="form-stack" onSubmit={submit}>
          {mode === "register" && (
            <div className="form-row">
              <label>
                First name
                <input
                  autoComplete="given-name"
                  required
                  minLength={2}
                  maxLength={50}
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                />
              </label>
              <label>
                Last name
                <input
                  autoComplete="family-name"
                  required
                  minLength={2}
                  maxLength={50}
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                />
              </label>
            </div>
          )}
          <label>
            Email address
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={8}
              maxLength={72}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {mode === "register" && (
            <p className="form-hint">
              Use 8–72 characters with uppercase, lowercase, a number, and a
              special character.
            </p>
          )}
          {error && (
            <p className="feedback feedback-error" role="alert">
              {error}
            </p>
          )}
          <button className="button button-primary button-wide" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : "Create homeowner account"}
            {!busy && <ArrowRight size={17} />}
          </button>
        </form>

        <p className="auth-switch">
          {mode === "login" ? "New to HomeMaintain?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="text-button"
            onClick={() => changeMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
        {mode === "register" && (
          <p className="form-hint auth-role-note">
            Technician accounts are provided by HomeMaintain administrators.
          </p>
        )}
      </section>
    </div>
  );
}
