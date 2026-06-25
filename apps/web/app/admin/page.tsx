'use client';

import { useEffect, useState } from 'react';
import { useStaffAuth } from '@/lib/staff-auth-context';
import { formatPrice } from '@grilyage/shared';

/* ---------- types ---------- */

type DashboardStats = {
  today: {
    orders: number;
    revenue: number;
    averageOrderValue: number;
    ordersByStatus: Record<string, number>;
  };
  yesterday: {
    orders: number;
    revenue: number;
  };
  popularProducts: { name: string; count: number }[];
  weeklyTrend: { date: string; orders: number; revenue: number }[];
  recentOrders: {
    id: string;
    number: number;
    status: string;
    customerName: string;
    total: number;
    createdAt: string;
  }[];
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

/* ---------- helpers ---------- */

function deltaPercent(current: number, previous: number): { text: string; up: boolean } | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return { text: '+∞', up: true };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { text: '0%', up: true };
  return { text: `${pct > 0 ? '+' : ''}${pct}%`, up: pct > 0 };
}

function formatDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][d.getDay()] ?? '';
}

/* ---------- component ---------- */

export default function AdminDashboardPage() {
  const { staffUser } = useStaffAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/v1/staff/dashboard')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: DashboardStats) => { setStats(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) {
    return (
      <div>
        <h1>Дашборд</h1>
        <p style={{ color: '#888', marginTop: 24 }}>Не удалось загрузить статистику. Проверьте соединение с API.</p>
      </div>
    );
  }
  if (!stats) return null;

  const revDelta = deltaPercent(stats.today.revenue, stats.yesterday.revenue);
  const ordDelta = deltaPercent(stats.today.orders, stats.yesterday.orders);
  const yesterdayAov = stats.yesterday.orders > 0
    ? Math.round(stats.yesterday.revenue / stats.yesterday.orders)
    : 0;
  const maxRevenue = Math.max(...stats.weeklyTrend.map((d) => d.revenue), 1);
  const maxOrders = Math.max(...stats.weeklyTrend.map((d) => d.orders), 1);

  return (
    <div>
      <h1>Дашборд</h1>
      <p style={{ color: '#999', marginBottom: 24 }}>Добро пожаловать, {staffUser?.name}</p>

      {/* ─── stat cards ─── */}
      <div className="dashboard-cards">
        <div className="admin-stat-card">
          <h3>Заказов сегодня</h3>
          <p className="admin-stat-value">{stats.today.orders}</p>
          {ordDelta && <span className={`delta ${ordDelta.up ? 'up' : 'down'}`}>{ordDelta.text} ко вчера</span>}
        </div>
        <div className="admin-stat-card">
          <h3>Выручка сегодня</h3>
          <p className="admin-stat-value">{formatPrice(stats.today.revenue)}</p>
          {revDelta && <span className={`delta ${revDelta.up ? 'up' : 'down'}`}>{revDelta.text} ко вчера</span>}
        </div>
        <div className="admin-stat-card">
          <h3>Средний чек</h3>
          <p className="admin-stat-value">{formatPrice(stats.today.averageOrderValue)}</p>
          {yesterdayAov > 0 && <span className="delta" style={{ color: '#888' }}>Вчера: {formatPrice(yesterdayAov)}</span>}
        </div>
      </div>

      {/* ─── chart + statuses ─── */}
      <div className="dashboard-grid-2" style={{ marginBottom: 24 }}>
        {/* weekly revenue chart */}
        <div className="admin-stat-card">
          <h3>Выручка за неделю</h3>
          <div className="chart">
            {stats.weeklyTrend.map((day) => (
              <div key={day.date} className="chart-col">
                <div className="chart-bar-wrap">
                  <div className="chart-bar chart-bar-revenue" style={{ height: `${(day.revenue / maxRevenue) * 100}%` }} title={formatPrice(day.revenue)} />
                  <div className="chart-bar chart-bar-orders" style={{ height: `${(day.orders / maxOrders) * 100}%` }} title={`${day.orders} заказов`} />
                </div>
                <span className="chart-label">{formatDay(day.date)}</span>
              </div>
            ))}
          </div>
          <div className="chart-legend">
            <span><i className="legend-dot revenue" /> Выручка</span>
            <span><i className="legend-dot orders" /> Заказы</span>
          </div>
        </div>

        {/* orders by status */}
        <div className="admin-stat-card">
          <h3>Заказы по статусам</h3>
          {Object.keys(stats.today.ordersByStatus).length === 0 ? (
            <p style={{ color: '#888', fontSize: 13 }}>Нет заказов сегодня</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {Object.entries(stats.today.ordersByStatus)
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => (
                  <div key={status} className="status-row">
                    <span className={`order-status ${status}`}>{STATUS_LABELS[status] || status}</span>
                    <div className="status-bar-track">
                      <div className="status-bar-fill" style={{ width: `${(count / stats.today.orders) * 100}%` }} />
                    </div>
                    <strong>{count}</strong>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── popular + recent ─── */}
      <div className="dashboard-grid-2">
        {/* popular products */}
        <div className="admin-stat-card">
          <h3>Популярные блюда сегодня</h3>
          {stats.popularProducts.length === 0 ? (
            <p style={{ color: '#888', fontSize: 13 }}>Нет данных</p>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              {stats.popularProducts.map((p, i) => (
                <div key={p.name} className="popular-row">
                  <span className="popular-rank">{i + 1}</span>
                  <span className="popular-name">{p.name}</span>
                  <span className="popular-count">{p.count} шт.</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* recent orders */}
        <div className="admin-stat-card">
          <h3>Последние заказы</h3>
          {stats.recentOrders.length === 0 ? (
            <p style={{ color: '#888', fontSize: 13 }}>Нет заказов сегодня</p>
          ) : (
            <div style={{ display: 'grid', gap: 4 }}>
              {stats.recentOrders.map((o) => (
                <div key={o.id} className="recent-row">
                  <span style={{ fontWeight: 700, minWidth: 50 }}>#{o.number}</span>
                  <span className={`order-status ${o.status}`}>{STATUS_LABELS[o.status] || o.status}</span>
                  <span style={{ flex: 1, color: '#aaa', fontSize: 12 }}>{o.customerName}</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatPrice(o.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- skeleton ---------- */

function DashboardSkeleton() {
  return (
    <div>
      <h1>Дашборд</h1>
      <div className="dashboard-cards" style={{ marginTop: 24 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="admin-stat-card">
            <div className="skeleton" style={{ height: 14, width: 100, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 32, width: 80 }} />
          </div>
        ))}
      </div>
      <div className="dashboard-grid-2" style={{ marginTop: 16 }}>
        <div className="admin-stat-card">
          <div className="skeleton" style={{ height: 14, width: 140, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 160, width: '100%' }} />
        </div>
        <div className="admin-stat-card">
          <div className="skeleton" style={{ height: 14, width: 140, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 160, width: '100%' }} />
        </div>
      </div>
    </div>
  );
}
