'use client';

import { useEffect, useState, useRef } from 'react';
import { formatPrice } from '@grilyage/shared';

type Category = { id: string; name: string; slug: string; sortOrder: number; active: boolean; description?: string; imageUrl?: string };
type Subcategory = { id: string; name: string; slug: string; categoryId: string; category?: Category };
type Product = {
  id: string; name: string; slug: string; description: string;
  price: number; weightGrams: number; active: boolean; isNew: boolean;
  imageUrl?: string; kcal: number; protein: number; fat: number; carbs: number;
  subcategoryId: string; subcategory?: Subcategory;
};

type Tab = 'products' | 'categories';

const EMPTY_PRODUCT: Partial<Product> = {
  name: '', description: '', price: 0, weightGrams: 0, kcal: 0, protein: 0, fat: 0, carbs: 0,
  subcategoryId: '', imageUrl: '', isNew: false, active: true,
};

export default function AdminCatalogPage() {
  const [tab, setTab] = useState<Tab>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Product editor
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [saving, setSaving] = useState(false);

  // Category editor
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [catSaving, setCatSaving] = useState(false);

  // Subcategory inline state
  const [newSubName, setNewSubName] = useState('');
  const [subSaving, setSubSaving] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('staffAccessToken') : null;
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/v1/staff/products', { headers })
        .then((r) => r.json()).then((data) => setProducts(Array.isArray(data) ? data : []))
        .catch(() => setProducts([])),
      fetch('/api/v1/categories', { headers })
        .then((r) => r.json()).then((data) => {
          const cats = data.categories || data || [];
          setCategories(Array.isArray(cats) ? cats.filter((c: any) => c.id) : []);
        }).catch(() => setCategories([])),
      fetch('/api/v1/subcategories', { headers })
        .then((r) => r.json()).then((data) => setSubcategories(Array.isArray(data) ? data : []))
        .catch(() => setSubcategories([])),
    ]).then(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Product CRUD ─── */
  const saveProduct = async () => {
    if (!editingProduct || !editingProduct.name?.trim()) return alert('Введите название');
    setSaving(true);
    try {
      const body = { ...editingProduct };
      delete (body as any).id;
      if (body.imageUrl && body.imageUrl.startsWith('blob:')) delete body.imageUrl; // don't send blob URLs
      const isNew = !editingProduct.id;
      const url = isNew ? '/api/v1/staff/products' : `/api/v1/staff/products/${editingProduct.id}`;
      const res = await fetch(url, { method: isNew ? 'POST' : 'PATCH', headers, body: JSON.stringify(body) });
      if (res.ok) { setEditingProduct(null); fetchData(); }
      else { const err = await res.json().catch(() => ({ message: 'Ошибка' })); alert(err.message); }
    } catch { alert('Ошибка сети'); }
    setSaving(false);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Удалить товар?')) return;
    const res = await fetch(`/api/v1/staff/products/${id}`, { method: 'DELETE', headers });
    if (res.ok) fetchData(); else alert('Ошибка удаления');
  };

  /* ─── Category CRUD ─── */
  const saveCategory = async () => {
    if (!editingCategory || !editingCategory.name?.trim()) return alert('Введите название категории');
    setCatSaving(true);
    try {
      const body: any = { name: editingCategory.name, slug: editingCategory.slug, sortOrder: editingCategory.sortOrder, active: editingCategory.active };
      if (editingCategory.imageUrl) body.imageUrl = editingCategory.imageUrl;
      const isNew = !editingCategory.id;
      const url = isNew ? '/api/v1/staff/categories' : `/api/v1/staff/categories/${editingCategory.id}`;
      const res = await fetch(url, { method: isNew ? 'POST' : 'PATCH', headers, body: JSON.stringify(body) });
      if (res.ok) { setEditingCategory(null); fetchData(); }
      else { const err = await res.json().catch(() => ({ message: 'Ошибка' })); alert(err.message); }
    } catch { alert('Ошибка сети'); }
    setCatSaving(false);
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Удалить категорию и все её товары?')) return;
    const res = await fetch(`/api/v1/staff/categories/${id}`, { method: 'DELETE', headers });
    if (res.ok) fetchData(); else alert('Ошибка удаления');
  };

  /* ─── Subcategory CRUD ─── */
  const addSubcategory = async (categoryId: string) => {
    if (!newSubName.trim()) return alert('Введите название подкатегории');
    setSubSaving(true);
    try {
      const slug = newSubName.toLowerCase().replace(/[^а-яёa-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const res = await fetch(`/api/v1/staff/categories/${categoryId}/subcategories`, {
        method: 'POST', headers, body: JSON.stringify({ name: newSubName.trim(), slug }),
      });
      if (res.ok) { setNewSubName(''); fetchData(); }
      else { const err = await res.json().catch(() => ({ message: 'Ошибка' })); alert(err.message); }
    } catch { alert('Ошибка сети'); }
    setSubSaving(false);
  };

  const deleteSubcategory = async (id: string) => {
    if (!confirm('Удалить подкатегорию?')) return;
    const res = await fetch(`/api/v1/staff/subcategories/${id}`, { method: 'DELETE', headers });
    if (res.ok) fetchData(); else alert('Ошибка удаления');
  };

  /* ─── Image Upload ─── */
  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/v1/staff/uploads/file', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setEditingProduct((prev) => prev ? { ...prev, imageUrl: data.url } : null);
      } else alert('Ошибка загрузки');
    } catch { alert('Ошибка сети'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1>Каталог</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`admin-btn ${tab === 'products' ? 'admin-btn-active' : ''}`}
            onClick={() => setTab('products')}
          >
            Товары
          </button>
          <button
            className={`admin-btn ${tab === 'categories' ? 'admin-btn-active' : ''}`}
            onClick={() => setTab('categories')}
          >
            Категории
          </button>
        </div>
      </div>

      {loading ? <p style={{ color: '#888' }}>Загрузка...</p> : (
        <>
          {/* ═══ Products Tab ═══ */}
          {tab === 'products' && (
            <>
              <div style={{ marginBottom: 12 }}>
                  <button className="admin-btn" onClick={() => { setEditingProduct({ ...EMPTY_PRODUCT }); setSelectedCategoryId(''); }}>
                  + Добавить товар
                </button>
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
                      <td style={{ color: '#888', fontSize: 12 }}>
                        {product.subcategory?.category?.name || '—'} / {product.subcategory?.name || '—'}
                      </td>
                      <td>{formatPrice(product.price)}</td>
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
                          <button className="admin-btn admin-btn-sm" onClick={() => { setEditingProduct(product); setSelectedCategoryId(subcategories.find((s) => s.id === product.subcategoryId)?.categoryId || ''); }}>✎</button>
                          <button className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => deleteProduct(product.id)}>✕</button>
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
          )}

          {/* ═══ Categories Tab ═══ */}
          {tab === 'categories' && (
            <>
              <div style={{ marginBottom: 12 }}>
                <button className="admin-btn" onClick={() => setEditingCategory({ name: '', sortOrder: 0, active: true })}>
                  + Добавить категорию
                </button>
              </div>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>Slug</th>
                    <th>Порядок</th>
                    <th>Подкатегории</th>
                    <th>Активна</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.id}>
                      <td><strong>{cat.name}</strong></td>
                      <td style={{ color: '#888', fontSize: 12 }}>{cat.slug}</td>
                      <td>{cat.sortOrder}</td>
                      <td style={{ fontSize: 12, color: '#888' }}>
                        {(cat as any).subcategories?.map((s: any) => s.name).join(', ') || '—'}
                      </td>
                      <td><span style={{ color: cat.active ? '#4caf50' : '#888' }}>{cat.active ? 'Да' : 'Нет'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="admin-btn admin-btn-sm" onClick={() => setEditingCategory(cat)}>✎</button>
                          <button className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => deleteCategory(cat.id)}>✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {categories.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888', padding: 40 }}>Нет категорий</td></tr>
                  )}
                </tbody>
              </table>
            </>
          )}
        </>
      )}

      {/* ═══ Product Edit Modal ═══ */}
      {editingProduct && (
        <>
          <div className="auth-overlay" onClick={() => setEditingProduct(null)} />
          <div className="admin-modal" style={{ width: 640, maxHeight: '90vh' }}>
            <button className="close" onClick={() => setEditingProduct(null)}>×</button>
            <h2>{editingProduct.id ? 'Редактировать товар' : 'Новый товар'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16, overflow: 'auto' }}>
              <label style={{ gridColumn: '1 / -1', display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                Название
                <input value={editingProduct.name || ''} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} />
              </label>
              <label style={{ gridColumn: '1 / -1', display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                Описание
                <textarea value={editingProduct.description || ''} onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })} rows={2} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                Цена (коп.)
                <input type="number" value={editingProduct.price ?? ''} onChange={(e) => setEditingProduct({ ...editingProduct, price: +e.target.value })} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                Вес (г)
                <input type="number" value={editingProduct.weightGrams ?? ''} onChange={(e) => setEditingProduct({ ...editingProduct, weightGrams: +e.target.value })} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                Ккал
                <input type="number" value={editingProduct.kcal ?? ''} onChange={(e) => setEditingProduct({ ...editingProduct, kcal: +e.target.value })} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                Белки
                <input type="number" value={editingProduct.protein ?? ''} onChange={(e) => setEditingProduct({ ...editingProduct, protein: +e.target.value })} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                Жиры
                <input type="number" value={editingProduct.fat ?? ''} onChange={(e) => setEditingProduct({ ...editingProduct, fat: +e.target.value })} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                Углеводы
                <input type="number" value={editingProduct.carbs ?? ''} onChange={(e) => setEditingProduct({ ...editingProduct, carbs: +e.target.value })} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                Категория
                <select
                  value={selectedCategoryId}
                  onChange={(e) => {
                    const catId = e.target.value;
                    setSelectedCategoryId(catId);
                    const firstSub = subcategories.find((s) => s.categoryId === catId);
                    setEditingProduct({ ...editingProduct, subcategoryId: firstSub?.id || '' });
                  }}
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
                  value={editingProduct.subcategoryId || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, subcategoryId: e.target.value })}
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
                    value={editingProduct.imageUrl || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
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
                {editingProduct.imageUrl && (
                  <img src={editingProduct.imageUrl} alt="" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', marginTop: 6 }} />
                )}
              </label>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 16 }}>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--text2)' }}>
                  <input type="checkbox" checked={!!editingProduct.isNew} onChange={(e) => setEditingProduct({ ...editingProduct, isNew: e.target.checked })} />
                  Новинка
                </label>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--text2)' }}>
                  <input type="checkbox" checked={editingProduct.active !== false} onChange={(e) => setEditingProduct({ ...editingProduct, active: e.target.checked })} />
                  Активен
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="admin-btn" onClick={saveProduct} disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button className="admin-btn" style={{ background: 'var(--bg3)', color: 'var(--text2)' }} onClick={() => setEditingProduct(null)}>
                Отмена
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══ Category Edit Modal ═══ */}
      {editingCategory && (
        <>
          <div className="auth-overlay" onClick={() => setEditingCategory(null)} />
          <div className="admin-modal" style={{ width: 480, maxHeight: '90vh', overflow: 'auto' }}>
            <button className="close" onClick={() => setEditingCategory(null)}>×</button>
            <h2>{editingCategory.id ? 'Редактировать категорию' : 'Новая категория'}</h2>
            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                Название
                <input value={editingCategory.name || ''} onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                  Slug
                  <input value={editingCategory.slug || ''} onChange={(e) => setEditingCategory({ ...editingCategory, slug: e.target.value })} />
                </label>
                <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                  Порядок
                  <input type="number" value={editingCategory.sortOrder ?? ''} onChange={(e) => setEditingCategory({ ...editingCategory, sortOrder: +e.target.value })} />
                </label>
              </div>
              <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                URL изображения
                <input value={editingCategory.imageUrl || ''} onChange={(e) => setEditingCategory({ ...editingCategory, imageUrl: e.target.value })} />
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--text2)' }}>
                <input type="checkbox" checked={editingCategory.active !== false} onChange={(e) => setEditingCategory({ ...editingCategory, active: e.target.checked })} />
                Активна
              </label>
            </div>

            {/* ═══ Subcategory Management ═══ */}
            {editingCategory.id && (
              <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <h3 style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 10 }}>Подкатегории</h3>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  <input
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    placeholder="Название подкатегории"
                    style={{ flex: 1 }}
                    onKeyDown={(e) => { if (e.key === 'Enter') addSubcategory(editingCategory.id!); }}
                  />
                  <button className="admin-btn admin-btn-sm" onClick={() => addSubcategory(editingCategory.id!)} disabled={subSaving}>
                    {subSaving ? '...' : '+ Добавить'}
                  </button>
                </div>
                {subcategories.filter((s) => s.categoryId === editingCategory.id).length === 0 ? (
                  <p style={{ fontSize: 12, color: '#888' }}>Нет подкатегорий</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {subcategories.filter((s) => s.categoryId === editingCategory.id).map((sub) => (
                      <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'var(--bg3)', borderRadius: 6 }}>
                        <span style={{ fontSize: 13 }}>{sub.name}</span>
                        <button
                          className="admin-btn admin-btn-sm admin-btn-danger"
                          style={{ padding: '2px 8px', fontSize: 12 }}
                          onClick={() => deleteSubcategory(sub.id)}
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
              <button className="admin-btn" onClick={saveCategory} disabled={catSaving}>
                {catSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button className="admin-btn" style={{ background: 'var(--bg3)', color: 'var(--text2)' }} onClick={() => setEditingCategory(null)}>Отмена</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
