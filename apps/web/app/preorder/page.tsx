'use client';

import { useEffect, useState } from 'react';
import AuthModal from '@/components/auth-modal';
import Header from '@/components/header';
import { useAuth } from '@/lib/auth-context';

export default function PreorderPage() {
  const { setAuthModalOpen } = useAuth();
  const [sticky, setSticky] = useState(true);

  useEffect(() => {
    const onScroll = () => setSticky(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="page">
      <Header sticky={sticky} onAuthOpen={() => setAuthModalOpen((v) => !v)} />

      <section className="preorder-hero" style={{ marginTop: 18 }}>
        <div className="hero-content">
          <div className="hero-copy">
            <h1>Предзаказ</h1>
            <p>Форма предзаказа для больших заказов и праздников подключается следующим этапом.</p>
          </div>
        </div>
      </section>

      <section style={{ margin: '32px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="preorder-ghost">
          <span>Форма предзаказа будет здесь</span>
        </div>
        <div>
          <div className="about-card" style={{ marginBottom: 16 }}>
            <h3>Быстрые ссылки</h3>
            <ul style={{ paddingLeft: 18, lineHeight: 2 }}>
              <li><a href="/menu" style={{ color: 'var(--gold)', fontWeight: 700 }}>Меню и каталог</a></li>
              <li><a href="/about" style={{ color: 'var(--gold)', fontWeight: 700 }}>О производстве</a></li>
              <li><a href="/cabinet" style={{ color: 'var(--gold)', fontWeight: 700 }}>Личный кабинет</a></li>
            </ul>
          </div>
        </div>
      </section>

      <footer id="contacts" className="footer">
        <div className="footer-grid">
          <div className="footer-left">
            <div className="footer-eyebrow">Контакты</div>
            <div className="footer-brand">
              <img src="/logo.png" alt="Грильяж" style={{ width: 40, height: 40 }} />
              <div><span>Грильяж</span></div>
            </div>
            <div className="contact-list">
              <div>
                <div className="contact-label">Режим работы</div>
                <div className="contact-box work">
                  <div className="work-row"><span>Пн–Пт:</span><span>08:00–21:00</span></div>
                  <div className="work-row"><span>Сб–Вс:</span><span>09:00–21:00</span></div>
                </div>
              </div>
              <div>
                <div className="contact-label">Телефон</div>
                <div className="contact-box"><a href="tel:+73812900000">+7 (3812) 90-00-00</a></div>
              </div>
              <div>
                <div className="contact-label">Почта</div>
                <div className="contact-box"><a href="mailto:info@grilyazh-omsk.ru">info@grilyazh-omsk.ru</a></div>
              </div>
              <div>
                <div className="contact-label">Адрес</div>
                <div className="contact-box">Омск, Харьковская, 7</div>
              </div>
            </div>
            <div className="socials">
              <a className="social vk" href="https://vk.com/" target="_blank" rel="noopener noreferrer" aria-label="VK">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.05 7.56c.13 6.29 3.27 10.07 8.78 10.07h.31v-3.6c2.03.2 3.56 1.67 4.18 3.6h2.86c-.8-2.91-2.92-4.51-4.24-5.12 1.32-.76 3.18-2.61 3.62-4.95h-2.6c-.57 1.9-2.29 3.75-3.82 3.91V7.56h-2.6v6.86c-1.55-.39-3.5-2.38-3.59-6.86H3.05z" /></svg>
              </a>
              <a className="social tg" href="https://t.me/" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.9 4.6c.3-1.4-.5-1.9-1.6-1.5L2.8 9.8c-1.2.5-1.2 1.1-.2 1.4l4.5 1.4 10.4-6.6c.5-.3 1-.1.6.2l-8.4 7.6-.3 4.4c.4 0 .6-.2.8-.4l2.2-2.1 4.5 3.3c.8.4 1.4.2 1.6-.8L21.9 4.6z" /></svg>
              </a>
              <a className="social max" href="#" aria-label="Max"><span className="max-glyph" aria-hidden="true" /></a>
            </div>
          </div>
          <div className="footer-right">
            <div className="footer-map">
              <iframe src="https://yandex.ru/map-widget/v1/?ll=73.3638%2C54.9914&mode=search&oid=19567134820&ol=biz&z=16" title="Грильяж на карте" style={{ border: 0 }} allowFullScreen loading="lazy" />
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} Грильяж</span>
          <div>
            <a href="/privacy">Политика конфиденциальности</a>
            {' · '}
            <a href="/terms">Условия использования</a>
          </div>
        </div>
      </footer>

      <AuthModal />
    </div>
  );
}
