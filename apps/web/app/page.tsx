'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  DeliveryMode,
  FREE_DELIVERY_THRESHOLD_KOPECKS,
  formatPrice,
  getDeliveryCost,
  maskPhone,
  normalizeSearchText,
} from '@grilyage/shared';
import { useAuth } from '@/lib/auth-context';
import AuthModal from '@/components/auth-modal';
import MapSection from '@/components/map-section';

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

type CartItem = DisplayProduct & { qty: number };

const CART_KEY = 'grilyazh-cart';

function readCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = window.localStorage.getItem(CART_KEY);
    return value ? (JSON.parse(value) as CartItem[]) : [];
  } catch {
    return [];
  }
}

/** Convert API product to display format */
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

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState('');
  const [displayCategories, setDisplayCategories] = useState<{ title: string; image: string }[]>([]);
  const [displayProducts, setDisplayProducts] = useState<DisplayProduct[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(DeliveryMode.PICKUP);
  const [search, setSearch] = useState('');
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [comment, setComment] = useState('');
  const { user, setAuthModalOpen } = useAuth();

  // Fetch catalog from API
  const [productIdMap, setProductIdMap] = useState<Record<string, string>>({});
  useEffect(() => {
    fetch('/api/v1/categories')
      .then((r) => r.json())
      .then((data: any) => {
        const cats = Array.isArray(data) ? data : ((data as any)?.categories || []);
        const mapped = cats.map((c: any) => ({ title: c.name, image: c.imageUrl || '/images/category-novinki.jpg' }));
        setDisplayCategories(mapped);
        // Collect all products from all categories/subcategories
        const all: DisplayProduct[] = [];
        const idMap: Record<string, string> = {};
        for (const c of cats) {
          for (const sub of (c.subcategories || [])) {
            for (const p of (sub.products || [])) {
              const dp = toDisplay({ ...p, subcategory: { ...sub, category: c } });
              all.push(dp);
              if (p.id && p.name) idMap[p.name] = p.id;
            }
          }
        }
        setDisplayProducts(all);
        setProductIdMap(idMap);
        if (!activeCategory && mapped.length > 0) setActiveCategory(mapped[0].title);
        setCategoriesLoaded(true);
      })
      .catch(() => {
        // Fallback to hardcoded data
        import('@/lib/catalog').then((mod) => {
          const fallback: DisplayProduct[] = mod.products.map((p: any) => ({
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
          }));
          setDisplayProducts(fallback);
          setDisplayCategories(mod.categories.map((c: any) => ({ title: c.title, image: c.image })));
          setActiveCategory('Кулинария');
          setCategoriesLoaded(true);
          const idMap: Record<string, string> = {};
          for (const p of mod.products) { idMap[p.name] = p.name; }
          setProductIdMap(idMap);
        });
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill checkout from user profile when logged in
  useEffect(() => {
    if (user) {
      setCustomerName((prev) => prev || user.name || '');
      setPhone((prev) => prev || user.phone || '');
    }
  }, [user]);
  const [toast, setToast] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => setCart(readCart()), []);
  useEffect(() => {
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 1800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const shownProducts = displayProducts.filter((p) => p.category === activeCategory);
  const searchResults = useMemo(() => {
    const query = normalizeSearchText(search);
    if (!query) return [];
    return displayProducts
      .filter((product) =>
        normalizeSearchText(`${product.name} ${product.category} ${product.desc}`).includes(query),
      )
      .slice(0, 6);
  }, [search, displayProducts]);
  const cartQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryCost = getDeliveryCost(subtotal, deliveryMode);
  const total = subtotal + deliveryCost;
  const deliveryProgress =
    deliveryMode === DeliveryMode.PICKUP
      ? 100
      : Math.min(100, Math.round((subtotal / FREE_DELIVERY_THRESHOLD_KOPECKS) * 100));

  function addToCart(product: DisplayProduct) {
    setCart((current) => {
      const existing = current.find((item) => item.name === product.name);
      if (existing) return current.map((item) => (item.name === product.name ? { ...item, qty: item.qty + 1 } : item));
      return [...current, { ...product, qty: 1 }];
    });
    setCartOpen(true);
    setToast(`Добавлено: ${product.name}`);
  }

  function changeQty(name: string, delta: number) {
    setCart((current) =>
      current
        .map((item) => (item.name === name ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0),
    );
  }

  async function submitOrder() {
    if (!customerName.trim() || !phone.trim()) {
      setToast('Заполните имя и телефон');
      return;
    }
    if (deliveryMode === DeliveryMode.DELIVERY && !address.trim()) {
      setToast('Укажите адрес доставки');
      return;
    }
    try {
      const body = {
        items: cart.map((item) => ({ productId: productIdMap[item.name] || item.name, qty: item.qty })),
        deliveryMode,
        paymentMethod: 'CASH',
        customerName: customerName.trim(),
        customerPhone: phone.trim(),
        address: deliveryMode === DeliveryMode.DELIVERY ? address.trim() : undefined,
        comment: comment.trim() || undefined,
      };
      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Ошибка сервера' }));
        setToast(err.message || 'Не удалось оформить заказ');
        return;
      }
      const order = await res.json();
      window.localStorage.setItem('grilyazh-last-order', JSON.stringify(order));
      setCart([]);
      setCheckoutOpen(false);
      setCartOpen(false);
      setToast(`Заказ №${order.number || order.id} принят. Оператор скоро свяжется с вами`);
    } catch {
      setToast('Не удалось отправить заказ. Проверьте подключение к интернету.');
    }
  }

  return (
    <main className="page">
      <header className="header">
        <a className="brand" href="#top" aria-label="На главную">
          <Image src="/logo.png" alt="Грильяж" width={88} height={88} priority />
          <span>
            <strong>Грильяж</strong>
            <small>Вкус Омска</small>
          </span>
        </a>
        <nav className="nav" aria-label="Основная навигация">
          <a href="#menu">Меню</a>
          <a href="#about">О нас</a>
          <a href="#contacts">Контакты</a>
          <a href="#preorder">Предзаказ</a>
        </nav>
        <div className="header-right">
          <a className="phone" href="tel:+73812900000">+7 (3812) 90-00-00</a>
          <button className="circle-btn" type="button" onClick={() => document.getElementById('search')?.focus()}>
            ⌕
          </button>
          <button className="circle-btn cart-button" type="button" onClick={() => setCartOpen(true)}>
            🛒<span>{cartQty}</span>
          </button>
          {mounted && (
            <button className="circle-btn login-pill" type="button" onClick={() => setAuthModalOpen(true)}>
              {user ? '👤' : 'Войти'}
            </button>
          )}
        </div>
      </header>
      <section className="hero">
        <div className="hero-media" />
        <div className="hero-copy" id="top">
          <p className="eyebrow">Gastro-House</p>
          <h1>Грильяж</h1>
          <p>Оформляйте предзаказ блюд, выпечки и десертов с доставкой и самовывозом.</p>
          <div className="hero-badges" aria-label="Преимущества">
            <span>Доставка от 199 ₽</span>
            <span>Бесплатно от 1500 ₽</span>
            <span>CRM demo ready</span>
          </div>
          <a className="cta" href="#menu">Перейти к меню <span>→</span></a>
        </div>
      </section>

      <section className="demo-strip" aria-label="Демонстрационный сценарий">
        <article><strong>1</strong><span>Соберите корзину</span></article>
        <article><strong>2</strong><span>Оформите заказ</span></article>
        <article><strong>3</strong><span>Откройте CRM `/admin`</span></article>
        <article><strong>4</strong><span>Покажите статусы заказа</span></article>
      </section>

      <section className="search-section" aria-label="Поиск блюд">
        <input id="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти блюдо: паста, торт, ланч..." />
        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((product) => (
              <button key={product.name} type="button" onClick={() => addToCart(product)}>
                <img src={product.image} alt="" />
                <span>{product.name}</span>
                <strong>{formatPrice(product.price)}</strong>
              </button>
            ))}
          </div>
        )}
      </section>

      <section id="menu" className="menu-section">
        <h2>Категории</h2>
        <div className="categories">
          {displayCategories.map((category) => (
            <button key={category.title} className={category.title === activeCategory ? 'active' : ''} type="button" onClick={() => setActiveCategory(category.title)}>
              <img src={category.image} alt="" />
              <span>{category.title}</span>
            </button>
          ))}
        </div>
        <div className="section-head">
          <h2>{activeCategory}</h2>
          <p>{shownProducts.length} позиций · бесплатно доставим от 1500 ₽</p>
        </div>
        <div className="product-grid">
          {shownProducts.map((product) => (
            <article className="card" key={product.name}>
              <img src={product.image} alt={product.name} />
              {product.isNew && <span className="badge">Новинка</span>}
              <h3>{product.name}</h3>
              <div className="card-weight">{product.weight}</div>
              <div className="card-kbju">
                <span className="kbju-item"><b>К</b> {product.kcal}</span>
                <span className="kbju-item"><b>Б</b> {product.protein}</span>
                <span className="kbju-item"><b>Ж</b> {product.fat}</span>
                <span className="kbju-item"><b>У</b> {product.carbs}</span>
              </div>
              <p>{product.desc}</p>
              <footer>
                <strong>{formatPrice(product.price)}</strong>
                <button type="button" onClick={() => addToCart(product)}>В корзину</button>
              </footer>
            </article>
          ))}
        </div>
      </section>

      <section id="about" className="info-grid">
        <article><span>Производство</span><h2>Своя кухня, пекарня и кондитерская</h2><p>Готовим горячие блюда, выпечку и десерты под самовывоз, доставку и предзаказы.</p></article>
        <article id="preorder"><span>Предзаказ</span><h2>Большие заказы и праздники</h2><p>Прототип поддерживает оформление заказа; расширенная форма предзаказа подключается следующим этапом.</p></article>
      </section>

      <MapSection />

      <footer id="contacts" className="footer">
        <div><h2>Грильяж</h2><p>Омск, Харьковская, 7</p><p>Пн–Пт 08:00–21:00 · Сб–Вс 09:00–21:00</p><p>info@grilyazh-omsk.ru</p></div>
        <div className="socials">
          <a href="/social/vk" target="_blank" rel="noopener noreferrer" className="social vk" title="ВКонтакте">VK</a>
          <a href="/social/tg" target="_blank" rel="noopener noreferrer" className="social tg" title="Telegram">TG</a>
          <a href="/social/max" target="_blank" rel="noopener noreferrer" className="social max" title="MAX">MAX</a>
        </div>
      </footer>

      <div className={`overlay ${cartOpen ? 'open' : ''}`} onClick={() => setCartOpen(false)} />
      <aside className={`cart ${cartOpen ? 'open' : ''}`} aria-label="Корзина">
        <header><div><h2>Корзина</h2><p>{cartQty} позиций</p></div><button onClick={() => setCartOpen(false)}>×</button></header>
        {!checkoutOpen ? (
          <>
            <div className="cart-list">
              {cart.length === 0 ? <p className="empty">Корзина пока пустая</p> : cart.map((item) => (
                <div className="cart-item" key={item.name}>
                  <img src={item.image} alt="" />
                  <div><strong>{item.name}</strong><small>{item.weight} · {formatPrice(item.price)}</small><div><button onClick={() => changeQty(item.name, -1)}>−</button><span>{item.qty}</span><button onClick={() => changeQty(item.name, 1)}>+</button></div></div>
                  <b>{formatPrice(item.price * item.qty)}</b>
                </div>
              ))}
            </div>
            <div className="summary">
              <p><span>Сумма</span><strong>{formatPrice(subtotal)}</strong></p>
              <p><span>Доставка</span><strong>{deliveryMode === DeliveryMode.PICKUP ? 'Самовывоз' : formatPrice(deliveryCost)}</strong></p>
              <div className="progress"><span style={{ width: `${deliveryProgress}%` }} /></div>
              <small>{deliveryMode === DeliveryMode.PICKUP ? 'Самовывоз бесплатно' : subtotal >= FREE_DELIVERY_THRESHOLD_KOPECKS ? 'Бесплатная доставка доступна' : `До бесплатной доставки ${formatPrice(FREE_DELIVERY_THRESHOLD_KOPECKS - subtotal)}`}</small>
              <p className="total"><span>Итого</span><strong>{formatPrice(total)}</strong></p>
              <button disabled={cart.length === 0} onClick={() => setCheckoutOpen(true)}>Оформить заказ</button>
            </div>
          </>
        ) : (
          <div className="checkout">
            <div className="toggle"><button className={deliveryMode === DeliveryMode.PICKUP ? 'active' : ''} onClick={() => setDeliveryMode(DeliveryMode.PICKUP)}>Самовывоз</button><button className={deliveryMode === DeliveryMode.DELIVERY ? 'active' : ''} onClick={() => setDeliveryMode(DeliveryMode.DELIVERY)}>Доставка</button></div>
            <label>Имя<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Как к вам обращаться" readOnly={!!user} style={user ? { opacity: 0.7, cursor: 'not-allowed' } : {}} /></label>
            <label>Телефон<input value={phone} onChange={(event) => setPhone(maskPhone(event.target.value))} placeholder="+7 (___) ___-__-__" readOnly={!!user} style={user ? { opacity: 0.7, cursor: 'not-allowed' } : {}} /></label>
            <label>{deliveryMode === DeliveryMode.PICKUP ? 'Точка самовывоза' : 'Адрес доставки'}<input value={address} onChange={(event) => setAddress(event.target.value)} placeholder={deliveryMode === DeliveryMode.PICKUP ? 'Харьковская, 7' : 'Улица, дом, квартира'} /></label>
            <label>Комментарий<textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Время, пожелания, приборы" /></label>
            <p className="total"><span>К оплате</span><strong>{formatPrice(total)}</strong></p>
            <button onClick={submitOrder}>Подтвердить заказ</button>
            <button className="ghost" onClick={() => setCheckoutOpen(false)}>Назад в корзину</button>
          </div>
        )}
      </aside>
      {toast && <div className="toast">{toast}</div>}
      <AuthModal />
    </main>
  );
}
