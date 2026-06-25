'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStaffAuth } from '@/lib/staff-auth-context';

export default function AdminLoginPage() {
  const { login, staffUser, loading } = useStaffAuth();
  const router = useRouter();
  const [loginVal, setLoginVal] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect to admin home
  useEffect(() => {
    if (!loading && staffUser) {
      router.replace('/admin');
    }
  }, [loading, staffUser, router]);

  if (loading) return null;
  if (staffUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(loginVal, password);
      router.replace('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <h1>Грильяж CRM</h1>
        <p style={{ color: '#999', marginBottom: 24 }}>Вход для сотрудников</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            className="auth-input"
            placeholder="Логин"
            value={loginVal}
            onChange={(e) => setLoginVal(e.target.value)}
            required
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Вход...' : 'Войти'}
          </button>
          {error && <p className="auth-error">{error}</p>}
        </form>
      </div>
    </div>
  );
}
