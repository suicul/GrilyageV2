import MenuContentClient from '@/components/menu-content-client';

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

async function getCatalog() {
  try {
    const res = await fetch(`${API_INTERNAL_URL}/api/v1/categories`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch {
    return null;
  }
}

export default async function MenuPage() {
  const catalogApiData = await getCatalog();

  return <MenuContentClient catalogApiData={catalogApiData} />;
}
