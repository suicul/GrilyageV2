'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VkCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Обработка...');

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = Object.fromEntries(new URLSearchParams(hash));
    const token = params.access_token;

    if (token) {
      setStatus('Вход через VK...');
      fetch('/api/v1/auth/social/vk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: token }),
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
    } else {
      setStatus('Токен не получен');
    }
  }, [router]);

  return <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>{status}</div>;
}
