'use client';

import { useEffect, useState } from 'react';

type Promotion = {
  id: string; title: string; description: string; discountPercent?: number;
  startsAt: string; endsAt: string; active: boolean;
};

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('staffAccessToken') : null;
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    fetch('/api/v1/promotions', { headers })
      .then((r) => r.json())
      .then((data) => setPromotions(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleActive = async (id: string, current: boolean) => {
    const res = await fetch(`/api/v1/staff/promotions/${id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !current }),
    });
    if (res.ok) {
      setPromotions((prev) => prev.map((p) => p.id === id ? { ...p, active: !current } : p));
    }
  };

  return (
    <div>
      <h1>Акции</h1>
      {loading ? <p style={{ color: '#888' }}>Загрузка...</p> : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Скидка</th>
              <th>Период</th>
              <th>Активна</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((p) => (
              <tr key={p.id}>
                <td><strong>{p.title}</strong></td>
                <td>{p.discountPercent ? `${p.discountPercent}%` : '—'}</td>
                <td style={{ fontSize: 12, color: '#888' }}>
                  {new Date(p.startsAt).toLocaleDateString('ru-RU')} — {new Date(p.endsAt).toLocaleDateString('ru-RU')}
                </td>
                <td><span style={{ color: p.active ? '#4caf50' : '#888' }}>{p.active ? 'Да' : 'Нет'}</span></td>
                <td>
                  <button className="admin-btn admin-btn-sm" onClick={() => toggleActive(p.id, p.active)}>
                    {p.active ? 'Деактивировать' : 'Активировать'}
                  </button>
                </td>
              </tr>
            ))}
            {promotions.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: 40 }}>Нет акций</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
