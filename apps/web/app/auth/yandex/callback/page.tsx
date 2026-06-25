'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function YandexCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Обработка...');

  useEffect(() => {
    const params = Object.fromEntries(new URLSearchParams(window.location.search));
    const code = params.code;
    const error = params.error;
    const state = params.state;

    if (error) {
      setStatus('Ошибка: ' + error);
      return;
    }

    if (!code) {
      setStatus('Код не получен');
      return;
    }

    const savedState = localStorage.getItem('yandex_oauth_state');
    if (state && savedState && state !== savedState) {
      setStatus('Ошибка безопасности: неверный state');
      return;
    }
    localStorage.removeItem('yandex_oauth_state');

    setStatus('Вход через Яндекс...');
    const redirectUri = window.location.origin + '/auth/yandex/callback';
    fetch('/api/v1/auth/social/yandex/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.accessToken) {
          // Access token set via httpOnly cookie by the server
          localStorage.setItem('refreshToken', data.refreshToken);
          window.opener?.location.reload();
          window.close();
        } else {
          setStatus('Ошибка: ' + (data.message || 'Неизвестная ошибка'));
        }
      })
      .catch(() => setStatus('Ошибка соединения'));
  }, [router]);

  return <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>{status}</div>;
}
