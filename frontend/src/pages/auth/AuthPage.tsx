import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import Icon from "../../components/common/Icon";
import Brand from "../../components/common/Brand";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";

export default function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [readOnly, setReadOnly] = useState(true);

  // Clear form inputs and error whenever switching modes or loading the page
  useEffect(() => {
    setForm({ fullName: "", email: "", password: "" });
    setError("");
    setAccepted(false);
    setShowPassword(false);
    setReadOnly(true);
  }, [mode]);

  const switchMode = (next: "login" | "register") => {
    setMode(next);
    setForm({ fullName: "", email: "", password: "" });
    setError("");
    setReadOnly(true);
  };

  const unlockInputs = () => {
    if (readOnly) setReadOnly(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const authUser = await login(form.email, undefined, form.password);
        if (
          authUser.role === "transport_admin" ||
          authUser.role === "transport_officer" ||
          authUser.role === "transport_supervisor"
        ) {
          navigate("/transport-admin");
        } else if (
          authUser.role === "admin" ||
          authUser.role === "supervisor" ||
          authUser.role === "officer"
        ) {
          navigate("/admin");
        } else {
          navigate("/");
        }
      } else {
        await register(form.fullName, form.email, undefined, form.password);
        // Auto-login after register
        await login(form.email, undefined, form.password);
        navigate("/");
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-story">
        <Brand />
        <div className="auth-story-copy">
          <span className="auth-pill"><i></i> CITIZEN SERVICES, SIMPLIFIED</span>
          <h1>Your voice can shape<br />a better neighbourhood.</h1>
          <p>Report civic issues, follow every update, and stay connected with the teams improving your city.</p>
          <div className="auth-proof">
            <div>
              <span><Icon name="camera" /></span>
              <div>
                <strong>Report in minutes</strong>
                <small>Add a photo and location</small>
              </div>
            </div>
            <div>
              <span><Icon name="clock" /></span>
              <div>
                <strong>Track transparently</strong>
                <small>See progress at every step</small>
              </div>
            </div>
            <div>
              <span><Icon name="shield" /></span>
              <div>
                <strong>Private &amp; secure</strong>
                <small>Your details stay protected</small>
              </div>
            </div>
          </div>
        </div>
        <div className="auth-city" aria-hidden="true">
          <div className="auth-moon"></div>
          <div className="auth-building ab1"></div>
          <div className="auth-building ab2"></div>
          <div className="auth-building ab3"></div>
          <div className="auth-tree at1"></div>
          <div className="auth-tree at2"></div>
          <div className="auth-road"></div>
          <span className="auth-pin"><Icon name="pin" /></span>
        </div>
        <p className="auth-quote">&ldquo;Small reports create visible change.&rdquo;</p>
      </section>
      <section className="auth-form-side">
        <div className="mobile-auth-brand"><Brand /></div>
        <div className="auth-card">
          <div className="auth-heading">
            <span className="auth-badge">{mode === "login" ? "WELCOME BACK" : "JOIN YOUR COMMUNITY"}</span>
            <h2>{mode === "login" ? "Sign in to Civicly" : "Create your account"}</h2>
            <p>{mode === "login" ? "Track your complaints and continue making a difference." : "It takes less than a minute to get started."}</p>
          </div>
          <div className="auth-tabs" role="tablist">
            <button id="btn-tab-signin" type="button" className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>Sign in</button>
            <button id="btn-tab-register" type="button" className={mode === "register" ? "active" : ""} onClick={() => switchMode("register")}>Create account</button>
          </div>
          <form className="auth-fields" onSubmit={handleSubmit} autoComplete="off" noValidate>
            {/* Decoy inputs to prevent unwanted browser autofill on page load / logout */}
            <input type="text" name="fake_username_remembered" tabIndex={-1} aria-hidden="true" style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none" }} />
            <input type="password" name="fake_password_remembered" tabIndex={-1} aria-hidden="true" style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none" }} />

            {mode === "register" && (
              <label>
                Full name
                <input
                  id="input-fullname"
                  required
                  placeholder="Enter your full name"
                  autoComplete="off"
                  readOnly={readOnly}
                  onFocus={unlockInputs}
                  onClick={unlockInputs}
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                />
              </label>
            )}
            <label>
              Email address
              <input
                id="input-email"
                type="email"
                name="civic_user_email"
                required
                placeholder="name@example.com"
                autoComplete="off"
                readOnly={readOnly}
                onFocus={unlockInputs}
                onClick={unlockInputs}
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </label>
            <label>
              Password
              <div className="password-input-wrap">
                <input
                  id="input-password"
                  type={showPassword ? "text" : "password"}
                  name="civic_user_password"
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  readOnly={readOnly}
                  onFocus={unlockInputs}
                  onClick={unlockInputs}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
                <button
                  type="button"
                  className="pwd-toggle-btn"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  <Icon name={showPassword ? "eye-off" : "eye"} size={17} />
                </button>
              </div>
            </label>
            {mode === "register" && (
              <label className="consent-check">
                <input id="checkbox-terms" type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />
                <span>I agree to the <button type="button">Terms of Service</button> and <button type="button">Privacy Policy</button>. I understand how my information will be used.</span>
              </label>
            )}
            {error && <ErrorBanner message={error} />}
            <button
              id="btn-auth-submit"
              type="submit"
              className="primary-button auth-submit"
              disabled={loading || (mode === "register" && !accepted)}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, minWidth: 150 }}
            >
              {loading && <span className="btn-spinner" />}
              <span>
                {loading
                  ? (mode === "login" ? "Signing in..." : "Creating account...")
                  : (mode === "login" ? "Sign in" : "Create account")}
              </span>
              {!loading && <Icon name="arrow" />}
            </button>
          </form>
          <p className="auth-security"><Icon name="shield" size={15} /> Secured with end-to-end civic encryption</p>
          <p className="auth-help">Need help signing in? <button type="button">Contact citizen support</button></p>
        </div>
      </section>
    </main>
  );
}
