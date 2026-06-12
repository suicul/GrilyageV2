'use client';

import { useStaffAuth, StaffAuthProvider } from '@/lib/staff-auth-context';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { staffUser, loading, logout } = useStaffAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => { setMounted(true); }, []);

  // Auth guard — redirect to login if not authenticated and not already on login page
  useEffect(() => {
    if (!mounted || loading) return;
    if (!staffUser && !isLoginPage) {
      router.replace('/admin/login');
    }
  }, [mounted, loading, staffUser, isLoginPage, router]);

  if (!mounted) return null;

  // Login page has its own minimal layout
  if (isLoginPage) {
    return (
      <div className="admin-theme">
        <div id="__next">{children}</div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="admin-theme">
        <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Загрузка...</div>
      </div>
    );
  }

  // Not logged in — let the redirect handle it
  if (!staffUser) return null;

  return (
    <div className="admin-theme">
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-header">
            <strong>Грильяж CRM</strong>
            <small style={{ color: '#888', fontSize: 11 }}>
              {staffUser.name} ({staffUser.role === 'ADMIN' ? 'Админ' : 'Оператор'})
            </small>
          </div>
          <nav className="admin-nav">
            <Link href="/admin" className={pathname === '/admin' ? 'active' : ''}>
              📊 Дашборд
            </Link>
            <Link href="/admin/orders" className={pathname.startsWith('/admin/orders') ? 'active' : ''}>
              📋 Заказы
            </Link>
            {staffUser.role === 'ADMIN' && (
              <>
                <Link href="/admin/catalog" className={pathname.startsWith('/admin/catalog') ? 'active' : ''}>
                  🍽️ Каталог
                </Link>
                <Link href="/admin/promotions" className={pathname.startsWith('/admin/promotions') ? 'active' : ''}>
                  🏷️ Акции
                </Link>
                <Link href="/admin/staff" className={pathname.startsWith('/admin/staff') ? 'active' : ''}>
                  👥 Сотрудники
                </Link>
              </>
            )}
          </nav>
          <div className="admin-sidebar-footer">
            <button onClick={async () => { await logout(); router.replace('/admin/login'); }}>
              Выйти
            </button>
          </div>
        </aside>
        <main className="admin-main">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffAuthProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </StaffAuthProvider>
  );
}
