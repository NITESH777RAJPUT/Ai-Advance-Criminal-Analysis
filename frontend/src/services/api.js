import axios from 'axios';

// Use environment-configured backend base URL if defined (for Vercel deployment),
// otherwise fall back to relative '/api' which uses the local Vite proxy.
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE = rawBaseUrl ? (rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl) : '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('intel_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('intel_auth_token');
      localStorage.removeItem('intel_user_profile');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// -------------------------------------------------------------------
// API Service Modules
// -------------------------------------------------------------------

export const authApi = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('intel_auth_token');
      localStorage.removeItem('intel_user_profile');
    }
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  register: async (userData) => {
    const res = await api.post('/auth/register', userData);
    return res.data;
  },
};

export const uploadApi = {
  uploadText: async (title, text) => {
    const res = await api.post('/upload/text', { title, text });
    return res.data;
  },
  uploadPdf: async (file, title) => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    const res = await api.post('/upload/pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  uploadCsv: async (file, title) => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    const res = await api.post('/upload/csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  uploadJson: async (file, title) => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    const res = await api.post('/upload/json', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  uploadImage: async (file, suspectName, notes) => {
    const formData = new FormData();
    formData.append('file', file);
    if (suspectName) formData.append('suspect_name', suspectName);
    if (notes) formData.append('notes', notes);
    const res = await api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  getHistory: async () => {
    const res = await api.get('/upload/history');
    return res.data;
  },
};

export const entitiesApi = {
  list: async (params) => {
    const res = await api.get('/entities', { params });
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/entities/${id}`);
    return res.data;
  },
  create: async (entityData) => {
    const res = await api.post('/entities', entityData);
    return res.data;
  },
};

export const graphApi = {
  getNetwork: async (params) => {
    const res = await api.get('/graph/network', { params });
    return res.data;
  },
  getPersonSubgraph: async (personId, depth = 2) => {
    const res = await api.get(`/graph/person/${personId}`, { params: { depth } });
    return res.data;
  },
  findPath: async (sourceId, targetId) => {
    const res = await api.get('/graph/path', { params: { source_id: sourceId, target_id: targetId } });
    return res.data;
  },
  getAnalysis: async () => {
    const res = await api.get('/graph/analysis');
    return res.data;
  },
};

export const aiApi = {
  query: async (question, selectedEntityId = null, sessionId = null) => {
    const res = await api.post('/ai/query', {
      question,
      selected_entity_id: selectedEntityId,
      session_id: sessionId,
    });
    return res.data;
  },
};

export const alertsApi = {
  list: async (params) => {
    const res = await api.get('/alerts', { params });
    return res.data;
  },
  runDetection: async () => {
    const res = await api.post('/alerts/run-detection');
    return res.data;
  },
  updateStatus: async (alertId, status, notes) => {
    const res = await api.patch(`/alerts/${alertId}`, { status, investigator_notes: notes });
    return res.data;
  },
};

export const reportsApi = {
  generatePdf: async (params) => {
    const res = await api.post('/reports/generate', params, {
      responseType: 'blob',
    });
    return res.data;
  },
  getHistory: async () => {
    const res = await api.get('/reports');
    return res.data;
  },
};

export const dashboardApi = {
  getStats: async () => {
    const res = await api.get('/dashboard/stats');
    return res.data;
  },
};

export const adminApi = {
  getUsers: async () => {
    const res = await api.get('/admin/users');
    return res.data;
  },
  createUser: async (user) => {
    const res = await api.post('/admin/users', user);
    return res.data;
  },
  deactivateUser: async (id) => {
    const res = await api.delete(`/admin/users/${id}`);
    return res.data;
  },
  getAuditLogs: async () => {
    const res = await api.get('/admin/audit-logs');
    return res.data;
  },
  seedDemo: async () => {
    const res = await api.post('/admin/seed-demo');
    return res.data;
  },
};

export default api;

