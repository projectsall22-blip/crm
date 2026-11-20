import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('crm_access_token', res.data.accessToken);
    localStorage.setItem('crm_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    localStorage.removeItem('crm_access_token');
    localStorage.removeItem('crm_user');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      localStorage.setItem('crm_user', JSON.stringify(res.data.user));
      return res.data.user;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('crm_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('crm_user');
      }
    }
    // Verify token is still valid
    const token = localStorage.getItem('crm_access_token');
    if (token) {
      api.get('/auth/me').then((res) => {
        setUser(res.data.user);
        localStorage.setItem('crm_user', JSON.stringify(res.data.user));
      }).catch(() => {
        // Try refresh
        api.post('/auth/refresh', {}, { withCredentials: true }).then((res) => {
          localStorage.setItem('crm_access_token', res.data.accessToken);
          return api.get('/auth/me');
        }).then((res) => {
          setUser(res.data.user);
        }).catch(() => {
          localStorage.removeItem('crm_access_token');
          localStorage.removeItem('crm_user');
          setUser(null);
        }).finally(() => setLoading(false));
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isProducer: user?.role === 'producer',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
