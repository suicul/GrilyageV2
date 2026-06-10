export type Category = {
  title: string;
  image: string;
};

export type Product = {
  category: string;
  name: string;
  price: number;
  weight: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  desc: string;
  image: string;
  isNew?: boolean;
};

export const categories: Category[] = [
  {
    title: 'Новинки',
    image: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=300&q=80',
  },
  {
    title: 'Кулинария',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
  },
  {
    title: 'Пекарня',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&q=80',
  },
  {
    title: 'Кондитерская',
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=300&q=80',
  },
  {
    title: 'Бизнес-ланч',
    image: 'https://images.unsplash.com/photo-1546069901-5ec6a79120b0?auto=format&fit=crop&w=300&q=80',
  },
];

export const products: Product[] = [
  { category: 'Кулинария', name: 'Курица с овощами', price: 39000, weight: '280 г', kcal: 320, protein: 24, fat: 14, carbs: 18, desc: 'Горячее блюдо', image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', isNew: true },
  { category: 'Кулинария', name: 'Запечённое мясо', price: 45000, weight: '300 г', kcal: 410, protein: 28, fat: 22, carbs: 16, desc: 'Сытное блюдо', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80' },
  { category: 'Кулинария', name: 'Котлета с пюре', price: 32000, weight: '260 г', kcal: 295, protein: 17, fat: 13, carbs: 27, desc: 'Домашнее блюдо', image: 'https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=900&q=80' },
  { category: 'Кулинария', name: 'Паста с курицей', price: 41000, weight: '290 г', kcal: 360, protein: 21, fat: 11, carbs: 34, desc: 'Горячее блюдо', image: 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=900&q=80', isNew: true },
  { category: 'Кулинария', name: 'Рыба с рисом', price: 43000, weight: '270 г', kcal: 300, protein: 23, fat: 9, carbs: 29, desc: 'Обеденное блюдо', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&q=80' },
  { category: 'Кулинария', name: 'Жаркое по-домашнему', price: 44000, weight: '310 г', kcal: 398, protein: 25, fat: 19, carbs: 31, desc: 'Тёплое блюдо', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=80' },
  { category: 'Пекарня', name: 'Слойка с вишней', price: 16000, weight: '110 г', kcal: 290, protein: 4, fat: 14, carbs: 37, desc: 'Свежая выпечка', image: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=900&q=80' },
  { category: 'Пекарня', name: 'Пирог с мясом', price: 42000, weight: '320 г', kcal: 430, protein: 18, fat: 24, carbs: 35, desc: 'Румяная выпечка', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80', isNew: true },
  { category: 'Пекарня', name: 'Булочка с корицей', price: 14000, weight: '95 г', kcal: 265, protein: 5, fat: 9, carbs: 41, desc: 'Сладкая выпечка', image: 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=900&q=80' },
  { category: 'Пекарня', name: 'Круассан', price: 18000, weight: '85 г', kcal: 240, protein: 6, fat: 12, carbs: 26, desc: 'Французская выпечка', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=900&q=80' },
  { category: 'Кондитерская', name: 'Эклер', price: 17000, weight: '90 г', kcal: 280, protein: 5, fat: 16, carbs: 29, desc: 'Заварное пирожное', image: 'https://images.unsplash.com/photo-1621303837174-89787a7d4729?auto=format&fit=crop&w=900&q=80' },
  { category: 'Кондитерская', name: 'Чизкейк', price: 28000, weight: '140 г', kcal: 330, protein: 6, fat: 20, carbs: 31, desc: 'Нежный десерт', image: 'https://images.unsplash.com/photo-1567171466295-4afa63d45416?auto=format&fit=crop&w=900&q=80' },
  { category: 'Кондитерская', name: 'Торт медовый', price: 98000, weight: '1200 г', kcal: 420, protein: 6, fat: 24, carbs: 45, desc: 'Домашний медовый торт', image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=900&q=80', isNew: true },
  { category: 'Кондитерская', name: 'Макарон', price: 16000, weight: '70 г', kcal: 240, protein: 4, fat: 10, carbs: 33, desc: 'Французский десерт', image: 'https://images.unsplash.com/photo-1558326567-98ae2405596b?auto=format&fit=crop&w=900&q=80' },
  { category: 'Бизнес-ланч', name: 'Ланч понедельника', price: 42000, weight: '450 г', kcal: 460, protein: 23, fat: 15, carbs: 56, desc: 'Суп + горячее + салат', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80' },
  { category: 'Бизнес-ланч', name: 'Ланч среды', price: 44000, weight: '450 г', kcal: 495, protein: 24, fat: 17, carbs: 61, desc: 'Комплексный обед', image: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=900&q=80', isNew: true },
  { category: 'Бизнес-ланч', name: 'Ланч воскресенья', price: 49000, weight: '450 г', kcal: 520, protein: 26, fat: 18, carbs: 63, desc: 'Полный обед выходного дня', image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=80' },
];

export function getCategoryProducts(category: string): Product[] {
  return category === 'Новинки' ? products.filter((product) => product.isNew) : products.filter((product) => product.category === category);
}
