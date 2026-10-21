import { useEffect, useState } from "react";
import { BookOpen, GraduationCap, LayoutDashboard, LogOut, UsersRound } from "lucide-react";
import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage.jsx";
import CoursesPage from "./pages/CoursesPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import StudentsPage from "./pages/StudentsPage.jsx";
import { api, getToken, setToken } from "./services/api.js";

function Workspace({ user, onLogout }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/" className="brand"><span className="brand-mark"><GraduationCap size={22} /></span> CampusDesk</NavLink>
        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav">
          <NavLink to="/" end><LayoutDashboard size={18} /> Overview</NavLink>
          <NavLink to="/students"><UsersRound size={18} /> Students</NavLink>
          <NavLink to="/courses"><BookOpen size={18} /> Courses</NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div className="user-card"><span className="user-avatar">{user.name.charAt(0).toUpperCase()}</span><span><b>{user.name}</b><small>{user.email}</small></span></div>
          <button className="logout-button" onClick={onLogout}><LogOut size={17} /> Sign out</button>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar"><span>Campus administration</span><span className="secure-label"><i /> Secure workspace</span></header>
        <div className="page-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(getToken()));
  const navigate = useNavigate();

  useEffect(() => {
    if (!getToken()) return;
    api("/auth/me")
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setChecking(false));
  }, []);

  function logout() {
    setToken(null);
    setUser(null);
    navigate("/");
  }

  if (checking) return <div className="loading-screen">Opening your workspace…</div>;
  if (!user) return <AuthPage onAuthenticated={setUser} />;
  return <Workspace user={user} onLogout={logout} />;
}
