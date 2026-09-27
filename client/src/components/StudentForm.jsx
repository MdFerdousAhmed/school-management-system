import { useEffect, useState } from 'react';
import { createStudent, updateStudent } from '../api';
import { useToast } from './Toast';

const DEPARTMENTS = [
  'Computer Science', 'Engineering', 'Business Administration',
  'Mathematics', 'Physics', 'Chemistry', 'Biology',
  'Psychology', 'Economics', 'Literature',
];
const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];
const GENDERS     = ['Male', 'Female', 'Other'];
const STATUSES    = ['Active', 'On Leave', 'Suspended', 'Graduated'];

const INIT = {
  student_id: '', first_name: '', last_name: '', email: '',
  phone: '', gender: 'Other', dob: '', department: '',
  year_level: '', gpa: '', status: 'Active',
};

/* ── Defined OUTSIDE the form component so React doesn't recreate them on every render ── */
function FieldGroup({ label, required, fullWidth, error, hint, children }) {
  return (
    <div className="form-group" style={fullWidth ? { gridColumn: '1 / -1' } : {}}>
      <label className="form-label">
        {label}{required && <span className="required"> *</span>}
      </label>
      {children}
      {error && <span className="form-error">⚠ {error}</span>}
      {hint && !error && <span className="form-hint">{hint}</span>}
    </div>
  );
}

function SectionLabel({ title }) {
  return (
    <div style={{
      gridColumn: '1 / -1',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.07em',
      color: 'var(--text-muted)',
      textTransform: 'uppercase',
      borderBottom: '1px solid var(--border)',
      paddingBottom: 6,
      marginTop: 8,
    }}>
      {title}
    </div>
  );
}

/* ── Main Form Component ── */
export default function StudentForm({ student, onSaved, onCancel }) {
  const [form, setForm]     = useState(student ? { ...student } : { ...INIT });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const addToast = useToast();
  const editing = !!student;

  useEffect(() => {
    if (student) setForm({ ...student });
  }, [student]);

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = 'Required';
    if (!form.last_name.trim())  e.last_name  = 'Required';
    if (!form.email.trim())      e.email      = 'Required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address';
    if (!form.department)        e.department  = 'Required';
    if (!form.year_level)        e.year_level  = 'Required';
    if (form.gpa !== '' && (isNaN(form.gpa) || +form.gpa < 0 || +form.gpa > 4))
      e.gpa = 'GPA must be between 0.0 and 4.0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        gpa: form.gpa === '' ? 0 : parseFloat(form.gpa),
      };
      if (editing) {
        await updateStudent(student.id, payload);
        addToast('Student updated successfully', 'success');
      } else {
        await createStudent(payload);
        addToast('Student created successfully', 'success');
        setForm({ ...INIT });
      }
      onSaved?.();
    } catch (err) {
      addToast(err.response?.data?.error || 'Save failed. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="responsive-form-grid" style={{ gap: 16 }}>

        <SectionLabel title="Personal Information" />

        <FieldGroup label="First Name" required error={errors.first_name}>
          <input
            className={`form-input${errors.first_name ? ' error' : ''}`}
            placeholder="John"
            value={form.first_name}
            onChange={e => set('first_name', e.target.value)}
            autoComplete="given-name"
          />
        </FieldGroup>

        <FieldGroup label="Last Name" required error={errors.last_name}>
          <input
            className={`form-input${errors.last_name ? ' error' : ''}`}
            placeholder="Doe"
            value={form.last_name}
            onChange={e => set('last_name', e.target.value)}
            autoComplete="family-name"
          />
        </FieldGroup>

        <FieldGroup label="Email Address" required error={errors.email}>
          <input
            className={`form-input${errors.email ? ' error' : ''}`}
            type="email"
            placeholder="john@example.com"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            autoComplete="email"
          />
        </FieldGroup>

        <FieldGroup label="Phone Number" error={errors.phone}>
          <input
            className="form-input"
            placeholder="+1 555 000 0000"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            autoComplete="tel"
          />
        </FieldGroup>

        <FieldGroup label="Gender" error={errors.gender}>
          <select
            className="form-select"
            value={form.gender}
            onChange={e => set('gender', e.target.value)}
          >
            {GENDERS.map(g => <option key={g}>{g}</option>)}
          </select>
        </FieldGroup>

        <FieldGroup label="Date of Birth" error={errors.dob}>
          <input
            className="form-input"
            type="date"
            value={form.dob}
            onChange={e => set('dob', e.target.value)}
          />
        </FieldGroup>

        <SectionLabel title="Academic Information" />

        <FieldGroup label="Department" required error={errors.department}>
          <select
            className={`form-select${errors.department ? ' error' : ''}`}
            value={form.department}
            onChange={e => set('department', e.target.value)}
          >
            <option value="">— Select Department —</option>
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </select>
        </FieldGroup>

        <FieldGroup label="Year Level" required error={errors.year_level}>
          <select
            className={`form-select${errors.year_level ? ' error' : ''}`}
            value={form.year_level}
            onChange={e => set('year_level', e.target.value)}
          >
            <option value="">— Select Year —</option>
            {YEAR_LEVELS.map(y => <option key={y}>{y}</option>)}
          </select>
        </FieldGroup>

        <FieldGroup label="GPA (0.00 – 4.00)" error={errors.gpa}>
          <input
            className={`form-input${errors.gpa ? ' error' : ''}`}
            type="number"
            step="0.01"
            min="0"
            max="4"
            placeholder="e.g. 3.75"
            value={form.gpa}
            onChange={e => set('gpa', e.target.value)}
          />
        </FieldGroup>

        <FieldGroup label="Status" error={errors.status}>
          <select
            className="form-select"
            value={form.status}
            onChange={e => set('status', e.target.value)}
          >
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </FieldGroup>

        <SectionLabel title="Student ID (Optional)" />

        <FieldGroup
          label="Student ID"
          error={errors.student_id}
          hint="Leave blank to auto-generate (e.g. STU-2026-0001)"
          fullWidth
        >
          <input
            className="form-input"
            placeholder="Leave blank to auto-generate"
            value={form.student_id}
            onChange={e => set('student_id', e.target.value)}
          />
        </FieldGroup>

      </div>

      <div className="divider" style={{ marginTop: 20 }} />

      <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
        {onCancel && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving
            ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving…</>
            : (editing ? '💾 Update Student' : '➕ Create Student')
          }
        </button>
      </div>
    </form>
  );
}
