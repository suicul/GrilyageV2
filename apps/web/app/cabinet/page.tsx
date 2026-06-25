'use client';

import { useEffect, useState } from 'react';
import { useAuth, type User } from '@/lib/auth-context';
import Link from 'next/link';
import { formatPrice } from '@grilyage/shared';

type Address = {
  id: string;
  label: string | null;
  street: string;
  house: string;
  apartment: string | null;
  comment: string | null;
};

type OrderItem = {
  id: string;
  productId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  qty: number;
};

type Order = {
  id: string;
  number: number;
  status: string;
  itemsTotal: number;
  deliveryCost: number;
  total: number;
  createdAt: string;
  items: OrderItem[];
};

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Новый',
  CONFIRMED: 'Подтверждён',
  COOKING: 'Готовится',
  DELIVERING: 'В пути',
  READY_FOR_PICKUP: 'Готов к выдаче',
  COMPLETED: 'Выполнен',
  CANCELLED: 'Отменён',
};

export default function CabinetPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<'profile' | 'addresses' | 'orders'>('profile');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editing, setEditing] = useState(false);
  const [addAddress, setAddAddress] = useState(false);
  const [newStreet, setNewStreet] = useState('');
  const [newHouse, setNewHouse] = useState('');
  const [newApartment, setNewApartment] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [msg, setMsg] = useState('');

  const fetchOptions: RequestInit = {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };

  useEffect(() => {
    if (tab === 'addresses') {
      fetch('/api/v1/profile/addresses', fetchOptions)
        .then((r) => r.json())
        .then(setAddresses)
        .catch(() => {});
    }
    if (tab === 'orders') {
      fetch('/api/v1/orders/my', fetchOptions)
        .then((r) => r.json())
        .then((data) => setOrders(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="cabinet"><p>Загрузка...</p></div>;
  if (!user) {
    return (
      <div className="cabinet">
        <p>Необходимо войти в систему.</p>
        <Link href="/">На главную</Link>
      </div>
    );
  }

  const handleSaveProfile = async () => {
    const res = await fetch('/api/v1/profile', {
      method: 'PATCH',
      ...fetchOptions,
      body: JSON.stringify({ name: editName || undefined, phone: editPhone || undefined }),
    });
    if (res.ok) {
      setEditing(false);
      setMsg('Профиль обновлён');
      setTimeout(() => setMsg(''), 2000);
    } else {
      setMsg('Ошибка обновления');
    }
  };

  const handleAddAddress = async () => {
    const res = await fetch('/api/v1/profile/addresses', {
      method: 'POST',
      ...fetchOptions,
      body: JSON.stringify({ label: newLabel || undefined, street: newStreet, house: newHouse, apartment: newApartment || undefined }),
    });
    if (res.ok) {
      setAddAddress(false);
      setNewStreet('');
      setNewHouse('');
      setNewApartment('');
      setNewLabel('');
      const updated = await fetch('/api/v1/profile/addresses', fetchOptions).then((r) => r.json());
      setAddresses(updated);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    await fetch(`/api/v1/profile/addresses/${id}`, { method: 'DELETE', ...fetchOptions });
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const handleRepeatOrder = (order: Order) => {
    const cart = order.items.map((item) => ({
      category: '',
      name: item.nameSnapshot,
      price: item.priceSnapshot,
      weight: '',
      kcal: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      desc: '',
      image: '',
      qty: item.qty,
    }));
    localStorage.setItem('grilyazh-cart', JSON.stringify(cart));
    setMsg('Заказ добавлен в корзину');
    setTimeout(() => setMsg(''), 2000);
  };

  return (
    <div className="cabinet">
      <h1 style={{ marginBottom: 20 }}>Личный кабинет</h1>

      <div className="cabinet-tabs">
        <button className={`cabinet-tab${tab === 'profile' ? ' active' : ''}`} onClick={() => setTab('profile')}>
          Профиль
        </button>
        <button className={`cabinet-tab${tab === 'addresses' ? ' active' : ''}`} onClick={() => setTab('addresses')}>
          Мои адреса
        </button>
        <button className={`cabinet-tab${tab === 'orders' ? ' active' : ''}`} onClick={() => setTab('orders')}>
          История заказов
        </button>
      </div>

      <div className="cabinet-content">
        {msg && <p style={{ textAlign: 'center', color: 'var(--gold)', fontWeight: 700 }}>{msg}</p>}

        {tab === 'profile' && (
          <div>
            {!editing ? (
              <>
                <p><strong>Имя:</strong> {user.name}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Телефон:</strong> {user.phone || 'не указан'}</p>
                <p>
                  <strong>Email подтверждён:</strong>{' '}
                  {user.emailVerifiedAt ? '✓ Да' : '✗ Нет'}
                </p>
                <button
                  className="auth-submit"
                  style={{ marginTop: 16, width: 'auto', padding: '10px 24px' }}
                  onClick={() => { setEditing(true); setEditName(user.name); setEditPhone(user.phone || ''); }}
                >
                  Редактировать
                </button>
              </>
            ) : (
              <div className="auth-form">
                <label>Имя</label>
                <input className="auth-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                <label>Телефон</label>
                <input className="auth-input" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                <button className="auth-submit" onClick={handleSaveProfile}>
                  Сохранить
                </button>
                <button className="ghost" onClick={() => setEditing(false)} style={{ marginTop: 8 }}>
                  Отмена
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'addresses' && (
          <div>
            {addresses.map((addr) => (
              <div className="address-card" key={addr.id}>
                <div>
                  <strong>{addr.label || 'Адрес'}</strong>
                  <p style={{ margin: '4px 0', color: 'var(--wood)' }}>
                    {addr.street}, {addr.house}
                    {addr.apartment ? `, кв. ${addr.apartment}` : ''}
                  </p>
                </div>
                <button onClick={() => handleDeleteAddress(addr.id)}>Удалить</button>
              </div>
            ))}
            {addresses.length === 0 && <p style={{ color: 'var(--wood)' }}>Нет сохранённых адресов</p>}

            {!addAddress ? (
              <button className="auth-submit" style={{ marginTop: 16, width: 'auto', padding: '10px 24px' }} onClick={() => setAddAddress(true)}>
                + Добавить адрес
              </button>
            ) : (
              <div className="auth-form" style={{ marginTop: 16 }}>
                <input className="auth-input" placeholder="Метка (дом/работа)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
                <input className="auth-input" placeholder="Улица" value={newStreet} onChange={(e) => setNewStreet(e.target.value)} required />
                <input className="auth-input" placeholder="Дом" value={newHouse} onChange={(e) => setNewHouse(e.target.value)} required />
                <input className="auth-input" placeholder="Квартира" value={newApartment} onChange={(e) => setNewApartment(e.target.value)} />
                <button className="auth-submit" onClick={handleAddAddress}>
                  Сохранить
                </button>
                <button className="ghost" onClick={() => setAddAddress(false)}>Отмена</button>
              </div>
            )}
          </div>
        )}

        {tab === 'orders' && (
          <div>
            {orders.length === 0 && <p style={{ color: 'var(--wood)' }}>У вас пока нет заказов</p>}
            {orders.map((order) => (
              <div className="order-card" key={order.id}>
                <header>
                  <strong>Заказ №{order.number}</strong>
                  <span className={`order-status ${order.status}`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </header>
                <p style={{ margin: '4px 0', color: 'var(--wood)', fontSize: 13 }}>
                  {new Date(order.createdAt).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <p style={{ margin: '4px 0' }}>
                  {order.items.map((item) => `${item.nameSnapshot} × ${item.qty}`).join(', ')}
                </p>
                <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <strong>{formatPrice(order.total)}</strong>
                  <button
                    className="auth-submit"
                    style={{ width: 'auto', padding: '8px 16px', fontSize: 13 }}
                    onClick={() => handleRepeatOrder(order)}
                  >
                    Повторить заказ
                  </button>
                </footer>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
