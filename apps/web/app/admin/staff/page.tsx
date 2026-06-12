'use client';

import { useEffect, useState } from 'react';

type StaffMember = {
  id: string; login: string; name: string; role: 'ADMIN' | 'OPERATOR'; active: boolean; createdAt: string;
};

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('staffAccessToken') : null;
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    fetch('/api/v1/staff/users', { headers })
      .then((r) => r.json())
      .then((data) => setStaff(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <h1>Сотрудники</h1>
      {loading ? <p style={{ color: '#888' }}>Загрузка...</p> : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Имя</th>
              <th>Логин</th>
              <th>Роль</th>
              <th>Активен</th>
              <th>Создан</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td><strong>{s.name}</strong></td>
                <td style={{ color: '#888' }}>{s.login}</td>
                <td><span className={`order-status`} style={{ background: s.role === 'ADMIN' ? '#fff3e0' : '#e3f2fd', color: s.role === 'ADMIN' ? '#e65100' : '#1565c0' }}>{s.role === 'ADMIN' ? 'Админ' : 'Оператор'}</span></td>
                <td><span style={{ color: s.active ? '#4caf50' : '#888' }}>{s.active ? 'Да' : 'Нет'}</span></td>
                <td style={{ fontSize: 12, color: '#888' }}>{new Date(s.createdAt).toLocaleDateString('ru-RU')}</td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: 40 }}>Нет сотрудников</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
