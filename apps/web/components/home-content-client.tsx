'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatPrice } from '@grilyage/shared';
import { useAuth } from '@/lib/auth-context';
import AuthModal from '@/components/auth-modal';
import MapSection from '@/components/map-section';
import Header from '@/components/header';
import { useCart } from '@/lib/cart-context';
import { categories as localCategories, products as localProducts } from '@/lib/catalog';

type DisplayProduct = {
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
  isNew?: boolean;
  slug: string;
};

type ApiCategory = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  subcategories?: {
    id?: string;
    name: string;
    slug?: string;
    products?: {
      id?: string;
      name: string;
      slug?: string;
      price: number;
      weightGrams: number;
      kcal: number;
      protein: number;
      fat: number;
      carbs: number;
      imageUrl?: string | null;
      isNew?: boolean;
      description?: string;
    }[];
  }[];
};

const HERO_SLIDES = [
  {
    image: '/images/hero-1.svg',
    alt: 'Большой стол с красиво поданными блюдами',
  },
  {
    image: '/images/hero-2.svg',
    alt: 'Сервировка с горячими блюдами и зеленью',
  },
  {
    image: '/images/hero-3.svg',
    alt: 'Аппетитная подача обеда в ресторане',
  },
  {
    image: '/images/hero-4.svg',
    alt: 'Уютный гастро-интерьер с едой на столе',
  },
];

function toDisplay(p: any): DisplayProduct {
  return {
    category: p.subcategory?.category?.name || 'Кулинария',
    name: p.name,
    price: p.price,
    weight: `${p.weightGrams} г`,
    kcal: p.kcal,
    protein: p.protein,
    fat: p.fat,
    carbs: p.carbs,
    desc: p.description || '',
    image: p.imageUrl || '/images/category-kulinariya.jpg',
    isNew: p.isNew,
    slug: p.slug,
  };
}

function transformApiData(cats: ApiCategory[]): {
  categories: { title: string; image: string }[];
  products: DisplayProduct[];
  productIdMap: Record<string, string>;
} {
  const mapped = cats.map((c: ApiCategory) => ({
    title: c.name,
    image: c.imageUrl || '/images/category-novinki.jpg',
  }));
  const all: DisplayProduct[] = [];
  const idMap: Record<string, string> = {};
  for (const c of cats) {
    for (const sub of c.subcategories || []) {
      for (const p of sub.products || []) {
        const dp = toDisplay({ ...p, subcategory: { ...sub, category: c } });
        all.push(dp);
        if (p.id && p.name) idMap[p.name] = p.id;
      }
    }
  }
  return { categories: mapped, products: all, productIdMap: idMap };
}

export default function HomeContentClient({
  categoriesApiData,
}: {
  categoriesApiData?: ApiCategory[] | null;
}) {
  const hasApiData = categoriesApiData && categoriesApiData.length > 0;

  const initialData = hasApiData
    ? transformApiData(categoriesApiData!)
    : {
        categories: localCategories.map((c) => ({ title: c.title, image: c.image })),
        products: localProducts.map((p) => ({
          category: p.category,
          name: p.name,
          price: p.price,
          weight: p.weight,
          kcal: p.kcal,
          protein: p.protein,
          fat: p.fat,
          carbs: p.carbs,
          desc: p.desc,
          image: p.image,
          isNew: p.isNew,
          slug: p.name.toLowerCase().replace(/\s+/g, '-'),
        })),
        productIdMap: Object.fromEntries(localProducts.map((p) => [p.name, p.name])),
      };

  const [activeCategory, setActiveCategory] = useState(initialData.categories[0]?.title || '');
  const [displayCategories, setDisplayCategories] = useState(initialData.categories);
  const [displayProducts, setDisplayProducts] = useState(initialData.products);
  const { setAuthModalOpen } = useAuth();
  const { openCart, addToCart: cartAddToCart } = useCart();
  const [toast, setToast] = useState('');
  const [heroIndex, setHeroIndex] = useState(0);
  const [brandPressed, setBrandPressed] = useState(false);
  const [sticky, setSticky] = useState(false);

  // Try to fetch fresh data from API if server data wasn't available
  useEffect(() => {
    if (hasApiData) return;
    fetch('/api/v1/categories')
      .then((r) => r.json())
      .then((data: any) => {
        const cats = Array.isArray(data) ? data : ((data as any)?.categories || []);
        if (cats.length === 0) return;
        const { categories: mapped, products: all, productIdMap: _idMap } = transformApiData(cats);
        setDisplayCategories(mapped);
        if (all.length > 0) {
          setDisplayProducts(all);
        }
        setActiveCategory(mapped[0]?.title || activeCategory);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 1800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  // Hero slider auto-rotate
  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4800);
    return () => clearInterval(timer);
  }, []);

  // Header scroll
  useEffect(() => {
    const onScroll = () => setSticky(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const shownProducts = displayProducts.filter((p) => p.category === activeCategory);

  function addToCart(product: DisplayProduct) {
    cartAddToCart(product);
    openCart();
    setToast(`Добавлено: ${product.name}`);
  }

  function handleBrandClick() {
    setBrandPressed(true);
    setTimeout(() => setBrandPressed(false), 220);
  }

  function handleBuyClick(e: React.MouseEvent, product: DisplayProduct) {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    const btn = e.currentTarget as HTMLButtonElement;
    btn.classList.add('added');
    setTimeout(() => btn.classList.remove('added'), 1100);
  }

  const otherCategories = useMemo(
    () => ['Кулинария', 'Пекарня', 'Кондитерская', 'Бизнес-ланч'].filter((c) => c !== activeCategory && displayCategories.some((dc) => dc.title === c)),
    [activeCategory, displayCategories],
  );

  return (
    <main className="page">
      <Header
        sticky={sticky}
        brandPressed={brandPressed}
        onBrandClick={handleBrandClick}
        onAuthOpen={() => setAuthModalOpen((v) => !v)}
      />

      <section className="hero">
        <div className="hero-media" id="heroMedia">
          {HERO_SLIDES.map((slide, i) => (
            <div
              key={i}
              className={`hero-slide${i === heroIndex ? ' active' : ''}`}
              role="img"
              aria-label={slide.alt}
              style={{ backgroundImage: `url('${slide.image}')` }}
            />
          ))}
        </div>

        <div className="hero-content">
          <div className="hero-copy" id="top">
            <h1>Грильяж</h1>
            <div className="eyebrow">Gastro-House</div>
            <p>Оформляйте предзаказ блюд, выпечки и десертов с доставкой и самовывозом.</p>
            <div className="hero-badges" aria-label="Преимущества">
              <span>Доставка от 199 ₽</span>
              <span>Бесплатно от 1500 ₽</span>
              <span>Собери корзину и закажи</span>
            </div>
            <a className="cta" href="#menu">
              <span className="cta-inner">
                <span>Перейти к меню</span>
                <span className="cta-arrow">→</span>
              </span>
            </a>
          </div>
        </div>

        <div className="hero-controls">
          <button
            className="hero-nav"
            id="heroPrevBtn"
            type="button"
            aria-label="Предыдущий слайд"
            onClick={() => setHeroIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
          >
            ←
          </button>
          <div className="hero-dots" id="heroDots" aria-label="Навигация по фону шапки">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                className={`hero-dot${i === heroIndex ? ' active' : ''}`}
                type="button"
                aria-label={`Слайд ${i + 1}`}
                onClick={() => setHeroIndex(i)}
              />
            ))}
          </div>
          <button
            className="hero-nav"
            id="heroNextBtn"
            type="button"
            aria-label="Следующий слайд"
            onClick={() => setHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length)}
          >
            →
          </button>
        </div>
      </section>

      <section className="demo-strip" aria-label="Как сделать заказ">
        <article>
          <strong>1</strong>
          <span>Соберите корзину</span>
        </article>
        <article>
          <strong>2</strong>
          <span>Оформите заказ</span>
        </article>
        <article>
          <strong>3</strong>
          <span>Отслеживайте статус в личном кабинете</span>
        </article>
        <article>
          <strong>4</strong>
          <span>Оператор свяжется с вами</span>
        </article>
      </section>

      <section className="categories-wrap" id="menu">
        <div className="section-title">Категории</div>
        <div className="categories">
          {displayCategories.map((category) => (
            <button
              key={category.title}
              className={`category${category.title === activeCategory ? ' active' : ''}`}
              type="button"
              onClick={() => setActiveCategory(category.title)}
            >
              <div className="category-circle">
                <img src={category.image} alt="" />
              </div>
              <div className="category-label">{category.title}</div>
            </button>
          ))}
        </div>
      </section>

      <div className="menu-sections">
        <section className="menu-block">
          <h2>{activeCategory}</h2>
          <div className="row-shell">
            <ProductRow products={shownProducts} onBuy={handleBuyClick} />
          </div>
        </section>

        {otherCategories.map((cat) => {
          const products = displayProducts.filter((p) => p.category === cat);
          return (
            <section key={cat} className="menu-block">
              <h2>{cat}</h2>
              <div className="row-shell">
                <ProductRow products={products} onBuy={handleBuyClick} />
              </div>
            </section>
          );
        })}
      </div>

      <section id="about" className="info-grid">
        <article>
          <span>Производство</span>
          <h2>Своя кухня, пекарня и кондитерская</h2>
          <p>
            Готовим горячие блюда, выпечку и десерты под самовывоз, доставку и
            предзаказы.
          </p>
        </article>
        <article id="preorder">
          <span>Предзаказ</span>
          <h2>Большие заказы и праздники</h2>
          <p>
            Прототип поддерживает оформление заказа; расширенная форма
            предзаказа подключается следующим этапом.
          </p>
        </article>
      </section>

      <MapSection />

      <footer id="contacts" className="footer">
        <div className="footer-grid">
          <div className="footer-left">
            <div className="footer-eyebrow">Контакты</div>
            <div className="footer-brand">
              <img src="/logo.png" alt="Грильяж" style={{ width: 40, height: 40 }} />
              <div>
                <span>Грильяж</span>
              </div>
            </div>
            <div className="contact-list">
              <div>
                <div className="contact-label">Режим работы</div>
                <div className="contact-box work">
                  <div className="work-row">
                    <span>Пн–Пт:</span>
                    <span>08:00–21:00</span>
                  </div>
                  <div className="work-row">
                    <span>Сб–Вс:</span>
                    <span>09:00–21:00</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="contact-label">Телефон</div>
                <div className="contact-box">
                  <a href="tel:+73812900000">+7 (3812) 90-00-00</a>
                </div>
              </div>
              <div>
                <div className="contact-label">Почта</div>
                <div className="contact-box">
                  <a href="mailto:info@grilyazh-omsk.ru">info@grilyazh-omsk.ru</a>
                </div>
              </div>
              <div>
                <div className="contact-label">Адрес</div>
                <div className="contact-box">Омск, Харьковская, 7</div>
              </div>
            </div>
            <div className="socials">
              <a
                className="social vk"
                href="https://vk.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="VK"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3.05 7.56c.13 6.29 3.27 10.07 8.78 10.07h.31v-3.6c2.03.2 3.56 1.67 4.18 3.6h2.86c-.8-2.91-2.92-4.51-4.24-5.12 1.32-.76 3.18-2.61 3.62-4.95h-2.6c-.57 1.9-2.29 3.75-3.82 3.91V7.56h-2.6v6.86c-1.55-.39-3.5-2.38-3.59-6.86H3.05z" />
                </svg>
              </a>
              <a
                className="social tg"
                href="https://t.me/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21.9 4.6c.3-1.4-.5-1.9-1.6-1.5L2.8 9.8c-1.2.5-1.2 1.1-.2 1.4l4.5 1.4 10.4-6.6c.5-.3 1-.1.6.2l-8.4 7.6-.3 4.4c.4 0 .6-.2.8-.4l2.2-2.1 4.5 3.3c.8.4 1.4.2 1.6-.8L21.9 4.6z" />
                </svg>
              </a>
              <a className="social max" href="#" aria-label="Max">
                <span className="max-glyph" aria-hidden="true" />
              </a>
            </div>
          </div>
          <div className="footer-right">
            <div className="footer-map">
              <iframe
                src="https://yandex.ru/map-widget/v1/?ll=73.3638%2C54.9914&mode=search&oid=19567134820&ol=biz&z=16"
                title="Грильяж на карте"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
              />
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

      {toast && <div className="toast">{toast}</div>}
      <AuthModal />
    </main>
  );
}

function ProductRow({
  products,
  onBuy,
}: {
  products: DisplayProduct[];
  onBuy: (e: React.MouseEvent, product: DisplayProduct) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const onScroll = () => {
      setShowLeft(el.scrollLeft > 8);
      setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [products]);

  const scroll = (dir: number) => {
    rowRef.current?.scrollBy({ left: dir * 360, behavior: 'smooth' });
  };

  if (!products.length) return null;

  return (
    <>
      <button
        className={`row-arrow left${showLeft ? ' show' : ''}`}
        onClick={() => scroll(-1)}
        aria-label="Прокрутить влево"
      >
        ←
      </button>
      <div className="row" ref={rowRef}>
        {products.map((product) => (
          <div className="row-card" key={product.slug || product.name}>
            <div className="card">
              <img src={product.image} alt={product.name} />
              {product.isNew && <span className="badge">Новинка</span>}
              <h3>{product.name}</h3>
              <div className="card-weight">{product.weight}</div>
              <div className="card-kbju">
                <span className="kbju-item">
                  <b>К</b> {product.kcal}
                </span>
                <span className="kbju-item">
                  <b>Б</b> {product.protein}
                </span>
                <span className="kbju-item">
                  <b>Ж</b> {product.fat}
                </span>
                <span className="kbju-item">
                  <b>У</b> {product.carbs}
                </span>
              </div>
              <p>{product.desc}</p>
              <div className="card-bottom">
                <div className="card-price">{formatPrice(product.price)}</div>
                <button className="buy-btn" type="button" onClick={(e) => onBuy(e, product)}>
                  В корзину
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button
        className={`row-arrow right${showRight ? ' show' : ''}`}
        onClick={() => scroll(1)}
        aria-label="Прокрутить вправо"
      >
        →
      </button>
    </>
  );
}
