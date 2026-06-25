'use client';

import { useEffect, useState } from 'react';

const COOKIE_CONSENT_KEY = 'grilyazh-cookie-consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored !== 'accepted') setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: 'var(--wood)', color: '#fff', padding: '12px 20px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      gap: 16, flexWrap: 'wrap', fontSize: 13,
    }}>
      <span>Мы используем cookie для работы сайта. Продолжая использовать сайт, вы соглашаетесь с обработкой данных.</span>
      <button onClick={accept} style={{
        background: 'var(--gold)', color: '#fff', border: 'none',
        padding: '8px 20px', borderRadius: 6, cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap',
      }}>
        Хорошо
      </button>
    </div>
  );
}
