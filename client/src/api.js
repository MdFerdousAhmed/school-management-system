import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

export default api;

// ─── Students ─────────────────────────────────────────────────────────────────

export const getStudents = (params) => api.get('/students', { params });
export const getStudent  = (id)     => api.get(`/students/${id}`);
export const createStudent = (data) => api.post('/students', data);
export const updateStudent = (id, data) => api.put(`/students/${id}`, data);
export const deleteStudent = (id)   => api.delete(`/students/${id}`);
export const patchStatus  = (id, status) => api.patch(`/students/${id}/status`, { status });

// ─── Stats ────────────────────────────────────────────────────────────────────

export const getStats = () => api.get('/stats');

// ─── Bulk / Export ────────────────────────────────────────────────────────────

export const bulkImport  = (students) => api.post('/students/bulk', { students });
export const resetData   = ()         => api.post('/students/reset');
export const exportCSV   = ()         => {
  const base = import.meta.env.VITE_API_URL || '/api';
  window.open(`${base}/export/csv`, '_blank');
};
