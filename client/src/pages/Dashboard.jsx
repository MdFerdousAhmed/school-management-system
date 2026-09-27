import { useEffect, useState } from 'react';
import { getStats } from '../api';
import {
  Bar, BarChart, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useTheme } from '../components/ThemeContext';

const STATUS_COLORS = {
  Active:    '#10b981',
  'On Leave':'#f59e0b',
  Suspended: '#ef4444',
  Graduated: '#6366f1',
};

const DEPT_COLORS = [
  '#6366f1','#8b5cf6','#a78bfa','#3b82f6',
  '#06b6d4','#10b981','#f59e0b','#ef4444',
  '#ec4899','#f97316',
];

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '7px 12px', fontSize: 12.5,
      boxShadow: '0 4px 12px var(--shadow-color)',
      color: 'var(--text-primary)',
    }}>
      <strong>{payload[0].name ?? payload[0].dataKey}</strong>: {payload[0].value}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const { theme }             = useTheme();

  const axisColor = theme === 'dark' ? '#4b5563' : '#94a3b8';

  useEffect(() => {
    getStats()
      .then(r => setStats(r.data.stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex-center" style={{ height: 300 }}>
      <span className="spinner spinner-lg" />
    </div>
  );

  if (!stats) return (
    <div className="empty-state">
      <div className="empty-icon">⚠️</div>
      <h3>Could not load stats</h3>
      <p>Make sure the backend is running on port 3000.</p>
    </div>
  );

  const statCards = [
    { label: 'Total Students', value: stats.total ?? 0,                                  icon: '🎓', color: '#6366f1' },
    { label: 'Active',         value: stats.active ?? 0,                                 icon: '✅', color: '#10b981' },
    { label: 'Average GPA',    value: stats.avgGpa != null ? Number(stats.avgGpa).toFixed(2) : '0.00', icon: '📈', color: '#f59e0b' },
    { label: 'Departments',    value: stats.departments?.length ?? 0,                    icon: '🏛️', color: '#3b82f6' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13.5 }}>
          Overview of your student management system
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid-4" style={{ marginBottom: 22 }}>
        {statCards.map(c => (
          <div
            key={c.label}
            className="stat-card"
            style={{ '--accent-gradient': `linear-gradient(90deg, ${c.color}, ${c.color}bb)` }}
          >
            <div className="stat-label">{c.label}</div>
            <div className="stat-value">{c.value}</div>
            <div className="stat-icon">{c.icon}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid-2" style={{ gap: 18 }}>
        {/* Dept bar */}
        <div className="card">
          <h3 style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 16 }}>
            Students by Department
          </h3>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={stats.departments} margin={{ top: 0, right: 0, left: -22, bottom: 0 }}>
              <XAxis
                dataKey="department"
                tick={{ fontSize: 10, fill: axisColor }}
                tickLine={false} axisLine={false}
                interval={0}
                tickFormatter={v => v.split(' ').map(w => w[0]).join('').toUpperCase()}
              />
              <YAxis tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--accent-glow)' }} />
              <Bar dataKey="count" name="Students" radius={[4,4,0,0]}>
                {stats.departments.map((_, i) => (
                  <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status donut */}
        <div className="card">
          <h3 style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 16 }}>
            Students by Status
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <ResponsiveContainer width={150} height={150}>
              <PieChart>
                <Pie
                  data={stats.statuses} dataKey="count" nameKey="status"
                  cx="50%" cy="50%" innerRadius={42} outerRadius={68}
                  paddingAngle={3}
                >
                  {stats.statuses.map((s, i) => (
                    <Cell key={i} fill={STATUS_COLORS[s.status] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1, minWidth: 120 }}>
              {stats.statuses.map(s => (
                <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{
                    width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
                    background: STATUS_COLORS[s.status] || '#94a3b8',
                  }} />
                  <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{s.status}</span>
                  <span style={{ fontWeight: 700 }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Year level horizontal bar */}
        <div className="card">
          <h3 style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 16 }}>
            Students by Year Level
          </h3>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={stats.yearLevels} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} />
              <YAxis
                type="category" dataKey="year_level"
                tick={{ fontSize: 11, fill: axisColor }} tickLine={false} axisLine={false} width={68}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--accent-glow)' }} />
              <Bar dataKey="count" name="Students" fill="#6366f1" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3 style={{ fontSize: 13.5, fontWeight: 600 }}>Quick Summary</h3>
          {[
            { label: 'Inactive Students',  value: (stats.total || 0) - (stats.active || 0),                             color: 'var(--warning)' },
            { label: 'Graduated',          value: stats.statuses?.find(s => s.status === 'Graduated')?.count ?? 0,     color: 'var(--accent-light)' },
            { label: 'On Leave',           value: stats.statuses?.find(s => s.status === 'On Leave')?.count ?? 0,      color: 'var(--warning)' },
            { label: 'Suspended',          value: stats.statuses?.find(s => s.status === 'Suspended')?.count ?? 0,     color: 'var(--danger)' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: item.color }}>{item.value}</span>
            </div>
          ))}
          <div className="divider" style={{ margin: '2px 0' }} />
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}
