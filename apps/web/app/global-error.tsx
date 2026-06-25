'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('Global error boundary caught:', error);

  return (
    <html lang="ru">
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: 40,
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
            background: '#1a140f',
            color: '#fff',
          }}
        >
          <h1
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: '#c8a87c',
              marginBottom: 16,
            }}
          >
            Критическая ошибка
          </h1>
          <p
            style={{
              color: '#888',
              marginBottom: 32,
              maxWidth: 480,
              lineHeight: 1.6,
            }}
          >
            Произошла критическая ошибка. Пожалуйста, обновите страницу или
            попробуйте позже.
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
            Обновить страницу
          </button>
        </div>
      </body>
    </html>
  );
}
