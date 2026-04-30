import { useMemo, useState } from "react";
import { ArrowRight, KeyRound, Mail, Sparkles, UserPlus } from "lucide-react";
import { useAuth } from "./AuthContext";
import "./auth.css";

type Mode = "signin" | "signup";

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { signInWithEmail, signUpWithEmail } = useAuth();

  const modeCopy = useMemo(
    () =>
      mode === "signin"
        ? {
            title: "Welcome back",
            subtitle:
              "Sign in to continue managing notices and extracted events.",
            actionLabel: "Sign in",
            switchLabel: "Need an account?",
            switchAction: "Create one",
            icon: <ArrowRight className="h-4 w-4" aria-hidden="true" />,
          }
        : {
            title: "Create your workspace account",
            subtitle:
              "Set up secure access in less than a minute and start organizing updates.",
            actionLabel: "Create account",
            switchLabel: "Already have an account?",
            switchAction: "Sign in",
            icon: <UserPlus className="h-4 w-4" aria-hidden="true" />,
          },
    [mode],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password.trim()) {
      setErrorMessage("Email and password are required.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      if (mode === "signin") {
        await signInWithEmail({ email: normalizedEmail, password });
      } else {
        await signUpWithEmail({ email: normalizedEmail, password });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Authentication failed.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-shell min-h-screen">
      <section className="auth-hero">
        <p className="auth-chip">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Easy Update Secure Access
        </p>
        <h1>Turn messy updates into clear plans, now with account security.</h1>
        <p>
          One account unlocks your notice dashboard, event extraction, and
          calendar workflow with protected API access.
        </p>
      </section>

      <section className="auth-card-wrap">
        <div className="auth-card">
          <div
            className="auth-mode-toggle"
            role="tablist"
            aria-label="Auth mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signin"}
              className={mode === "signin" ? "active" : ""}
              onClick={() => setMode("signin")}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              className={mode === "signup" ? "active" : ""}
              onClick={() => setMode("signup")}
            >
              Sign up
            </button>
          </div>

          <div className="auth-copy">
            <h2>{modeCopy.title}</h2>
            <p>{modeCopy.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              <span>Email</span>
              <div className="auth-input">
                <Mail className="h-4 w-4" aria-hidden="true" />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                />
              </div>
            </label>

            <label>
              <span>Password</span>
              <div className="auth-input">
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                <input
                  type="password"
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 8 characters"
                />
              </div>
            </label>

            {errorMessage ? (
              <p className="auth-error" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="auth-submit"
            >
              {modeCopy.icon}
              {isSubmitting ? "Please wait..." : modeCopy.actionLabel}
            </button>
          </form>

          <p className="auth-switch">
            {modeCopy.switchLabel}{" "}
            <button
              type="button"
              onClick={() => {
                setErrorMessage("");
                setMode((previous) =>
                  previous === "signin" ? "signup" : "signin",
                );
              }}
            >
              {modeCopy.switchAction}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
