import { useEffect, useRef, useState } from 'react';
import { patchStatus } from '../api';
import { useToast } from './Toast';

const STATUSES = ['Active', 'On Leave', 'Suspended', 'Graduated'];

const badgeClass = {
  Active: 'badge-active',
  'On Leave': 'badge-leave',
  Suspended: 'badge-suspended',
  Graduated: 'badge-graduated',
};

export function StatusBadge({ status, studentId, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const addToast = useToast();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const change = async (s) => {
    if (s === status) { setOpen(false); return; }
    setLoading(true);
    try {
      await patchStatus(studentId, s);
      addToast(`Status updated to "${s}"`, 'success');
      onUpdated?.(s);
    } catch {
      addToast('Failed to update status', 'error');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <span
        className={`badge ${badgeClass[status] || ''}`}
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setOpen(o => !o)}
        title="Click to change status"
      >
        {loading ? '…' : status}
        {!loading && <span style={{ marginLeft: 4, fontSize: 9 }}>▾</span>}
      </span>
      {open && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, zIndex: 200,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: 6, minWidth: 130,
          boxShadow: 'var(--shadow-md)',
        }}>
          {STATUSES.map(s => (
            <div
              key={s}
              onClick={() => change(s)}
              style={{
                padding: '7px 12px', cursor: 'pointer', borderRadius: 6,
                fontSize: 13, color: s === status ? 'var(--accent-light)' : 'var(--text-secondary)',
                background: s === status ? 'var(--accent-glow)' : 'transparent',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = s === status ? 'var(--accent-glow)' : 'transparent'}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
