'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  BASE_DELIVERY_COST_KOPECKS,
  DeliveryMode,
  FREE_DELIVERY_THRESHOLD_KOPECKS,
  formatPrice,
  getDeliveryCost,
  maskPhone,
  normalizeSearchText,
} from '@grilyage/shared';
import { categories, getCategoryProducts, type Product, products } from '@/lib/catalog';

type CartItem = Product & { qty: number };

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

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState('Кулинария');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(DeliveryMode.PICKUP);
  const [search, setSearch] = useState('');
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => setCart(readCart()), []);
  useEffect(() => {
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 1800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const shownProducts = getCategoryProducts(activeCategory);
  const searchResults = useMemo(() => {
    const query = normalizeSearchText(search);
    if (!query) return [];
    return products
      .filter((product) =>
        normalizeSearchText(`${product.name} ${product.category} ${product.desc}`).includes(query),
      )
      .slice(0, 6);
  }, [search]);
  const cartQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryCost = getDeliveryCost(subtotal, deliveryMode);
  const total = subtotal + deliveryCost;
  const deliveryProgress =
    deliveryMode === DeliveryMode.PICKUP
      ? 100
      : Math.min(100, Math.round((subtotal / FREE_DELIVERY_THRESHOLD_KOPECKS) * 100));

  function addToCart(product: Product) {
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

  function submitOrder() {
    if (!customerName.trim() || !phone.trim()) {
      setToast('Заполните имя и телефон');
      return;
    }
    if (deliveryMode === DeliveryMode.DELIVERY && !address.trim()) {
      setToast('Укажите адрес доставки');
      return;
    }
    const orderNumber = Math.floor(1000 + Math.random() * 9000);
    window.localStorage.setItem(
      'grilyazh-last-order',
      JSON.stringify({ orderNumber, cart, subtotal, deliveryCost, total, customerName, phone, address }),
    );
    setCart([]);
    setCheckoutOpen(false);
    setCartOpen(false);
    setToast(`Заказ №${orderNumber} принят. Оператор скоро свяжется с вами`);
  }

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-media" />
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
          </div>
        </header>
        <div className="hero-copy" id="top">
          <p className="eyebrow">Gastro-House</p>
          <h1>Грильяж</h1>
          <p>Оформляйте предзаказ блюд, выпечки и десертов с доставкой и самовывозом.</p>
          <a className="cta" href="#menu">Перейти к меню <span>→</span></a>
        </div>
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
          {categories.map((category) => (
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
              <div className="meta">
                <span>{product.weight}</span>
                <span>К {product.kcal}</span>
                <span>Б {product.protein}</span>
                <span>Ж {product.fat}</span>
                <span>У {product.carbs}</span>
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

      <footer id="contacts" className="footer">
        <div><h2>Грильяж</h2><p>Омск, Харьковская, 7</p><p>Пн–Пт 08:00–21:00 · Сб–Вс 09:00–21:00</p><p>info@grilyazh-omsk.ru</p></div>
        <div className="socials"><a>VK</a><a>TG</a><a>MAX</a></div>
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
            <label>Имя<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Как к вам обращаться" /></label>
            <label>Телефон<input value={phone} onChange={(event) => setPhone(maskPhone(event.target.value))} placeholder="+7 (___) ___-__-__" /></label>
            <label>{deliveryMode === DeliveryMode.PICKUP ? 'Точка самовывоза' : 'Адрес доставки'}<input value={address} onChange={(event) => setAddress(event.target.value)} placeholder={deliveryMode === DeliveryMode.PICKUP ? 'Харьковская, 7' : 'Улица, дом, квартира'} /></label>
            <label>Комментарий<textarea placeholder="Время, пожелания, приборы" /></label>
            <p className="total"><span>К оплате</span><strong>{formatPrice(total)}</strong></p>
            <button onClick={submitOrder}>Подтвердить заказ</button>
            <button className="ghost" onClick={() => setCheckoutOpen(false)}>Назад в корзину</button>
          </div>
        )}
      </aside>
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
