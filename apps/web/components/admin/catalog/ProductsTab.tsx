'use client';

import { formatProductPrice } from '@grilyage/shared';

type Subcategory = { id: string; name: string; slug: string; categoryId: string; category?: { id: string; name: string; slug: string } };
type Product = {
  id: string; name: string; slug: string; description: string;
  priceRubles: number; priceKopecks: number; price: number;
  weightGrams: number; active: boolean; isNew: boolean;
  imageUrl?: string; kcal: number; protein: number; fat: number; carbs: number;
  subcategoryId: string; subcategory?: Subcategory;
};

interface ProductsTabProps {
  products: Product[];
  subcategories: Subcategory[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export default function ProductsTab({ products, subcategories, onEdit, onDelete, onAdd }: ProductsTabProps) {
  const subcategoryName = (product: Product) => {
    const sub = subcategories.find((s) => s.id === product.subcategoryId);
    return sub ? `${sub.category?.name || ''} / ${sub.name}` : '—';
  };

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <button className="admin-btn" onClick={onAdd}>+ Добавить товар</button>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Категория</th>
            <th>Цена</th>
            <th>Вес</th>
            <th>КБЖУ</th>
            <th>Фото</th>
            <th>Активен</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td><strong>{product.name}</strong></td>
              <td style={{ color: '#888', fontSize: 12 }}>{subcategoryName(product)}</td>
              <td>{formatProductPrice(product.priceRubles, product.priceKopecks)}</td>
              <td>{product.weightGrams} г</td>
              <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                К {product.kcal} · Б {product.protein} · Ж {product.fat} · У {product.carbs}
              </td>
              <td>
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                ) : '—'}
              </td>
              <td><span style={{ color: product.active ? '#4caf50' : '#888' }}>{product.active ? 'Да' : 'Нет'}</span></td>
              <td>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="admin-btn admin-btn-sm" onClick={() => onEdit(product)}>✎</button>
                  <button className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => onDelete(product.id)}>✕</button>
                </div>
              </td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr><td colSpan={8} style={{ textAlign: 'center', color: '#888', padding: 40 }}>Нет товаров</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
}
