'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

type StaffUser = {
  id: string;
  login: string;
  name: string;
  role: 'ADMIN' | 'OPERATOR';
};

type StaffAuthContextValue = {
  staffUser: StaffUser | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const StaffAuthContext = createContext<StaffAuthContextValue | null>(null);

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStaffUser = useCallback(async () => {
    const token = localStorage.getItem('staffAccessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/v1/staff/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setStaffUser(await res.json());
      } else {
        // Try refresh
        const refreshToken = localStorage.getItem('staffRefreshToken');
        if (refreshToken) {
          const refreshRes = await fetch('/api/v1/staff/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          if (refreshRes.ok) {
            const tokens = await refreshRes.json();
            localStorage.setItem('staffAccessToken', tokens.accessToken);
            localStorage.setItem('staffRefreshToken', tokens.refreshToken);
            const retry = await fetch('/api/v1/staff/auth/me', {
              headers: { Authorization: `Bearer ${tokens.accessToken}` },
            });
            if (retry.ok) setStaffUser(await retry.json());
          } else {
            localStorage.removeItem('staffAccessToken');
            localStorage.removeItem('staffRefreshToken');
          }
        } else {
          localStorage.removeItem('staffAccessToken');
        }
      }
    } catch {
      // silent
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStaffUser();
  }, [fetchStaffUser]);

  const login = async (loginVal: string, password: string) => {
    const res = await fetch('/api/v1/staff/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: loginVal, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Ошибка входа' }));
      throw new Error(err.message || 'Ошибка входа');
    }
    const { accessToken, refreshToken } = await res.json();
    localStorage.setItem('staffAccessToken', accessToken);
    localStorage.setItem('staffRefreshToken', refreshToken);
    await fetchStaffUser();
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('staffRefreshToken');
    if (refreshToken) {
      try {
        await fetch('/api/v1/staff/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // ignore
      }
    }
    localStorage.removeItem('staffAccessToken');
    localStorage.removeItem('staffRefreshToken');
    setStaffUser(null);
  };

  return (
    <StaffAuthContext.Provider value={{ staffUser, loading, login, logout }}>
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth() {
  const ctx = useContext(StaffAuthContext);
  if (!ctx) throw new Error('useStaffAuth must be used within StaffAuthProvider');
  return ctx;
}
