'use client';

import { useState, useRef } from 'react';

interface Subcategory {
  id: string; name: string; slug: string; categoryId: string;
}

interface Category {
  id: string; name: string; slug: string; sortOrder: number; active: boolean;
}

interface ProductData {
  id?: string; name?: string; description?: string;
  priceRubles?: number; priceKopecks?: number;
  weightGrams?: number; kcal?: number; protein?: number; fat?: number; carbs?: number;
  subcategoryId?: string; imageUrl?: string; isNew?: boolean; active?: boolean;
}

interface Props {
  product: Partial<ProductData>;
  categories: Category[];
  subcategories: Subcategory[];
  selectedCategoryId: string;
  saving: boolean;
  onClose: () => void;
  onChange: (product: Partial<ProductData>) => void;
  onCategoryChange: (categoryId: string) => void;
  onSave: () => void;
}

export default function ProductEditModal({
  product,
  categories,
  subcategories,
  selectedCategoryId,
  saving,
  onClose,
  onChange,
  onCategoryChange,
  onSave,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/v1/staff/uploads/file', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        onChange({ ...product, imageUrl: data.url });
      } else {
        alert('Ошибка загрузки');
      }
    } catch {
      alert('Ошибка сети');
    }
  };

  return (
    <>
      <div className="auth-overlay" onClick={onClose} />
      <div className="admin-modal" style={{ width: 640, maxHeight: '90vh' }}>
        <button className="close" onClick={onClose}>×</button>
        <h2>{product.id ? 'Редактировать товар' : 'Новый товар'}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16, overflow: 'auto' }}>
          <label style={{ gridColumn: '1 / -1', display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
            Название
            <input value={product.name || ''} onChange={(e) => onChange({ ...product, name: e.target.value })} />
          </label>
          <label style={{ gridColumn: '1 / -1', display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
            Описание
            <textarea value={product.description || ''} onChange={(e) => onChange({ ...product, description: e.target.value })} rows={2} />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
            Цена (руб.)
            <input type="number" min="0" value={product.priceRubles ?? ''} onChange={(e) => onChange({ ...product, priceRubles: +e.target.value })} />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
            Коп.
            <input type="number" min="0" max="99" value={product.priceKopecks ?? ''} onChange={(e) => onChange({ ...product, priceKopecks: Math.min(99, Math.max(0, +e.target.value)) })} />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
            Вес (г)
            <input type="number" value={product.weightGrams ?? ''} onChange={(e) => onChange({ ...product, weightGrams: +e.target.value })} />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
            Ккал
            <input type="number" value={product.kcal ?? ''} onChange={(e) => onChange({ ...product, kcal: +e.target.value })} />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
            Белки
            <input type="number" value={product.protein ?? ''} onChange={(e) => onChange({ ...product, protein: +e.target.value })} />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
            Жиры
            <input type="number" value={product.fat ?? ''} onChange={(e) => onChange({ ...product, fat: +e.target.value })} />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
            Углеводы
            <input type="number" value={product.carbs ?? ''} onChange={(e) => onChange({ ...product, carbs: +e.target.value })} />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
            Категория
            <select
              value={selectedCategoryId}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              <option value="">— выберите категорию —</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </label>
          <label style={{ gridColumn: '1 / -1', display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
            Подкатегория
            <select
              value={product.subcategoryId || ''}
              onChange={(e) => onChange({ ...product, subcategoryId: e.target.value })}
              disabled={!selectedCategoryId}
            >
              <option value="">— выберите —</option>
              {subcategories
                .filter((s) => s.categoryId === selectedCategoryId)
                .map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
            </select>
          </label>
          <label style={{ gridColumn: '1 / -1', display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
            <span>Изображение</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                value={product.imageUrl || ''}
                onChange={(e) => onChange({ ...product, imageUrl: e.target.value })}
                placeholder="https://..."
                style={{ flex: 1 }}
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
              />
              <button className="admin-btn admin-btn-sm" type="button" onClick={() => fileRef.current?.click()}>
                📁 Файл
              </button>
            </div>
            {product.imageUrl && (
              <img src={product.imageUrl} alt="" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', marginTop: 6 }} />
            )}
          </label>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 16 }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--text2)' }}>
              <input type="checkbox" checked={!!product.isNew} onChange={(e) => onChange({ ...product, isNew: e.target.checked })} />
              Новинка
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--text2)' }}>
              <input type="checkbox" checked={product.active !== false} onChange={(e) => onChange({ ...product, active: e.target.checked })} />
              Активен
            </label>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button className="admin-btn" onClick={onSave} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button className="admin-btn" style={{ background: 'var(--bg3)', color: 'var(--text2)' }} onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </>
  );
}
