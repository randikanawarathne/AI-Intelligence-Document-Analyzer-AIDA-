import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: BASE, timeout: 60000 });

export const uploadDocument = (file, onProgress) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
  });
};

export const queryDocuments = (query) =>
  api.post('/query', { query });

export const getDocuments = () => api.get('/documents');
export const getStats     = () => api.get('/stats');
export const getHealth    = () => api.get('/health');

export default api;
