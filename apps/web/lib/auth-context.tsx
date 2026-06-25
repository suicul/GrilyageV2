'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type User = {
  id: string;
  email: string | null;
  name: string;
  phone: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  authModalOpen: boolean;
  setAuthModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  phoneLogin: (phone: string, code: string, name?: string) => Promise<void>;
  socialLogin: (provider: string, token: string, telegramData?: any) => Promise<void>;
  sendEmailOtp: (email: string) => Promise<void>;
  verifyEmailOtp: (email: string, code: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      // httpOnly cookie is sent automatically — no need to read from localStorage
      const res = await fetch('/api/v1/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = (await res.json()) as User;
        setUser(data);
      } else if (res.status === 401) {
        // Try refresh with stored refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const refreshRes = await fetch('/api/v1/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          if (refreshRes.ok) {
            const tokens = (await refreshRes.json()) as {
              accessToken: string;
              refreshToken: string;
            };
            // Access token is now httpOnly cookie (set by server)
            // Only store refresh token in localStorage
            localStorage.setItem('refreshToken', tokens.refreshToken);
            // Retry fetch — cookie is already set
            const retry = await fetch('/api/v1/auth/me', { credentials: 'include' });
            if (retry.ok) setUser((await retry.json()) as User);
          } else {
            localStorage.removeItem('refreshToken');
          }
        }
      }
    } catch {
      // Network error — silent
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message ?? 'Не удалось войти');
    }
    const { refreshToken } = await res.json();
    // Access token is set as httpOnly cookie by the server
    // Only store refresh token in localStorage
    localStorage.setItem('refreshToken', refreshToken);
    await fetchUser();
  };

  const register = async (email: string, password: string, name: string, phone?: string) => {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, phone }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message ?? 'Не удалось зарегистрироваться');
    }
  };

  const phoneLogin = async (phone: string, code: string, name?: string) => {
    const res = await fetch('/api/v1/auth/social/phone-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code, name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message ?? 'Не удалось войти через телефон');
    }
    const { refreshToken } = await res.json();
    // Access token set via httpOnly cookie by the server
    localStorage.setItem('refreshToken', refreshToken);
    await fetchUser();
  };

  const socialLogin = async (provider: string, token: string, telegramData?: any) => {
    let endpoint = `/api/v1/auth/social/${provider}`;
    let body: any = {};
    if (provider === 'vk' || provider === 'yandex') {
      body = { access_token: token };
    } else if (provider === 'telegram' && telegramData) {
      body = telegramData;
    } else if (provider === 'email-otp') {
      endpoint = `/api/v1/auth/social/email-otp`;
      body = JSON.parse(token);
    }
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message ?? 'Ошибка авторизации');
    }
    const { refreshToken } = await res.json();
    // Access token set via httpOnly cookie by the server
    localStorage.setItem('refreshToken', refreshToken);
    await fetchUser();
  };

  const sendEmailOtp = async (email: string) => {
    const res = await fetch('/api/v1/auth/social/send-email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message ?? 'Ошибка отправки кода');
    }
  };

  const verifyEmailOtp = async (email: string, code: string) => {
    const res = await fetch('/api/v1/auth/social/email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message ?? 'Неверный код');
    }
    const data = await res.json();
    // Access token set via httpOnly cookie by the server
    localStorage.setItem('refreshToken', data.refreshToken);
    await fetchUser();
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // ignore
      }
    }
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, authModalOpen, setAuthModalOpen, login, register, logout, fetchUser, phoneLogin, socialLogin, sendEmailOtp, verifyEmailOtp }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
