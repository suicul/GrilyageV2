'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useState, type MouseEvent } from 'react';
import { useCart } from '@/lib/cart-context';
import SearchPanel from '@/components/search-panel';

type HeaderProps = {
  onAuthOpen?: () => void;
  sticky?: boolean;
  brandPressed?: boolean;
  onBrandClick?: () => void;
  simple?: boolean;
  stickyMode?: boolean;
};

export default function Header({
  onAuthOpen,
  sticky,
  brandPressed,
  onBrandClick,
  simple,
  children,
  stickyMode,
}: HeaderProps & { children?: React.ReactNode }) {
  const { cartQty, toggleCart } = useCart();
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const isActive = (path: string) => pathname === path ? 'active' : '';

  const handleBrandClick = useCallback(() => {
    if (pathname !== '/') {
      router.push('/');
    } else if (onBrandClick) {
      onBrandClick();
    }
  }, [pathname, router, onBrandClick]);

  const handleContactsClick = useCallback((e: MouseEvent) => {
    if (pathname === '/') {
      e.preventDefault();
      const el = document.getElementById('contacts');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
    // else: navigate to /#contacts — Next.js handles scroll on page load
  }, [pathname]);

  return (
    <header className={`header${sticky ? ' is-sticky' : ''}${stickyMode ? ' sticky-mode' : ''}`}>
      <div className="header-inner">
        {simple ? (
          <Link className="brand" href="/">
            <div className="brand-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="#d6b06a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="36" height="36">
                <polygon points="12,2 2,22 22,22" stroke="#d6b06a" />
                <line x1="12" y1="10" x2="12" y2="16" stroke="#d6b06a" />
                <circle cx="12" cy="13" r="0.6" fill="#d6b06a" stroke="none" />
              </svg>
            </div>
            <div>
              <div className="brand-title">Грильяж</div>
              <div className="brand-sub">Вкус Омска</div>
            </div>
          </Link>
        ) : (
          <div
            className={`brand${brandPressed ? ' is-pressed' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="Логотип Грильяж, нажмите для анимации"
            onClick={handleBrandClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleBrandClick();
              }
            }}
          >
            <div className="brand-badge">
              <Image src="/logo.png" alt="Грильяж" width={82} height={82} priority />
            </div>
            <div>
              <div className="brand-title">Грильяж</div>
              <div className="brand-sub">Вкус Омска</div>
            </div>
          </div>
        )}

        <nav className="nav" aria-label="Основная навигация">
          <Link href={simple ? '/#menu' : '/menu'} className={isActive('/menu')}>Меню</Link>
          <Link href={simple ? '/about' : '/about'} className={isActive('/about')}>О нас</Link>
          <Link href="/#contacts" className={isActive('/contacts')} onClick={handleContactsClick}>Контакты</Link>
          <Link href="/preorder" className={isActive('/preorder')}>Предзаказ</Link>
        </nav>

        <div className="header-right">
          <a className="phone" href="tel:+73812900000">+7 (3812) 90-00-00</a>

          {!simple && (
            <button
              id="searchToggleBtn"
              className="circle-btn"
              type="button"
              aria-label="Поиск"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((v) => !v)}
            >
              <svg viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="6" />
                <path d="M20 20l-4.2-4.2" />
              </svg>
            </button>
          )}
          {!simple && (
            <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} />
          )}

          {simple ? (
            <button className="login-pill" onClick={onAuthOpen}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                <path d="M20 21c0-3.3-3.6-6-8-6s-8 2.7-8 6" />
                <circle cx="12" cy="8" r="4" />
              </svg>
              Войти
            </button>
          ) : (
            <button
              id="accountOpenBtn"
              className="circle-btn"
              type="button"
              aria-label="Профиль"
              onClick={onAuthOpen}
            >
              <svg viewBox="0 0 24 24">
                <path d="M20 21c0-3.3-3.6-6-8-6s-8 2.7-8 6" />
                <circle cx="12" cy="8" r="4" />
              </svg>
            </button>
          )}

          <button
            id="cartOpenBtn"
            className="circle-btn"
            type="button"
            aria-label="Корзина"
            style={{ position: 'relative' }}
            onClick={toggleCart}
          >
            <svg viewBox="0 0 24 24">
              <path d="M4 6h2l2 10h9l2-7H8" />
              <circle cx="10" cy="19" r="1.2" fill="var(--gold)" stroke="none" />
              <circle cx="17" cy="19" r="1.2" fill="var(--gold)" stroke="none" />
            </svg>
            <span className="cart-badge">{cartQty}</span>
          </button>
        </div>
      </div>
      <div className="header-line" />
      {children}
    </header>
  );
}
