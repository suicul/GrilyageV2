'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Главная', icon: '⌂' },
  { href: '/menu', label: 'Меню', icon: '☰' },
  { href: '/about', label: 'О нас', icon: 'ⓘ' },
  { href: '/preorder', label: 'Предзаказ', icon: '✉' },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map((item) => (
        <Link key={item.href} href={item.href}
          className={`bottom-nav-item${pathname === item.href ? ' active' : ''}`}>
          <span className="bottom-nav-icon">{item.icon}</span>
          <span className="bottom-nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
