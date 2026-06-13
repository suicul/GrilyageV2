'use client';

import { useEffect, useState } from 'react';

type StaffMember = {
  id: string; login: string; name: string; role: 'ADMIN' | 'OPERATOR'; active: boolean; createdAt: string;
};

const EMPTY_STAFF = { login: '', name: '', password: '', role: 'OPERATOR', active: true };

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('staffAccessToken') : null;
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};

  const fetchData = () => {
    setLoading(true);
    fetch('/api/v1/staff/users', { headers })
      .then((r) => r.json())
      .then((data) => setStaff(Array.isArray(data) ? data : []))
      .catch(() => setStaff([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!editing) return;
    if (!editing.name?.trim() || !editing.login?.trim()) return alert('Заполните имя и логин');
    if (!editing.id && !editing.password?.trim()) return alert('Укажите пароль');
    setSaving(true);
    try {
      const body: any = { name: editing.name, login: editing.login, role: editing.role, active: editing.active };
      if (editing.password) body.password = editing.password;
      const isNew = !editing.id;
      const url = isNew ? '/api/v1/staff/users' : `/api/v1/staff/users/${editing.id}`;
      const res = await fetch(url, { method: isNew ? 'POST' : 'PATCH', headers, body: JSON.stringify(body) });
      if (res.ok) { setEditing(null); fetchData(); }
      else { const err = await res.json().catch(() => ({ message: 'Ошибка' })); alert(err.message); }
    } catch { alert('Ошибка сети'); }
    setSaving(false);
  };

  const toggleActive = async (user: StaffMember) => {
    const res = await fetch(`/api/v1/staff/users/${user.id}`, {
      method: 'PATCH', headers, body: JSON.stringify({ active: !user.active }),
    });
    if (res.ok) fetchData(); else alert('Ошибка');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1>Сотрудники</h1>
        <button className="admin-btn" onClick={() => setEditing({ ...EMPTY_STAFF })}>+ Добавить сотрудника</button>
      </div>

      {loading ? <p style={{ color: '#888' }}>Загрузка...</p> : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Имя</th>
              <th>Логин</th>
              <th>Роль</th>
              <th>Статус</th>
              <th>Создан</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td><strong>{s.name}</strong></td>
                <td style={{ color: '#888' }}>{s.login}</td>
                <td>
                  <span className="order-status" style={{
                    background: s.role === 'ADMIN' ? '#fff3e0' : '#e3f2fd',
                    color: s.role === 'ADMIN' ? '#e65100' : '#1565c0',
                  }}>
                    {s.role === 'ADMIN' ? 'Админ' : 'Оператор'}
                  </span>
                </td>
                <td>
                  <span
                    style={{ cursor: 'pointer', color: s.active ? '#4caf50' : '#e53935' }}
                    onClick={() => toggleActive(s)}
                  >
                    {s.active ? 'Активен' : 'Отключён'}
                  </span>
                </td>
                <td style={{ fontSize: 12, color: '#888' }}>{new Date(s.createdAt).toLocaleDateString('ru-RU')}</td>
                <td>
                  <button className="admin-btn admin-btn-sm" onClick={() => setEditing({ id: s.id, login: s.login, name: s.name, role: s.role, active: s.active, password: '' })}>
                    ✎
                  </button>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888', padding: 40 }}>Нет сотрудников</td></tr>
            )}
          </tbody>
        </table>
      )}

      {editing && (
        <>
          <div className="auth-overlay" onClick={() => setEditing(null)} />
          <div className="admin-modal" style={{ width: 440 }}>
            <button className="close" onClick={() => setEditing(null)}>×</button>
            <h2>{editing.id ? 'Редактировать сотрудника' : 'Новый сотрудник'}</h2>
            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                Имя
                <input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                Логин
                <input value={editing.login || ''} onChange={(e) => setEditing({ ...editing, login: e.target.value })} disabled={!!editing.id} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                Пароль {editing.id && '(оставьте пустым, чтобы не менять)'}
                <input type="text" value={editing.password || ''} onChange={(e) => setEditing({ ...editing, password: e.target.value })} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                Роль
                <select value={editing.role || 'OPERATOR'} onChange={(e) => setEditing({ ...editing, role: e.target.value })}>
                  <option value="ADMIN">Администратор</option>
                  <option value="OPERATOR">Оператор</option>
                </select>
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--text2)' }}>
                <input type="checkbox" checked={editing.active !== false} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                Активен
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
