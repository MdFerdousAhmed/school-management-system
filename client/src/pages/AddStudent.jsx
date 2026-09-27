import StudentForm from '../components/StudentForm';
import { useNavigate } from 'react-router-dom';

export default function AddStudent() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Add Student</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13.5 }}>
          Fill in the details below to register a new student.
        </p>
      </div>
      <div className="card">
        <StudentForm
          onSaved={() => navigate('/students')}
          onCancel={() => navigate('/students')}
        />
      </div>
    </div>
  );
}
