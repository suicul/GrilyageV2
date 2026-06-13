'use client';

import { useEffect, useState } from 'react';
import { formatPrice } from '@grilyage/shared';

type OrderItem = { id: string; nameSnapshot: string; priceSnapshot: number; qty: number };
type Order = {
  id: string; number: number; status: string; customerName: string; customerPhone: string;
  deliveryMode: string; paymentMethod: string; address?: string; comment?: string;
  itemsTotal: number; deliveryCost: number; total: number; createdAt: string;
  items: OrderItem[];
};

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Новый', CONFIRMED: 'Подтверждён', COOKING: 'Готовится',
  DELIVERING: 'В пути', READY_FOR_PICKUP: 'Готов к выдаче',
  COMPLETED: 'Выполнен', CANCELLED: 'Отменён',
};

const TRANSITIONS: Record<string, string[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COOKING', 'CANCELLED'],
  COOKING: ['DELIVERING', 'READY_FOR_PICKUP', 'CANCELLED'],
  DELIVERING: ['COMPLETED', 'CANCELLED'],
  READY_FOR_PICKUP: ['COMPLETED', 'CANCELLED'],
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('staffAccessToken') : null;
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};

  const fetchOrders = async (status?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    try {
      const res = await fetch(`/api/v1/staff/orders?${params}`, { headers });
      if (res.ok) setOrders(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (orderId: string, newStatus: string) => {
    const res = await fetch(`/api/v1/staff/orders/${orderId}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      fetchOrders(filterStatus);
      setSelectedOrder(null);
    }
  };

  return (
    <div>
      <h1>Заказы</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className={`admin-btn admin-btn-sm ${!filterStatus ? 'admin-btn-active' : ''}`} onClick={() => { setFilterStatus(''); fetchOrders(''); }}>Все</button>
        {Object.keys(STATUS_LABELS).map((s) => (
          <button key={s} className={`admin-btn admin-btn-sm ${filterStatus === s ? 'admin-btn-active' : ''}`}
            onClick={() => { setFilterStatus(s); fetchOrders(s); }}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? <p style={{ color: '#888' }}>Загрузка...</p> : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>№</th>
              <th>Клиент</th>
              <th>Сумма</th>
              <th>Статус</th>
              <th>Время</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td><strong>#{order.number}</strong></td>
                <td>
                  <div>{order.customerName}</div>
                  <small style={{ color: '#888' }}>{order.customerPhone}</small>
                </td>
                <td><strong>{formatPrice(order.total)}</strong></td>
                <td><span className={`order-status ${order.status}`}>{STATUS_LABELS[order.status] || order.status}</span></td>
                <td style={{ color: '#888', fontSize: 12 }}>
                  {new Date(order.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td>
                  <button className="admin-btn admin-btn-sm" onClick={() => setSelectedOrder(order)}>Подробнее</button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888', padding: 40 }}>Нет заказов</td></tr>
            )}
          </tbody>
        </table>
      )}

      {/* Order detail modal */}
      {selectedOrder && (
        <>
          <div className="auth-overlay" onClick={() => setSelectedOrder(null)} />
          <div className="admin-modal">
            <button className="close" onClick={() => setSelectedOrder(null)}>×</button>
            <h2 style={{ marginBottom: 16 }}>Заказ №{selectedOrder.number}</h2>

            <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
              <p><strong>Клиент:</strong> {selectedOrder.customerName}</p>
              <p><strong>Телефон:</strong> <a href={`tel:${selectedOrder.customerPhone}`} style={{ color: 'var(--accent)' }}>{selectedOrder.customerPhone}</a></p>
              <p><strong>Статус:</strong> <span className={`order-status ${selectedOrder.status}`}>{STATUS_LABELS[selectedOrder.status]}</span></p>
              <p><strong>Способ получения:</strong> {selectedOrder.deliveryMode === 'DELIVERY' ? 'Доставка' : 'Самовывоз'}</p>
              <p><strong>Оплата:</strong> {selectedOrder.paymentMethod === 'CASH' ? 'Наличные' : 'Картой'}</p>
              {selectedOrder.address && <p><strong>Адрес:</strong> {selectedOrder.address}</p>}
              {selectedOrder.comment && <p><strong>Комментарий:</strong> {selectedOrder.comment}</p>}
            </div>

            <h3 style={{ margin: '16px 0 8px' }}>Состав заказа</h3>
            <table className="admin-table">
              <thead>
                <tr><th>Блюдо</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr>
              </thead>
              <tbody>
                {selectedOrder.items?.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nameSnapshot}</td>
                    <td>{item.qty}</td>
                    <td>{formatPrice(item.priceSnapshot)}</td>
                    <td>{formatPrice(item.priceSnapshot * item.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ textAlign: 'right', margin: '12px 0', fontSize: 13 }}>
              <p>Сумма: {formatPrice(selectedOrder.itemsTotal)}</p>
              <p>Доставка: {formatPrice(selectedOrder.deliveryCost)}</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>Итого: {formatPrice(selectedOrder.total)}</p>
            </div>

            {/* Status transitions */}
            <div style={{ marginTop: 16 }}>
              <h3 style={{ margin: '0 0 8px' }}>Сменить статус</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(TRANSITIONS[selectedOrder.status] ?? []).map((nextStatus) => (
                  <button key={nextStatus} className="admin-btn admin-btn-sm"
                    onClick={() => updateStatus(selectedOrder.id, nextStatus)}
                  >
                    → {STATUS_LABELS[nextStatus]}
                  </button>
                ))}
                {((TRANSITIONS[selectedOrder.status] ?? []).length === 0) && (
                  <span style={{ color: '#888', fontSize: 13 }}>Нет доступных переходов</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
