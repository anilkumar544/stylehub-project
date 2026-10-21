import { useState } from "react";
import { GraduationCap, MoveRight } from "lucide-react";
import Notice from "../components/Notice.jsx";
import { api, setToken } from "../services/api.js";

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("Anil");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await api(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(isRegister ? { name: name.trim(), email, password } : { email, password }),
      });
      setToken(result.access_token);
      onAuthenticated(result.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-aside">
        <div className="brand brand-light"><span className="brand-mark"><GraduationCap size={22} /></span> CampusDesk</div>
        <div className="auth-message">
          <span className="eyebrow">STUDENT MANAGEMENT, SIMPLIFIED</span>
          <h1>Make room for<br /><span>what matters.</span></h1>
          <p>One calm workspace for student records, courses, and the people who make your campus thrive.</p>
        </div>
        <div className="aside-footer">A clearer view of your campus.</div>
      </section>
      <section className="auth-content">
        <div className="auth-card">
          <span className="eyebrow">{isRegister ? "GET STARTED" : "WELCOME BACK"}</span>
          <h2>{isRegister ? "Create your account" : "Sign in to CampusDesk"}</h2>
          <p className="muted">{isRegister ? "Set up an account to manage your campus." : "Your student workspace is ready when you are."}</p>
          <Notice>{error}</Notice>
          <form onSubmit={submit} className="form-stack">
            {isRegister && <label>Full name
              <input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required minLength={1} maxLength={80} />
            </label>}
            <label>Email address
              <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} />
            </label>
            <label>Password
              <input type="password" autoComplete={isRegister ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={128} />
            </label>
            <button className="button button-primary button-wide" disabled={busy}>
              {busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"} <MoveRight size={17} />
            </button>
          </form>
          <div className="auth-toggle">
            {isRegister ? "Already have an account?" : "New to CampusDesk?"}{" "}
            <button className="text-button" onClick={() => { setError(""); setMode(isRegister ? "login" : "register"); }}>
              {isRegister ? "Sign in" : "Create an account"}
            </button>
          </div>
          {isRegister && <p className="helper-text">Use at least 8 characters for your password.</p>}
        </div>
      </section>
    </main>
  );
}
