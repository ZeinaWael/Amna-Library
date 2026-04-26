import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { useAuth } from '../store/auth';
import { ApiError, type ApiEnvelope } from '../types/api';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const token = useAuth.getState().token;
  if (token) {
    cfg.headers = cfg.headers ?? {};
    (cfg.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return cfg;
});

api.interceptors.response.use(
  (res: AxiosResponse<ApiEnvelope<unknown>>) => {
    const env = res.data;
    if (env && typeof env === 'object' && 'success' in env) {
      if (env.success) {
        res.data = env.data as never;
        return res;
      }
      throw new ApiError(env.message ?? 'Request failed', res.status, env.errors ?? []);
    }
    return res;
  },
  (err: AxiosError<ApiEnvelope<unknown>>) => {
    const status = err.response?.status ?? 0;
    if (status === 401) {
      useAuth.getState().logout();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin/login')) {
        window.location.href = '/admin/login';
      }
    }
    const env = err.response?.data;
    const message = env?.message ?? err.message ?? 'Request failed';
    const errors = env?.errors ?? [];
    return Promise.reject(new ApiError(message, status, errors));
  }
);
