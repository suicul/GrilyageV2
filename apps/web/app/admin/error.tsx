'use client';

import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin error boundary caught:', error);
  }, [error]);

  return (
    <div className="admin-theme">
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
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#e74c3c',
            marginBottom: 12,
          }}
        >
          Ошибка в панели управления
        </h1>
        <p style={{ color: '#888', marginBottom: 24, maxWidth: 480, lineHeight: 1.6 }}>
          {error.message || 'Произошла непредвиденная ошибка.'}
        </p>
        <button
          onClick={reset}
          style={{
            padding: '10px 28px',
            background: '#e74c3c',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Попробовать снова
        </button>
      </div>
    </div>
  );
}
