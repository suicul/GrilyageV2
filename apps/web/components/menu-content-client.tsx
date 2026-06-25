'use client';

import { useState, useEffect } from 'react';
import { formatPrice } from '@grilyage/shared';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import AuthModal from '@/components/auth-modal';
import Header from '@/components/header';

type CatalogItem = {
  category: string;
  name: string;
  price: number;
  weight: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  desc: string;
  image: string;
};

type CatalogData = Record<string, {
  note: string;
  subcategories: Record<string, CatalogItem[]>;
}>;

type ApiCategory = {
  id: string;
  name: string;
  slug: string;
  subcategories: {
    id: string;
    name: string;
    slug: string;
    products: {
      id: string;
      name: string;
      slug: string;
      priceRubles: number;
      priceKopecks: number;
      weightGrams: number;
      kcal: number;
      protein: number;
      fat: number;
      carbs: number;
      imageUrl: string | null;
      isNew: boolean;
      description: string;
      price: number;
    }[];
  }[];
};

function transformApiData(data: ApiCategory[]): CatalogData {
  const transformed: CatalogData = {};
  data.forEach((cat) => {
    const subcategories: Record<string, CatalogItem[]> = {};
    cat.subcategories.forEach((sub) => {
      subcategories[sub.name] = sub.products.map((p) => ({
        category: cat.name,
        name: p.name,
        price: p.price,
        weight: `${p.weightGrams} г`,
        kcal: p.kcal,
        protein: p.protein,
        fat: p.fat,
        carbs: p.carbs,
        desc: p.description,
        image: p.imageUrl || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80',
      }));
    });
    transformed[cat.name] = {
      note: '',
      subcategories,
    };
  });
  return transformed;
}

export default function MenuContentClient({
  catalogApiData,
}: {
  catalogApiData: ApiCategory[] | null;
}) {
  const initialCatalog = catalogApiData ? transformApiData(catalogApiData) : {} as CatalogData;
  const initialKeys = Object.keys(initialCatalog);

  const [activeCategory, setActiveCategory] = useState(initialKeys[0] || '');
  const [activeSubcategory, setActiveSubcategory] = useState('');
  const [toastText, setToastText] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [sticky, setSticky] = useState(true);
  const [catalog] = useState<CatalogData>(initialCatalog);
  const [loading] = useState(!catalogApiData);
  const [error] = useState<string | null>(null);
  const { setAuthModalOpen } = useAuth();
  const { addToCart } = useCart();

  // Set initial subcategory from first category
  useEffect(() => {
    if (activeCategory && !activeSubcategory) {
      const subs = catalog[activeCategory] ? Object.keys(catalog[activeCategory].subcategories) : [];
      if (subs.length > 0 && subs[0]) {
        setActiveSubcategory(subs[0]);
      }
    }
  }, [activeCategory, activeSubcategory, catalog]);

  const subcategories = catalog[activeCategory] ? Object.keys(catalog[activeCategory]!.subcategories) : [];
  const items = catalog[activeCategory]?.subcategories[activeSubcategory] || [];

  useEffect(() => {
    if (!subcategories.includes(activeSubcategory) && subcategories.length > 0) {
      setActiveSubcategory(subcategories[0]!);
    }
  }, [activeCategory, activeSubcategory, subcategories]);

  useEffect(() => {
    const onScroll = () => setSticky(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function addToCartHandler(item: CatalogItem) {
    addToCart(item);
    showToast('Добавлено: ' + item.name);
  }

  let toastTimer: ReturnType<typeof setTimeout>;
  function showToast(text: string) {
    setToastText(text);
    setToastVisible(true);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => setToastVisible(false), 1500);
  }

  function handleCategoryClick(cat: string) {
    setActiveCategory(cat);
    const subs = catalog[cat] ? Object.keys(catalog[cat].subcategories) : [];
    if (subs.length > 0 && subs[0]) {
      setActiveSubcategory(subs[0]);
    }
  }

  function SkeletonCard() {
    return (
      <div className="card" style={{ opacity: 0.5 }}>
        <div style={{ height: 200, background: '#f0f0f0', borderRadius: '8px 8px 0 0' }} />
        <div style={{ padding: 16 }}>
          <div style={{ height: 20, background: '#f0f0f0', marginBottom: 8, borderRadius: 4 }} />
          <div style={{ height: 16, background: '#f0f0f0', width: '60%', marginBottom: 12, borderRadius: 4 }} />
          <div style={{ height: 14, background: '#f0f0f0', marginBottom: 12, borderRadius: 4 }} />
          <div style={{ height: 36, background: '#f0f0f0', borderRadius: 4 }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <Header sticky={sticky} onAuthOpen={() => setAuthModalOpen((v) => !v)} />
        <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 40 }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h2 style={{ margin: 0, fontSize: 24, color: '#d32f2f' }}>Ошибка загрузки меню</h2>
          <p style={{ margin: 0, color: '#666', textAlign: 'center', maxWidth: 400 }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              background: '#8B4513',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Header sticky={sticky} onAuthOpen={() => setAuthModalOpen((v) => !v)} />

      <section className="hero" style={{ position: 'relative', minHeight: 300, borderRadius: 30, overflow: 'hidden', background: 'linear-gradient(120deg, rgba(20,14,10,.95), rgba(44,31,22,.72)), url(https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1800&q=80) center/cover no-repeat', color: '#fff', marginTop: 84 }}>
        <div style={{ padding: '56px 32px 30px', maxWidth: 760 }}>
          <h1 style={{ margin: '10px 0 0', fontSize: 58, lineHeight: 1 }}>Расширенное меню</h1>
          <p style={{ margin: '16px 0 0', fontSize: 18, lineHeight: 1.65, color: 'rgba(255,255,255,.82)' }}>На этой странице каталог глубже, чем на главной: больше подкатегорий, больше блюд и отдельные сеты по дням для бизнес-ланча. Добавление в корзину работает так же, как и на главной странице.</p>
        </div>
      </section>

      <main className="catalog">
        {loading ? (
          <div className="grid-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <>
            <div className="category-row">
              {Object.keys(catalog).map((cat) => (
                <button
                  key={cat}
                  className={'cat-btn' + (cat === activeCategory ? ' active' : '')}
                  type="button"
                  onClick={() => handleCategoryClick(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="subcategory-row">
              {subcategories.map((sub) => (
                <button
                  key={sub}
                  className={'subcat-btn' + (sub === activeSubcategory ? ' active' : '')}
                  type="button"
                  onClick={() => setActiveSubcategory(sub)}
                >
                  {sub}
                </button>
              ))}
            </div>
            <div className="section-head">
              <div>
                <h2 className="section-title">{activeCategory}</h2>
                <div className="section-note">{activeSubcategory}{catalog[activeCategory]?.note ? ` — ${catalog[activeCategory].note}` : ''}</div>
              </div>
            </div>
            {items.length > 0 ? (
              <div className="grid-3">
                {items.map((item) => (
                  <article className="card" key={item.name}>
                    <img src={item.image} alt={item.name} />
                    <div style={{ padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'start' }}>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>{item.name}</div>
                        <div className="price" style={{ fontSize: 18, fontWeight: 800, whiteSpace: 'nowrap' }}>{formatPrice(item.price)}</div>
                      </div>
                      <div className="meta" style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <span className="pill" style={{ padding: '5px 9px', borderRadius: 999, background: '#faf5ea', border: '1px solid #efe1ca', fontSize: 12, color: 'var(--wood)' }}>{item.weight}</span>
                        <span className="pill">К {item.kcal}</span>
                        <span className="pill">Б {item.protein}</span>
                        <span className="pill">Ж {item.fat}</span>
                        <span className="pill">У {item.carbs}</span>
                      </div>
                      <div className="desc" style={{ marginTop: 10, fontSize: 14, lineHeight: 1.55, color: 'var(--wood)' }}>{item.desc}</div>
                      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#9b7d56', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>{item.category}</span>
                        <button className="buy-btn" type="button" onClick={() => addToCartHandler(item)}>В корзину</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">В этой подкатегории пока нет позиций.</div>
            )}
          </>
        )}
      </main>

      <div className={'toast' + (toastVisible ? ' show' : '')}>{toastText}</div>

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
