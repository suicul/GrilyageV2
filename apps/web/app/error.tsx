'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Root error boundary caught:', error);
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: 40,
        textAlign: 'center',
      }}
    >
      <h1
        style={{ fontSize: 48, fontWeight: 700, color: '#c8a87c', marginBottom: 16 }}
      >
        Что-то пошло не так
      </h1>
      <p style={{ color: '#888', marginBottom: 32, maxWidth: 480, lineHeight: 1.6 }}>
        Произошла непредвиденная ошибка. Мы уже уведомлены и работаем над исправлением.
      </p>
      <button
        onClick={reset}
        style={{
          padding: '12px 32px',
          background: '#c8a87c',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: 16,
          cursor: 'pointer',
        }}
      >
        Попробовать снова
      </button>
    </div>
  );
}
