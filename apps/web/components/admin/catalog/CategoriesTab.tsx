'use client';

type Category = { id: string; name: string; slug: string; sortOrder: number; active: boolean; subcategories?: { name: string }[] };

interface CategoriesTabProps {
  categories: Category[];
  onEdit: (cat: Category) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export default function CategoriesTab({ categories, onEdit, onDelete, onAdd }: CategoriesTabProps) {
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <button className="admin-btn" onClick={onAdd}>+ Добавить категорию</button>
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
                {cat.subcategories?.map((s) => s.name).join(', ') || '—'}
              </td>
              <td><span style={{ color: cat.active ? '#4caf50' : '#888' }}>{cat.active ? 'Да' : 'Нет'}</span></td>
              <td>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="admin-btn admin-btn-sm" onClick={() => onEdit(cat)}>✎</button>
                  <button className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => onDelete(cat.id)}>✕</button>
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
  );
}
