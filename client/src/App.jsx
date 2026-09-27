import { useEffect, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { ToastProvider } from './components/Toast';
import AddStudent from './pages/AddStudent';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';

const NAV_LINKS = [
  { to: '/',         icon: '📊', label: 'Dashboard' },
  { to: '/students', icon: '🎓', label: 'Students' },
  { to: '/add',      icon: '➕', label: 'Add Student' },
];

const PAGE_TITLES = {
  '/':         'Dashboard',
  '/students': 'Students',
  '/add':      'Add Student',
};

/* ── Sidebar ── */
function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Overlay (mobile) */}
      <div
        className={`sidebar-overlay${open ? ' open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🎓</div>
          <div className="sidebar-logo-text">
            SMS
            <span>Student Management</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main</div>
          {NAV_LINKS.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          Student Management System
        </div>
      </aside>
    </>
  );
}

/* ── Top bar ── */
function Topbar({ sidebarOpen, onToggleSidebar }) {
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] ?? 'SMS';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className={`hamburger${sidebarOpen ? ' open' : ''}`}
          onClick={onToggleSidebar}
          aria-label="Toggle navigation"
        >
          <span /><span /><span />
        </button>
        <span className="topbar-title">{title}</span>
      </div>

      <div className="topbar-actions">
        <span className="topbar-date" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
          })}
        </span>
        <button
          className="theme-toggle"
          onClick={toggle}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}

/* ── Shell ── */
function Shell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // Close sidebar on wide screens (desktop >= 993px)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 993px)');
    const handler = (e) => { if (e.matches) setSidebarOpen(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <Topbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(o => !o)}
        />
        <main className="page">
          <Routes>
            <Route path="/"         element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/add"      element={<AddStudent />} />
            <Route path="*"         element={
              <div className="empty-state">
                <div className="empty-icon">🗺️</div>
                <h3>Page not found</h3>
                <p>The page you're looking for doesn't exist.</p>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </div>
  );
}

/* ── Root ── */
export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <Shell />
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
