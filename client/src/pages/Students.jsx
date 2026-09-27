import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteStudent, exportCSV, getStudents, resetData } from '../api';
import StudentForm from '../components/StudentForm';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';

const SORT_FIELDS = [
  { key: 'id',         label: 'ID' },
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name',  label: 'Last Name' },
  { key: 'department', label: 'Department' },
  { key: 'gpa',        label: 'GPA' },
  { key: 'status',     label: 'Status' },
  { key: 'created_at', label: 'Date Added' },
];

const DEPTS   = ['All','Computer Science','Engineering','Business Administration','Mathematics','Physics','Chemistry','Biology','Psychology','Economics','Literature'];
const YEARS   = ['All','1st Year','2nd Year','3rd Year','4th Year','5th Year'];
const STATUSES= ['All','Active','On Leave','Suspended','Graduated'];

function gpaClass(gpa) {
  if (gpa >= 3.5) return 'gpa-high';
  if (gpa >= 2.5) return 'gpa-mid';
  return 'gpa-low';
}

function avatar(first, last) {
  return `${first?.[0]??''}${last?.[0]??''}`.toUpperCase();
}

export default function Students() {
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading]   = useState(true);
  const [q, setQ]               = useState('');
  const [dept, setDept]         = useState('All');
  const [year, setYear]         = useState('All');
  const [status, setStatus]     = useState('All');
  const [sortBy, setSortBy]     = useState('id');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [page, setPage]         = useState(1);
  const [limit]                 = useState(10);

  // View mode: 'table' or 'cards'
  const [viewMode, setViewMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'table'));

  // Edit modal
  const [editStudent, setEditStudent] = useState(null);
  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);
  // View modal
  const [viewStudent, setViewStudent]   = useState(null);

  const addToast = useToast();
  const searchTimer = useRef(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        q: q || undefined,
        department: dept !== 'All' ? dept : undefined,
        year_level: year !== 'All' ? year : undefined,
        status: status !== 'All' ? status : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        limit,
      };
      const r = await getStudents(params);
      setStudents(r.data.data);
      setPagination(r.data.pagination);
    } catch {
      addToast('Failed to load students', 'error');
    } finally {
      setLoading(false);
    }
  }, [q, dept, year, status, sortBy, sortOrder, page, limit]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleSearch = (v) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setQ(v); setPage(1); }, 350);
  };

  const toggleSort = (field) => {
    if (sortBy === field) setSortOrder(o => o === 'ASC' ? 'DESC' : 'ASC');
    else { setSortBy(field); setSortOrder('ASC'); }
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteStudent(deleteTarget.id);
      addToast(`${deleteTarget.first_name} ${deleteTarget.last_name} deleted`, 'success');
      setDeleteTarget(null);
      fetchStudents();
    } catch {
      addToast('Delete failed', 'error');
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset database to sample students? This cannot be undone.')) return;
    try {
      await resetData();
      addToast('Database reset to sample data', 'info');
      fetchStudents();
    } catch {
      addToast('Reset failed', 'error');
    }
  };

  const sortIcon = (field) => {
    if (sortBy !== field) return ' ↕';
    return sortOrder === 'ASC' ? ' ↑' : ' ↓';
  };

  return (
    <div>
      {/* Header */}
      <div className="flex-between page-header-actions" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Students</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13.5 }}>
            {pagination.total} student{pagination.total !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="flex-gap" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="view-toggle">
            <button
              type="button"
              className={`view-toggle-btn${viewMode === 'table' ? ' active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table view"
            >
              ☰ Table
            </button>
            <button
              type="button"
              className={`view-toggle-btn${viewMode === 'cards' ? ' active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Card grid view"
            >
              ☷ Cards
            </button>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={exportCSV} title="Export CSV">
            ⬇️ CSV
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleReset}>
            🔄 Reset
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <div className="filter-row flex-wrap">
          <div className="search-bar" style={{ flex: '1 1 220px', minWidth: 0 }}>
            <span className="search-icon">🔍</span>
            <input
              className="form-input"
              placeholder="Search name, email, ID…"
              onChange={e => handleSearch(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <select
            className="form-select" style={{ flex: '1 1 150px', minWidth: 0 }}
            value={dept} onChange={e => { setDept(e.target.value); setPage(1); }}>
            {DEPTS.map(d => <option key={d}>{d}</option>)}
          </select>
          <select
            className="form-select" style={{ flex: '1 1 120px', minWidth: 0 }}
            value={year} onChange={e => { setYear(e.target.value); setPage(1); }}>
            {YEARS.map(y => <option key={y}>{y}</option>)}
          </select>
          <select
            className="form-select" style={{ flex: '1 1 120px', minWidth: 0 }}
            value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          {(dept !== 'All' || year !== 'All' || status !== 'All') && (
            <button className="btn btn-secondary btn-sm"
              onClick={() => { setDept('All'); setYear('All'); setStatus('All'); setPage(1); }}>
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Content: Cards or Table */}
      {viewMode === 'cards' ? (
        loading ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <span className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : students.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">🎓</div>
              <h3>No students found</h3>
              <p>Try adjusting the filters or add a new student.</p>
            </div>
          </div>
        ) : (
          <div className="students-card-grid">
            {students.map(s => (
              <div key={s.id} className="student-card">
                <div className="student-card-header">
                  <div className="student-card-user">
                    <div className="avatar" style={{ width: 38, height: 38, fontSize: 13, flexShrink: 0 }}>
                      {avatar(s.first_name, s.last_name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="student-card-name">{s.first_name} {s.last_name}</div>
                      <div className="student-card-id">{s.student_id}</div>
                    </div>
                  </div>
                  <StatusBadge status={s.status} studentId={s.id} onUpdated={fetchStudents} />
                </div>

                <div className="student-card-details">
                  <div className="student-card-row">
                    <span className="student-card-label">Department</span>
                    <span className="student-card-val" style={{ fontSize: 12 }}>{s.department}</span>
                  </div>
                  <div className="student-card-row">
                    <span className="student-card-label">Year Level</span>
                    <span className="student-card-val">{s.year_level}</span>
                  </div>
                  <div className="student-card-row">
                    <span className="student-card-label">GPA</span>
                    <span className={gpaClass(s.gpa)} style={{ fontSize: 12, padding: '2px 8px' }}>
                      {s.gpa?.toFixed(2)}
                    </span>
                  </div>
                  <div className="student-card-row">
                    <span className="student-card-label">Email</span>
                    <a
                      href={`mailto:${s.email}`}
                      style={{
                        fontSize: 12, color: 'var(--accent-light)', textDecoration: 'none',
                        maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}
                      title={s.email}
                    >
                      {s.email}
                    </a>
                  </div>
                </div>

                <div className="student-card-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => setViewStudent(s)} title="View Profile">
                    👁️ View
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditStudent(s)} title="Edit Student">
                    ✏️ Edit
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(s)} title="Delete Student">
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Table */
        <div className="table-wrapper" style={{ background: 'var(--bg-card)' }}>
          <table>
            <thead>
              <tr>
                <th onClick={() => toggleSort('id')} className="col-hide-md" style={{ width: 45 }}>ID{sortIcon('id')}</th>
                <th onClick={() => toggleSort('first_name')} style={{ minWidth: 155 }}>Name{sortIcon('first_name')}</th>
                <th style={{ minWidth: 135, maxWidth: 165 }}>Email</th>
                <th onClick={() => toggleSort('department')} style={{ minWidth: 125 }}>Department{sortIcon('department')}</th>
                <th onClick={() => toggleSort('year_level')} style={{ minWidth: 70 }}>Year{sortIcon('year_level')}</th>
                <th onClick={() => toggleSort('gpa')} style={{ minWidth: 55 }}>GPA{sortIcon('gpa')}</th>
                <th onClick={() => toggleSort('status')} style={{ minWidth: 90 }}>Status{sortIcon('status')}</th>
                <th onClick={() => toggleSort('created_at')} className="col-hide-lg" style={{ minWidth: 90 }}>Registered{sortIcon('created_at')}</th>
                <th className="col-actions" style={{ width: 95, cursor: 'default', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 48 }}>
                  <span className="spinner" style={{ margin: '0 auto' }} />
                </td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={9}>
                  <div className="empty-state">
                    <div className="empty-icon">🎓</div>
                    <h3>No students found</h3>
                    <p>Try adjusting the filters or add a new student.</p>
                  </div>
                </td></tr>
              ) : students.map(s => (
                <tr key={s.id}>
                  <td className="col-hide-md" style={{ color: 'var(--text-muted)', fontSize: 12 }}>{s.id}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>
                      <div className="avatar" style={{ width: 30, height: 30, fontSize: 11, flexShrink: 0 }}>
                        {avatar(s.first_name, s.last_name)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap' }}>{s.first_name} {s.last_name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{s.student_id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-secondary)', maxWidth: 165, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span title={s.email}>{s.email}</span>
                  </td>
                  <td style={{ fontSize: 12.5 }}>{s.department}</td>
                  <td style={{ fontSize: 12 }}>{s.year_level}</td>
                  <td>
                    <span className={gpaClass(s.gpa)}>{s.gpa?.toFixed(2)}</span>
                  </td>
                  <td>
                    <StatusBadge status={s.status} studentId={s.id} onUpdated={fetchStudents} />
                  </td>
                  <td className="col-hide-lg" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="col-actions">
                    <div className="flex-gap" style={{ gap: 5, justifyContent: 'center' }}>
                      <button className="btn btn-secondary btn-sm btn-icon" title="View"
                        onClick={() => setViewStudent(s)}>👁️</button>
                      <button className="btn btn-secondary btn-sm btn-icon" title="Edit"
                        onClick={() => setEditStudent(s)}>✏️</button>
                      <button className="btn btn-danger btn-sm btn-icon" title="Delete"
                        onClick={() => setDeleteTarget(s)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex-between" style={{ marginTop: 16 }}>
          <span className="pagination-info" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} students
          </span>
          <div className="pagination">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(pagination.totalPages - 4, page - 2)) + i;
              return (
                <button key={p} className={`page-btn${p === page ? ' active' : ''}`}
                  onClick={() => setPage(p)}>{p}</button>
              );
            })}
            <button className="page-btn" disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)}>›</button>
            <button className="page-btn" disabled={page === pagination.totalPages} onClick={() => setPage(pagination.totalPages)}>»</button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editStudent && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditStudent(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Edit Student</h2>
              <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setEditStudent(null)}>✕</button>
            </div>
            <div className="modal-body">
              <StudentForm
                student={editStudent}
                onSaved={() => { setEditStudent(null); fetchStudents(); }}
                onCancel={() => setEditStudent(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewStudent && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewStudent(null)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 className="modal-title">Student Profile</h2>
              <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setViewStudent(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div className="avatar" style={{ width: 54, height: 54, fontSize: 20 }}>
                  {avatar(viewStudent.first_name, viewStudent.last_name)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>{viewStudent.first_name} {viewStudent.last_name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{viewStudent.student_id}</div>
                  <StatusBadge status={viewStudent.status} studentId={viewStudent.id}
                    onUpdated={(newStatus) => { fetchStudents(); setViewStudent(s => (s ? { ...s, status: newStatus || s.status } : null)); }} />
                </div>
              </div>
              <div className="grid-2" style={{ gap: 12 }}>
                {[
                  ['Email', viewStudent.email],
                  ['Phone', viewStudent.phone || '—'],
                  ['Gender', viewStudent.gender],
                  ['Date of Birth', viewStudent.dob || '—'],
                  ['Department', viewStudent.department],
                  ['Year Level', viewStudent.year_level],
                  ['GPA', viewStudent.gpa?.toFixed(2)],
                  ['Registered', viewStudent.created_at ? new Date(viewStudent.created_at).toLocaleDateString() : '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setViewStudent(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => { setEditStudent(viewStudent); setViewStudent(null); }}>
                ✏️ Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2 className="modal-title">Delete Student</h2>
              <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setDeleteTarget(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>
                  {deleteTarget.first_name} {deleteTarget.last_name}
                </strong>? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>🗑️ Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
