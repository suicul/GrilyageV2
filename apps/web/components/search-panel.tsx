'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatPrice, normalizeSearchText } from '@grilyage/shared';
import { useCart } from '@/lib/cart-context';

type DisplayProduct = {
  category: string;
  name: string;
  price: number;
  weight: string;
  image: string;
  slug: string;
};

function highlightMatch(text: string, query: string): string {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);
  return `${before}<mark>${match}</mark>${after}`;
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function SearchPanel({ open, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<DisplayProduct[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { addToCart: cartAddToCart, openCart } = useCart();

  useEffect(() => {
    fetch('/api/v1/categories')
      .then((r) => r.json())
      .then((data: any) => {
        const cats = Array.isArray(data) ? data : (data as any)?.categories || [];
        const all: DisplayProduct[] = [];
        for (const c of cats) {
          for (const sub of c.subcategories || []) {
            for (const p of sub.products || []) {
              all.push({
                category: c.name,
                name: p.name,
                price: p.price,
                weight: `${p.weightGrams} г`,
                image: p.imageUrl || '/images/category-kulinariya.jpg',
                slug: p.slug,
              });
            }
          }
        }
        setProducts(all);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      setActiveIdx(-1);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        const btn = document.getElementById('searchToggleBtn');
        if (btn && btn.contains(e.target as Node)) return;
        onClose();
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [open, onClose]);

  const results = useMemo(() => {
    const query = normalizeSearchText(search);
    if (!query) return [];
    return products
      .filter((p) =>
        normalizeSearchText(`${p.name} ${p.category}`).includes(query),
      )
      .slice(0, 8);
  }, [search, products]);

  function addToCart(product: DisplayProduct) {
    cartAddToCart(product as any);
    openCart();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && activeIdx >= 0 && results[activeIdx]) {
      e.preventDefault();
      addToCart(results[activeIdx]);
      setActiveIdx(-1);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  return (
    <div className={`search-wrap${open ? ' open' : ''}`} ref={wrapRef} aria-hidden={!open}>
      <div className="search-panel">
        <div className="search-head">
          <svg className="search-icon-pos" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6" />
            <path d="M20 20l-4.2-4.2" />
          </svg>
          <input
            className="search-input"
            ref={inputRef}
            type="search"
            placeholder="Найдите блюдо, десерт или выпечку"
            autoComplete="off"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActiveIdx(-1);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="search-results">
          {results.length === 0 && search && (
            <div className="search-empty">Ничего не найдено. Попробуйте другое название блюда.</div>
          )}
          {results.map((product, idx) => {
            const normalizedQuery = normalizeSearchText(search);
            const nameHtml = normalizedQuery
              ? highlightMatch(escapeHtml(product.name), escapeHtml(normalizedQuery))
              : escapeHtml(product.name);
            return (
              <div
                key={product.name}
                className={`search-result${idx === activeIdx ? ' is-active' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => addToCart(product)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    addToCart(product);
                  }
                }}
              >
                <img src={product.image} alt={product.name} />
                <div className="search-result-body">
                  <div className="search-result-name" dangerouslySetInnerHTML={{ __html: nameHtml }} />
                  <div className="search-result-meta">{product.category} · {product.weight}</div>
                </div>
                <div className="search-result-side">
                  <div className="search-result-price">{formatPrice(product.price)}</div>
                  <button
                    className="search-result-add"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product);
                      const btn = e.currentTarget;
                      btn.classList.add('added');
                      setTimeout(() => btn.classList.remove('added'), 950);
                    }}
                  >
                    В корзину
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
