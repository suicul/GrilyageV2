'use client';

import { useEffect, useState } from 'react';
import { useStaffAuth } from '@/lib/staff-auth-context';
import { formatPrice } from '@grilyage/shared';

type DashboardStats = {
  todayOrders: number;
  todayRevenue: number;
  popularProducts: { name: string; count: number }[];
  ordersByStatus: Record<string, number>;
};

export default function AdminDashboardPage() {
  const { staffUser } = useStaffAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('staffAccessToken') : null;

  useEffect(() => {
    if (!token) return;
    // Fetch today's orders from staff endpoint
    const today = new Date().toISOString().slice(0, 10);
    fetch(`/api/v1/staff/orders?date=${today}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((orders: any[]) => {
        if (!Array.isArray(orders)) {
          setStats({ todayOrders: 0, todayRevenue: 0, popularProducts: [], ordersByStatus: {} });
          setLoading(false);
          return;
        }
        const totalRevenue = orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
        const byStatus: Record<string, number> = {};
        const productCount: Record<string, number> = {};
        for (const o of orders) {
          byStatus[o.status] = (byStatus[o.status] || 0) + 1;
          if (o.items) {
            for (const item of o.items) {
              const name = item.nameSnapshot || item.productId;
              productCount[name] = (productCount[name] || 0) + item.qty;
            }
          }
        }
        const popular = Object.entries(productCount)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }));

        setStats({
          todayOrders: orders.length,
          todayRevenue: totalRevenue,
          popularProducts: popular,
          ordersByStatus: byStatus,
        });
        setLoading(false);
      })
      .catch(() => {
        setStats({ todayOrders: 0, todayRevenue: 0, popularProducts: [], ordersByStatus: {} });
        setLoading(false);
      });
  }, [token]);

  return (
    <div>
      <h1>Дашборд</h1>
      <p style={{ color: '#999', marginBottom: 24 }}>Добро пожаловать, {staffUser?.name}</p>

      {loading ? (
        <p style={{ color: '#888' }}>Загрузка данных...</p>
      ) : stats ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div className="admin-stat-card">
              <h3>Заказов сегодня</h3>
              <p className="admin-stat-value">{stats.todayOrders}</p>
            </div>
            <div className="admin-stat-card">
              <h3>Выручка сегодня</h3>
              <p className="admin-stat-value">{formatPrice(stats.todayRevenue)}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="admin-stat-card">
              <h3>По статусам</h3>
              {Object.entries(stats.ordersByStatus).length === 0 ? (
                <p style={{ color: '#888', fontSize: 13 }}>Нет данных</p>
              ) : (
                Object.entries(stats.ordersByStatus).map(([status, count]) => (
                  <div key={status} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #333' }}>
                    <span>{status}</span>
                    <strong>{count}</strong>
                  </div>
                ))
              )}
            </div>
            <div className="admin-stat-card">
              <h3>Популярные блюда</h3>
              {stats.popularProducts.length === 0 ? (
                <p style={{ color: '#888', fontSize: 13 }}>Нет данных</p>
              ) : (
                stats.popularProducts.map((p) => (
                  <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #333' }}>
                    <span>{p.name}</span>
                    <strong>{p.count}</strong>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
