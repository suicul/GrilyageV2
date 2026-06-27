'use client';

import { useEffect, useState, FormEvent } from 'react';
import AuthModal from '@/components/auth-modal';
import Header from '@/components/header';
import { useAuth } from '@/lib/auth-context';

export default function PreorderPage() {
  const { setAuthModalOpen } = useAuth();
  const [sticky, setSticky] = useState(true);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState('');
  const [guestCount, setGuestCount] = useState(1);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onScroll = () => setSticky(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/v1/preorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name,
          customerPhone: phone,
          customerEmail: email || undefined,
          desiredDate: date,
          guestCount,
          comment: comment || undefined,
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || 'Ошибка при отправке');
      }

      setSuccess(true);
      setName('');
      setPhone('');
      setEmail('');
      setDate('');
      setGuestCount(1);
      setComment('');
    } catch (err: any) {
      setError(err.message ?? 'Что-то пошло не так');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <Header sticky={sticky} onAuthOpen={() => setAuthModalOpen((v) => !v)} />

      <section className="preorder-hero" style={{ marginTop: 18 }}>
        <div className="hero-content">
          <div className="hero-copy">
            <h1>Предзаказ</h1>
            <p>Закажите заранее — для больших компаний, праздников и мероприятий. Мы свяжемся с вами для уточнения деталей.</p>
          </div>
        </div>
      </section>

      <section style={{ margin: '32px auto', maxWidth: 800, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {success ? (
          <div className="preorder-ghost" style={{ gridColumn: '1 / -1', padding: '48px 24px', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--gold)', marginBottom: 12 }}>✓ Заявка отправлена</h2>
            <p>Мы свяжемся с вами в ближайшее время для подтверждения предзаказа.</p>
            <button className="admin-btn admin-btn-sm" style={{ marginTop: 16 }} onClick={() => setSuccess(false)}>
              Отправить ещё
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#888' }}>Имя *</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'inherit', fontSize: 15 }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#888' }}>Телефон *</label>
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'inherit', fontSize: 15 }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#888' }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'inherit', fontSize: 15 }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#888' }}>Желаемая дата и время *</label>
              <input type="datetime-local" required value={date} onChange={(e) => setDate(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'inherit', fontSize: 15 }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#888' }}>Количество гостей</label>
              <input type="number" min={1} value={guestCount} onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value)))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'inherit', fontSize: 15 }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#888' }}>Комментарий</label>
              <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'inherit', fontSize: 15, resize: 'vertical' }} />
            </div>
            {error && <p style={{ color: '#e74c3c', fontSize: 13 }}>{error}</p>}
            <button type="submit" disabled={submitting} className="admin-btn"
              style={{ padding: '12px 24px', fontSize: 16, background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: 8 }}>
              {submitting ? 'Отправка...' : 'Отправить заявку'}
            </button>
          </form>
        )}

        <div>
          <div className="about-card" style={{ marginBottom: 16 }}>
            <h3>Быстрые ссылки</h3>
            <ul style={{ paddingLeft: 18, lineHeight: 2 }}>
              <li><a href="/menu" style={{ color: 'var(--gold)', fontWeight: 700 }}>Меню и каталог</a></li>
              <li><a href="/about" style={{ color: 'var(--gold)', fontWeight: 700 }}>О производстве</a></li>
              <li><a href="/cabinet" style={{ color: 'var(--gold)', fontWeight: 700 }}>Личный кабинет</a></li>
            </ul>
          </div>
          <div className="about-card">
            <h3>Почему предзаказ?</h3>
            <ul style={{ paddingLeft: 18, lineHeight: 2, color: '#888', fontSize: 14 }}>
              <li>Уверенность, что всё будет готово к вашему времени</li>
              <li>Индивидуальные условия для больших заказов</li>
              <li>Приоритетная обработка заявки</li>
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
