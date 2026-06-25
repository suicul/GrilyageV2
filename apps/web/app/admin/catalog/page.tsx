'use client';

import { useEffect, useState, useCallback } from 'react';
import ProductEditModal from '@/components/admin/catalog/ProductEditModal';
import CategoryEditModal from '@/components/admin/catalog/CategoryEditModal';
import ProductsTab from '@/components/admin/catalog/ProductsTab';
import CategoriesTab from '@/components/admin/catalog/CategoriesTab';

type Category = { id: string; name: string; slug: string; sortOrder: number; active: boolean; description?: string; imageUrl?: string };
type Subcategory = { id: string; name: string; slug: string; categoryId: string; category?: { id: string; name: string; slug: string } };
type Product = {
  id: string; name: string; slug: string; description: string;
  priceRubles: number; priceKopecks: number; price: number;
  weightGrams: number; active: boolean; isNew: boolean;
  imageUrl?: string; kcal: number; protein: number; fat: number; carbs: number;
  subcategoryId: string; subcategory?: Subcategory;
};

type Tab = 'products' | 'categories';

const EMPTY_PRODUCT: Partial<Product> = {
  name: '', description: '', priceRubles: 0, priceKopecks: 0, price: 0,
  weightGrams: 0, kcal: 0, protein: 0, fat: 0, carbs: 0,
  subcategoryId: '', imageUrl: '', isNew: false, active: true,
};

const PRODUCTS_PAGE_SIZE = 50;

export default function AdminCatalogPage() {
  const [tab, setTab] = useState<Tab>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [productPage, setProductPage] = useState(0);
  const [productTotal, setProductTotal] = useState(0);

  // Product editor
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [saving, setSaving] = useState(false);

  // Category editor
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [catSaving, setCatSaving] = useState(false);
  const [subSaving, setSubSaving] = useState(false);

  const jsonHeaders: Record<string, string> = { 'Content-Type': 'application/json' };

  const fetchData = useCallback(async (pageNum = 0) => {
    setLoading(true);
    setFetchError('');
    const errors: string[] = [];
    await Promise.all([
      fetch(`/api/v1/staff/products?skip=${pageNum * PRODUCTS_PAGE_SIZE}&take=${PRODUCTS_PAGE_SIZE}`)
        .then((r) => { if (!r.ok) throw new Error(`Товары: ${r.status}`); return r.json(); })
        .then((data) => { setProducts(data.data ?? []); setProductTotal(data.total ?? 0); })
        .catch((e) => { setProducts([]); errors.push(e.message); }),
      fetch('/api/v1/categories')
        .then((r) => { if (!r.ok) throw new Error(`Категории: ${r.status}`); return r.json(); })
        .then((data) => {
          const cats = data.categories || data || [];
          setCategories(Array.isArray(cats) ? cats.filter((c: any) => c.id) : []);
        }).catch((e) => { setCategories([]); errors.push(e.message); }),
      fetch('/api/v1/subcategories')
        .then((r) => { if (!r.ok) throw new Error(`Подкатегории: ${r.status}`); return r.json(); })
        .then((data) => setSubcategories(Array.isArray(data) ? data : []))
        .catch((e) => { setSubcategories([]); errors.push(e.message); }),
    ]);
    setLoading(false);
    if (errors.length) setFetchError(errors.join('; '));
  }, []);

  useEffect(() => { fetchData(0); }, [fetchData]);

  const productTotalPages = Math.ceil(productTotal / PRODUCTS_PAGE_SIZE);

  const goToProductPage = (p: number) => {
    if (p < 0 || p >= productTotalPages) return;
    setProductPage(p);
    fetchData(p);
  };

  /* ─── Product CRUD ─── */
  const saveProduct = async () => {
    if (!editingProduct || !editingProduct.name?.trim()) return alert('Введите название');
    setSaving(true);
    try {
      const body = { ...editingProduct };
      delete (body as any).id;
      delete (body as any).price;
      if (body.imageUrl && body.imageUrl.startsWith('blob:')) delete body.imageUrl;
      const isNew = !editingProduct.id;
      const url = isNew ? '/api/v1/staff/products' : `/api/v1/staff/products/${editingProduct.id}`;
      const res = await fetch(url, { method: isNew ? 'POST' : 'PATCH', headers: jsonHeaders, body: JSON.stringify(body) });
      if (res.ok) { setEditingProduct(null); fetchData(); }
      else { const err = await res.json().catch(() => ({ message: 'Ошибка' })); alert(err.message); }
    } catch { alert('Ошибка сети'); }
    setSaving(false);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Удалить товар?')) return;
    const res = await fetch(`/api/v1/staff/products/${id}`, { method: 'DELETE' });
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
      const res = await fetch(url, { method: isNew ? 'POST' : 'PATCH', headers: jsonHeaders, body: JSON.stringify(body) });
      if (res.ok) { setEditingCategory(null); fetchData(); }
      else { const err = await res.json().catch(() => ({ message: 'Ошибка' })); alert(err.message); }
    } catch { alert('Ошибка сети'); }
    setCatSaving(false);
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Удалить категорию и все её товары?')) return;
    const res = await fetch(`/api/v1/staff/categories/${id}`, { method: 'DELETE' });
    if (res.ok) fetchData(); else alert('Ошибка удаления');
  };

  const addSubcategory = async (name: string) => {
    if (!editingCategory?.id) return;
    setSubSaving(true);
    try {
      const slug = name.toLowerCase().replace(/[^а-яёa-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const res = await fetch(`/api/v1/staff/categories/${editingCategory.id}/subcategories`, {
        method: 'POST', headers: jsonHeaders, body: JSON.stringify({ name, slug }),
      });
      if (res.ok) fetchData();
      else { const err = await res.json().catch(() => ({ message: 'Ошибка' })); alert(err.message); }
    } catch { alert('Ошибка сети'); }
    setSubSaving(false);
  };

  const deleteSubcategory = async (id: string) => {
    if (!confirm('Удалить подкатегорию?')) return;
    const res = await fetch(`/api/v1/staff/subcategories/${id}`, { method: 'DELETE' });
    if (res.ok) fetchData(); else alert('Ошибка удаления');
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
          {fetchError && (
            <div style={{ background: 'rgba(255,70,70,.12)', border: '1px solid rgba(255,70,70,.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: '#ff6b6b', fontSize: 13 }}>
              Ошибка загрузки: {fetchError}. Проверьте, запущен ли сервер и БД.
            </div>
          )}

          {tab === 'products' && (
            <>
              <ProductsTab
                products={products}
                subcategories={subcategories}
                onAdd={() => { setEditingProduct({ ...EMPTY_PRODUCT }); setSelectedCategoryId(''); }}
                onEdit={(product) => { setEditingProduct(product); setSelectedCategoryId(subcategories.find((s) => s.id === product.subcategoryId)?.categoryId || ''); }}
                onDelete={deleteProduct}
              />
              {productTotalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
                  <button className="admin-btn admin-btn-sm" disabled={productPage === 0} onClick={() => goToProductPage(productPage - 1)}>
                    ← Назад
                  </button>
                  {Array.from({ length: productTotalPages }, (_, i) => (
                    <button
                      key={i}
                      className={`admin-btn admin-btn-sm ${productPage === i ? 'admin-btn-active' : ''}`}
                      onClick={() => goToProductPage(i)}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button className="admin-btn admin-btn-sm" disabled={productPage >= productTotalPages - 1} onClick={() => goToProductPage(productPage + 1)}>
                    Вперед →
                  </button>
                </div>
              )}
            </>
          )}

          {tab === 'categories' && (
            <CategoriesTab
              categories={categories}
              onAdd={() => setEditingCategory({ name: '', sortOrder: 0, active: true })}
              onEdit={setEditingCategory}
              onDelete={deleteCategory}
            />
          )}
        </>
      )}

      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          categories={categories}
          subcategories={subcategories}
          selectedCategoryId={selectedCategoryId}
          saving={saving}
          onClose={() => setEditingProduct(null)}
          onChange={setEditingProduct}
          onCategoryChange={(catId) => {
            setSelectedCategoryId(catId);
            const firstSub = subcategories.find((s) => s.categoryId === catId);
            setEditingProduct((prev) => prev ? { ...prev, subcategoryId: firstSub?.id || '' } : null);
          }}
          onSave={saveProduct}
        />
      )}

      {editingCategory && (
        <CategoryEditModal
          category={editingCategory}
          subcategories={subcategories}
          saving={catSaving}
          subSaving={subSaving}
          onClose={() => setEditingCategory(null)}
          onChange={setEditingCategory}
          onSave={saveCategory}
          onAddSubcategory={addSubcategory}
          onDeleteSubcategory={deleteSubcategory}
        />
      )}
    </div>
  );
}
