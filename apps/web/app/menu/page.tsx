'use client';

import { useState } from 'react';
import { formatPrice } from '@grilyage/shared';
import { categories, getCategoryProducts, type Product, products } from '@/lib/catalog';

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState('Кулинария');
  const shownProducts = getCategoryProducts(activeCategory);
  const totalCount = products.length;

  function addToCart(product: Product) {
    try {
      const raw = localStorage.getItem('grilyazh-cart');
      const cart: (Product & { qty: number })[] = raw ? JSON.parse(raw) : [];
      const idx = cart.findIndex((p) => p.name === product.name);
      if (idx >= 0 && cart[idx]) {
        cart[idx].qty += 1;
      } else {
        cart.push({ ...product, qty: 1 });
      }
      localStorage.setItem('grilyazh-cart', JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent('cart-updated'));
    } catch {}
  }

  return (
    <main className="page">
      <section className="menu-page-header">
        <h1>Меню</h1>
        <p>{totalCount} позиций · бесплатно доставим от 1&nbsp;500&nbsp;₽</p>
      </section>

      <div className="categories">
        {categories.map((cat) => (
          <button
            key={cat.title}
            className={cat.title === activeCategory ? 'active' : ''}
            type="button"
            onClick={() => setActiveCategory(cat.title)}
          >
            <img src={cat.image} alt="" />
            <span>{cat.title}</span>
          </button>
        ))}
      </div>

      <section className="menu-section">
        <div className="section-head">
          <h2>{activeCategory}</h2>
          <p>{shownProducts.length} позиций</p>
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
    </main>
  );
}
