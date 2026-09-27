import { NavLink, useLocation } from 'react-router-dom';

const links = [
  { to: '/',         icon: '📊', label: 'Dashboard' },
  { to: '/students', icon: '🎓', label: 'Students' },
  { to: '/add',      icon: '➕', label: 'Add Student' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🎓</div>
        <div className="sidebar-logo-text">
          SMS
          <span>Student Management</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Main</div>
        {links.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer" style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
        Student Management System
      </div>
    </aside>
  );
}
