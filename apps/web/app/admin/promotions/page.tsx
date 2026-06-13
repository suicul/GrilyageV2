'use client';

'use client';

import { useEffect, useState } from 'react';

type Promotion = {
  id: string; title: string; description: string; discountPercent?: number;
  startsAt: string; endsAt: string; active: boolean;
};

const EMPTY_PROMO = { title: '', description: '', discountPercent: 0, startsAt: '', endsAt: '', active: true };

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Promotion> | null>(null);
  const [saving, setSaving] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('staffAccessToken') : null;
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};

  const fetchData = () => {
    setLoading(true);
    fetch('/api/v1/staff/promotions', { headers })
      .then((r) => r.json())
      .then((data) => setPromotions(Array.isArray(data) ? data : []))
      .catch(() => setPromotions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!editing || !editing.title?.trim()) return alert('Введите название акции');
    setSaving(true);
    try {
      const body = { ...editing };
      delete (body as any).id;
      const isNew = !('id' in editing && editing.id);
      const url = isNew ? '/api/v1/staff/promotions' : `/api/v1/staff/promotions/${editing.id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers,
        body: JSON.stringify(body),
      });
      if (res.ok) { setEditing(null); fetchData(); }
      else { const err = await res.json().catch(() => ({ message: 'Ошибка' })); alert(err.message); }
    } catch { alert('Ошибка сети'); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm('Удалить акцию?')) return;
    const res = await fetch(`/api/v1/staff/promotions/${id}`, { method: 'DELETE', headers });
    if (res.ok) fetchData();
    else alert('Ошибка удаления');
  };

  const toggleActive = async (id: string, current: boolean) => {
    const res = await fetch(`/api/v1/staff/promotions/${id}`, {
      method: 'PATCH', headers, body: JSON.stringify({ active: !current }),
    });
    if (res.ok) fetchData();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1>Акции</h1>
        <button className="admin-btn" onClick={() => setEditing({ ...EMPTY_PROMO })}>+ Добавить акцию</button>
      </div>

      {loading ? <p style={{ color: '#888' }}>Загрузка...</p> : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Описание</th>
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
                <td style={{ color: '#888', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</td>
                <td>{p.discountPercent ? `${p.discountPercent}%` : '—'}</td>
                <td style={{ fontSize: 12, color: '#888' }}>
                  {new Date(p.startsAt).toLocaleDateString('ru-RU')} — {new Date(p.endsAt).toLocaleDateString('ru-RU')}
                </td>
                <td>
                  <span
                    style={{ cursor: 'pointer', color: p.active ? '#4caf50' : '#888' }}
                    onClick={() => toggleActive(p.id, p.active)}
                  >
                    {p.active ? 'Да' : 'Нет'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="admin-btn admin-btn-sm" onClick={() => setEditing(p)}>✎</button>
                    <button className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => remove(p.id)}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
            {promotions.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888', padding: 40 }}>Нет акций</td></tr>
            )}
          </tbody>
        </table>
      )}

      {editing && (
        <>
          <div className="auth-overlay" onClick={() => setEditing(null)} />
          <div className="admin-modal" style={{ width: 520 }}>
            <button className="close" onClick={() => setEditing(null)}>×</button>
            <h2>{editing.id ? 'Редактировать акцию' : 'Новая акция'}</h2>
            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                Название
                <input value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                Описание
                <textarea value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                Скидка (%)
                <input type="number" value={editing.discountPercent ?? ''} onChange={(e) => setEditing({ ...editing, discountPercent: +e.target.value })} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                  Начало
                  <input type="date" value={editing.startsAt ? editing.startsAt.slice(0, 10) : ''} onChange={(e) => setEditing({ ...editing, startsAt: e.target.value })} />
                </label>
                <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                  Конец
                  <input type="date" value={editing.endsAt ? editing.endsAt.slice(0, 10) : ''} onChange={(e) => setEditing({ ...editing, endsAt: e.target.value })} />
                </label>
              </div>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--text2)' }}>
                <input type="checkbox" checked={editing.active !== false} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                Активна
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="admin-btn" onClick={save} disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button className="admin-btn" style={{ background: 'var(--bg3)', color: 'var(--text2)' }} onClick={() => setEditing(null)}>Отмена</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
