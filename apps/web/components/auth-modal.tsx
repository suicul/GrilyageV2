'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function AuthModal() {
  const { user, authModalOpen, setAuthModalOpen, login, register, logout } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      if (tab === 'login') {
        await login(email, password);
        setAuthModalOpen(false);
        setEmail('');
        setPassword('');
      } else {
        await register(email, password, name, phone || undefined);
        setSuccess('Регистрация прошла успешно! Проверьте почту для верификации.');
        setTab('login');
        setPassword('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setAuthModalOpen(false);
  };

  return (
    <>
      <div className="auth-overlay" onClick={() => setAuthModalOpen(false)} />
      <div className="auth-modal">
        <button className="close" onClick={() => setAuthModalOpen(false)}>
          ×
        </button>

        {user ? (
          <div className="auth-user-info">
            <p style={{ fontWeight: 700, margin: '0 0 8px' }}>{user.name}</p>
            <p style={{ color: 'var(--wood)', margin: '0 0 16px', fontSize: 14 }}>{user.email}</p>
            <Link href="/cabinet" onClick={() => setAuthModalOpen(false)}>
              <button className="auth-submit" type="button" style={{ marginBottom: 8 }}>
                Личный кабинет
              </button>
            </Link>
            <button
              className="auth-submit"
              type="button"
              onClick={handleLogout}
              style={{ background: '#fee', color: '#c33' }}
            >
              Выйти
            </button>
          </div>
        ) : (
          <>
            <div className="auth-tabs">
              <button
                className={`auth-tab${tab === 'login' ? ' active' : ''}`}
                onClick={() => { setTab('login'); setError(''); setSuccess(''); }}
              >
                Войти
              </button>
              <button
                className={`auth-tab${tab === 'register' ? ' active' : ''}`}
                onClick={() => { setTab('register'); setError(''); setSuccess(''); }}
              >
                Регистрация
              </button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {tab === 'register' && (
                <input
                  className="auth-input"
                  placeholder="Имя"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              )}
              <input
                className="auth-input"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {tab === 'register' && (
                <input
                  className="auth-input"
                  placeholder="Телефон (необязательно)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              )}
              <input
                className="auth-input"
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button className="auth-submit" type="submit" disabled={submitting}>
                {submitting ? 'Подождите...' : tab === 'login' ? 'Войти' : 'Зарегистрироваться'}
              </button>
              {error && <p className="auth-error">{error}</p>}
              {success && <p className="auth-success">{success}</p>}
            </form>
          </>
        )}
      </div>
    </>
  );
}
