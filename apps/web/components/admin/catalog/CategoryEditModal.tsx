'use client';

import { useState } from 'react';

interface Subcategory {
  id: string; name: string; slug: string; categoryId: string;
}

interface CategoryData {
  id?: string; name?: string; slug?: string; sortOrder?: number;
  active?: boolean; imageUrl?: string;
}

interface Props {
  category: Partial<CategoryData>;
  subcategories: Subcategory[];
  saving: boolean;
  subSaving: boolean;
  onClose: () => void;
  onChange: (cat: Partial<CategoryData>) => void;
  onSave: () => void;
  onAddSubcategory: (name: string) => void;
  onDeleteSubcategory: (id: string) => void;
}

export default function CategoryEditModal({
  category,
  subcategories,
  saving,
  subSaving,
  onClose,
  onChange,
  onSave,
  onAddSubcategory,
  onDeleteSubcategory,
}: Props) {
  const [newSubName, setNewSubName] = useState('');

  const handleAddSub = () => {
    if (!newSubName.trim() || !category.id) return;
    onAddSubcategory(newSubName.trim());
    setNewSubName('');
  };

  return (
    <>
      <div className="auth-overlay" onClick={onClose} />
      <div className="admin-modal" style={{ width: 480, maxHeight: '90vh', overflow: 'auto' }}>
        <button className="close" onClick={onClose}>×</button>
        <h2>{category.id ? 'Редактировать категорию' : 'Новая категория'}</h2>
        <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
          <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
            Название
            <input value={category.name || ''} onChange={(e) => onChange({ ...category, name: e.target.value })} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
              Slug
              <input value={category.slug || ''} onChange={(e) => onChange({ ...category, slug: e.target.value })} />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
              Порядок
              <input type="number" value={category.sortOrder ?? ''} onChange={(e) => onChange({ ...category, sortOrder: +e.target.value })} />
            </label>
          </div>
          <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
            URL изображения
            <input value={category.imageUrl || ''} onChange={(e) => onChange({ ...category, imageUrl: e.target.value })} />
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--text2)' }}>
            <input type="checkbox" checked={category.active !== false} onChange={(e) => onChange({ ...category, active: e.target.checked })} />
            Активна
          </label>
        </div>

        {/* Subcategory Management */}
        {category.id && (
          <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <h3 style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 10 }}>Подкатегории</h3>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <input
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                placeholder="Название подкатегории"
                style={{ flex: 1 }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddSub(); }}
              />
              <button className="admin-btn admin-btn-sm" onClick={handleAddSub} disabled={subSaving}>
                {subSaving ? '...' : '+ Добавить'}
              </button>
            </div>
            {subcategories.filter((s) => s.categoryId === category.id).length === 0 ? (
              <p style={{ fontSize: 12, color: '#888' }}>Нет подкатегорий</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {subcategories.filter((s) => s.categoryId === category.id).map((sub) => (
                  <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'var(--bg3)', borderRadius: 6 }}>
                    <span style={{ fontSize: 13 }}>{sub.name}</span>
                    <button
                      className="admin-btn admin-btn-sm admin-btn-danger"
                      style={{ padding: '2px 8px', fontSize: 12 }}
                      onClick={() => onDeleteSubcategory(sub.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button className="admin-btn" onClick={onSave} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button className="admin-btn" style={{ background: 'var(--bg3)', color: 'var(--text2)' }} onClick={onClose}>Отмена</button>
        </div>
      </div>
    </>
  );
}
