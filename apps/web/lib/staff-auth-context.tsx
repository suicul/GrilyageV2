'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { staffApiFetch, fetchCsrfToken } from './staff-api';

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

  // Fetch CSRF token on mount — sets the non-httpOnly csrf-token cookie
  useEffect(() => {
    fetchCsrfToken();
  }, []);

  const fetchStaffUser = useCallback(async () => {
    try {
      // httpOnly cookie is sent automatically — no need to read from localStorage
      const res = await staffApiFetch('/api/v1/staff/auth/me');
      if (res.ok) {
        setStaffUser(await res.json());
      } else if (res.status === 401) {
        // Try refresh with stored refresh token
        const refreshToken = localStorage.getItem('staffRefreshToken');
        if (refreshToken) {
          const refreshRes = await staffApiFetch('/api/v1/staff/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          if (refreshRes.ok) {
            const tokens = await refreshRes.json();
            // Store new refresh token (access token is in httpOnly cookie)
            localStorage.setItem('staffRefreshToken', tokens.refreshToken);
            // Retry profile fetch — cookie is already set
            const retry = await staffApiFetch('/api/v1/staff/auth/me');
            if (retry.ok) setStaffUser(await retry.json());
          } else {
            localStorage.removeItem('staffRefreshToken');
          }
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
    const res = await staffApiFetch('/api/v1/staff/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: loginVal, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message ?? 'Не удалось войти');
    }
    const { refreshToken } = await res.json();
    // Access token is set as httpOnly cookie by the server
    // Only store refresh token in localStorage
    localStorage.setItem('staffRefreshToken', refreshToken);
    // Re-fetch CSRF token after login (new session)
    await fetchCsrfToken();
    await fetchStaffUser();
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('staffRefreshToken');
    if (refreshToken) {
      try {
        await staffApiFetch('/api/v1/staff/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // ignore
      }
    }
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
