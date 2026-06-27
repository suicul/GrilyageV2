'use client';

import { useEffect, useState, useCallback } from 'react';
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

const PAGE_SIZE = 50;

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOrders = useCallback(async (status?: string, pageNum = 0, search?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    params.set('skip', String(pageNum * PAGE_SIZE));
    params.set('take', String(PAGE_SIZE));
    try {
      const res = await fetch(`/api/v1/staff/orders?${params}`);
      if (res.ok) {
        const json = await res.json();
        setOrders(json.data ?? []);
        setTotal(json.total ?? 0);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders('', 0); }, [fetchOrders]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const goToPage = (p: number) => {
    if (p < 0 || p >= totalPages) return;
    setPage(p);
    fetchOrders(filterStatus, p, searchQuery);
  };

  const handleSearch = () => {
    setPage(0);
    fetchOrders(filterStatus, 0, searchQuery);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setPage(0);
    fetchOrders(filterStatus, 0);
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    const res = await fetch(`/api/v1/staff/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      fetchOrders(filterStatus, page);
      setSelectedOrder(null);
    }
  };

  return (
    <div>
      <h1>Заказы</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className={`admin-btn admin-btn-sm ${!filterStatus ? 'admin-btn-active' : ''}`} onClick={() => { setFilterStatus(''); setPage(0); fetchOrders('', 0); }}>Все</button>
        {Object.keys(STATUS_LABELS).map((s) => (
          <button key={s} className={`admin-btn admin-btn-sm ${filterStatus === s ? 'admin-btn-active' : ''}`}
            onClick={() => { setFilterStatus(s); setPage(0); fetchOrders(s, 0); }}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Search + Export */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Поиск по №, имени или телефону..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          style={{ flex: 1, maxWidth: 360, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'inherit', fontSize: 14 }}
        />
        <button className="admin-btn admin-btn-sm" onClick={handleSearch}>Найти</button>
        {searchQuery && (
          <button className="admin-btn admin-btn-sm" onClick={clearSearch}>Сбросить</button>
        )}
        <span style={{ flex: 1 }} />
        <a
          className="admin-btn admin-btn-sm"
          href={`/api/v1/staff/orders/export?status=${filterStatus}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`}
          download
          style={{ textDecoration: 'none' }}
        >
          Экспорт CSV
        </a>
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

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
          <button className="admin-btn admin-btn-sm" disabled={page === 0} onClick={() => goToPage(page - 1)}>
            ← Назад
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`admin-btn admin-btn-sm ${page === i ? 'admin-btn-active' : ''}`}
              onClick={() => goToPage(i)}
            >
              {i + 1}
            </button>
          ))}
          <button className="admin-btn admin-btn-sm" disabled={page >= totalPages - 1} onClick={() => goToPage(page + 1)}>
            Вперед →
          </button>
        </div>
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
