'use client';

import { useEffect, useState } from 'react';
import { formatPrice } from '@grilyage/shared';

type Category = { id: string; name: string; slug: string; sortOrder: number; active: boolean };
type Product = {
  id: string; name: string; slug: string; description: string;
  price: number; weightGrams: number; active: boolean; isNew: boolean;
  imageUrl?: string; subcategory?: { name: string };
};

export default function AdminCatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('staffAccessToken') : null;
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/categories', { headers }).then((r) => r.json()).then((data: any) => setCategories(data.categories || data || [])).catch(() => {}),
      fetch('/api/v1/products', { headers }).then((r) => r.json()).then((data) => setProducts(Array.isArray(data) ? data : data.products || [])).catch(() => {}),
    ]).then(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleActive = async (productId: string, current: boolean) => {
    const res = await fetch(`/api/v1/staff/products/${productId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ active: !current }),
    });
    if (res.ok) {
      setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, active: !current } : p));
    }
  };

  return (
    <div>
      <h1>Каталог</h1>
      {loading ? <p style={{ color: '#888' }}>Загрузка...</p> : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Категория</th>
              <th>Цена</th>
              <th>Вес</th>
              <th>Новинка</th>
              <th>Активен</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td><strong>{product.name}</strong></td>
                <td style={{ color: '#888' }}>{product.subcategory?.name || '—'}</td>
                <td>{formatPrice(product.price)}</td>
                <td>{product.weightGrams} г</td>
                <td>{product.isNew ? '✓' : '—'}</td>
                <td>
                  <span style={{ color: product.active ? '#4caf50' : '#888' }}>
                    {product.active ? 'Да' : 'Нет'}
                  </span>
                </td>
                <td>
                  <button className="admin-btn admin-btn-sm" onClick={() => toggleActive(product.id, product.active)}>
                    {product.active ? 'Деактивировать' : 'Активировать'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
