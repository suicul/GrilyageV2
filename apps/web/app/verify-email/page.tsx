'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Отсутствует токен подтверждения.');
      return;
    }

    fetch(`/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (res.ok) {
          setStatus('success');
          setMessage('Email подтверждён! Теперь вы можете войти.');
        } else {
          const err = await res.json().catch(() => ({ message: 'Ошибка подтверждения' }));
          setStatus('error');
          setMessage(err.message || 'Неверный или просроченный токен.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Ошибка соединения. Попробуйте позже.');
      });
  }, [token]);

  return (
    <div className="verify-card">
      {status === 'loading' && <h1>Подтверждение email...</h1>}
      {status === 'success' && (
        <>
          <h1 style={{ color: '#2e7d32' }}>✓ {message}</h1>
          <Link href="/">На главную</Link>
        </>
      )}
      {status === 'error' && (
        <>
          <h1 style={{ color: '#c62828' }}>✗ {message}</h1>
          <Link href="/">На главную</Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="verify-page">
      <Suspense fallback={<div className="verify-card"><h1>Загрузка...</h1></div>}>
        <VerifyEmailInner />
      </Suspense>
    </div>
  );
}
