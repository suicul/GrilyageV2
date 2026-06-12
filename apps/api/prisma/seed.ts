import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Staff admin
  const hash = await bcrypt.hash('admin123', 12);
  await prisma.staffUser.upsert({
    where: { login: 'admin' },
    update: {},
    create: {
      login: 'admin',
      name: 'Администратор',
      passwordHash: hash,
      role: 'ADMIN',
      active: true,
    },
  });
  console.log('  ✓ Admin user created');

  // 2. Categories, subcategories, products
  const categories: Array<{
    name: string; slug: string; sortOrder: number;
    subs: Array<{
      name: string; slug: string; sortOrder: number;
      prods: Array<{
        name: string; slug: string; desc: string;
        price: number; w: number; kcal: number; p: number; f: number; c: number;
        isNew?: boolean;
      }>;
    }>;
  }> = [
    {
      name: 'Новинки', slug: 'novinki', sortOrder: 10,
      subs: [{
        name: 'Все новинки', slug: 'all', sortOrder: 10,
        prods: [
          { name: 'Паста с курицей', slug: 'pasta-s-kuricej', desc: 'Горячее блюдо', price: 41000, w: 290, kcal: 360, p: 21, f: 11, c: 34, isNew: true },
          { name: 'Пирог с мясом', slug: 'pirog-s-myasom', desc: 'Румяная выпечка', price: 42000, w: 320, kcal: 430, p: 18, f: 24, c: 35, isNew: true },
          { name: 'Торт медовый', slug: 'tort-medovyj-novinka', desc: 'Свежий торт дня', price: 98000, w: 980, kcal: 426, p: 6, f: 25, c: 46, isNew: true },
          { name: 'Ланч среды', slug: 'lanch-sredy-novinka', desc: 'Комплекс дня', price: 46000, w: 440, kcal: 488, p: 24, f: 16, c: 58, isNew: true },
        ],
      }],
    },
    {
      name: 'Кулинария', slug: 'kulinariya', sortOrder: 20,
      subs: [
        {
          name: 'Горячая кухня', slug: 'goryachaya-kuhnya', sortOrder: 10,
          prods: [
            { name: 'Курица с овощами', slug: 'kurica-s-ovoshhami', desc: 'Горячее блюдо', price: 39000, w: 280, kcal: 320, p: 24, f: 14, c: 18 },
            { name: 'Запечённое мясо', slug: 'zapechyonnoe-myaso', desc: 'Сытное блюдо', price: 45000, w: 300, kcal: 410, p: 28, f: 22, c: 16 },
            { name: 'Жаркое по-домашнему', slug: 'zharkoe-po-domashnemu', desc: 'Тёплое блюдо', price: 44000, w: 310, kcal: 398, p: 25, f: 19, c: 31 },
          ],
        },
        {
          name: 'Холодная кухня', slug: 'holodnaya-kuhnya', sortOrder: 20,
          prods: [
            { name: 'Салат с курицей', slug: 'salat-s-kuricej', desc: 'Холодная позиция', price: 28000, w: 180, kcal: 210, p: 15, f: 9, c: 16 },
            { name: 'Оливье домашний', slug: 'olive-domashnij', desc: 'Классический салат', price: 24000, w: 200, kcal: 260, p: 8, f: 16, c: 20 },
          ],
        },
        {
          name: 'Закуски', slug: 'zakuski', sortOrder: 30,
          prods: [
            { name: 'Брускетта с томатами', slug: 'brusketta-s-tomatami', desc: 'Лёгкая закуска', price: 21000, w: 140, kcal: 190, p: 5, f: 8, c: 24 },
            { name: 'Куриные наггетсы', slug: 'kurinye-naggetsy', desc: 'Хрустящая закуска', price: 26000, w: 170, kcal: 280, p: 14, f: 17, c: 18 },
          ],
        },
        {
          name: 'Полуфабрикаты', slug: 'polufabrikaty', sortOrder: 40,
          prods: [
            { name: 'Котлеты домашние', slug: 'kotlety-domashnie', desc: 'Полуфабрикат для дома', price: 39000, w: 500, kcal: 420, p: 23, f: 28, c: 12 },
            { name: 'Пельмени ручной лепки', slug: 'pelmeni-ruchnoj-lepki', desc: 'Замороженная позиция', price: 48000, w: 700, kcal: 340, p: 16, f: 10, c: 42 },
          ],
        },
        {
          name: 'Напитки', slug: 'napitki', sortOrder: 50,
          prods: [
            { name: 'Морс ягодный', slug: 'mors-yagodnyj', desc: 'Домашний напиток', price: 12000, w: 330, kcal: 90, p: 0, f: 0, c: 22 },
            { name: 'Лимонад цитрус', slug: 'limonad-citrus', desc: 'Освежающий напиток', price: 15000, w: 400, kcal: 110, p: 0, f: 0, c: 26 },
          ],
        },
      ],
    },
    {
      name: 'Пекарня', slug: 'pekarnya', sortOrder: 30,
      subs: [
        {
          name: 'Сдобные пироги', slug: 'sdobnye-pirogi', sortOrder: 10,
          prods: [
            { name: 'Пирог с вишней', slug: 'pirog-s-vishnej', desc: 'Сдобный пирог', price: 34000, w: 420, kcal: 360, p: 5, f: 14, c: 53 },
            { name: 'Пирог с яблоком', slug: 'pirog-s-yablokom', desc: 'Сдобный пирог', price: 32000, w: 420, kcal: 348, p: 4, f: 13, c: 52 },
          ],
        },
        {
          name: 'Слоёные пироги', slug: 'sloyonye-pirogi', sortOrder: 20,
          prods: [
            { name: 'Слоёный пирог с мясом', slug: 'sloyonyj-pirog-s-myasom', desc: 'Румяная выпечка', price: 42000, w: 320, kcal: 430, p: 18, f: 24, c: 35 },
          ],
        },
        {
          name: 'Пирожки', slug: 'pirozhki', sortOrder: 30,
          prods: [
            { name: 'Пирожок с картофелем', slug: 'pirozhok-s-kartofelem', desc: 'Домашняя выпечка', price: 12000, w: 90, kcal: 220, p: 4, f: 8, c: 32 },
            { name: 'Пирожок с капустой', slug: 'pirozhok-s-kapustoj', desc: 'Печь ежедневно', price: 12000, w: 92, kcal: 214, p: 4, f: 7, c: 31 },
          ],
        },
        {
          name: 'Слойка', slug: 'slojka', sortOrder: 40,
          prods: [
            { name: 'Слойка с вишней', slug: 'slojka-s-vishnej', desc: 'Свежая выпечка', price: 16000, w: 110, kcal: 290, p: 4, f: 14, c: 37 },
            { name: 'Слойка с сыром', slug: 'slojka-s-syrom', desc: 'Слоёная выпечка', price: 17000, w: 115, kcal: 305, p: 8, f: 15, c: 34 },
          ],
        },
        {
          name: 'Булочки', slug: 'bulochki', sortOrder: 50,
          prods: [
            { name: 'Булочка с корицей', slug: 'bulochka-s-koricej', desc: 'Сладкая выпечка', price: 14000, w: 95, kcal: 265, p: 5, f: 9, c: 41 },
          ],
        },
        {
          name: 'Хлеб', slug: 'hleb', sortOrder: 60,
          prods: [
            { name: 'Хлеб деревенский', slug: 'hleb-derevenskij', desc: 'Свежий хлеб', price: 9500, w: 380, kcal: 230, p: 7, f: 2, c: 44 },
            { name: 'Багет', slug: 'baget', desc: 'Хрустящая корочка', price: 11000, w: 280, kcal: 240, p: 8, f: 2, c: 47 },
          ],
        },
        {
          name: 'Тесто', slug: 'testo', sortOrder: 70,
          prods: [
            { name: 'Тесто дрожжевое', slug: 'testo-drozhzhevoe', desc: 'Для домашней выпечки', price: 16000, w: 500, kcal: 250, p: 7, f: 5, c: 42 },
          ],
        },
      ],
    },
    {
      name: 'Кондитерская', slug: 'konditerskaya', sortOrder: 40,
      subs: [
        {
          name: 'Торты', slug: 'torty', sortOrder: 10,
          prods: [
            { name: 'Торт медовый', slug: 'tort-medovyj', desc: 'Фирменный торт', price: 98000, w: 980, kcal: 426, p: 6, f: 25, c: 46 },
            { name: 'Торт шоколадный', slug: 'tort-shokoladnyj', desc: 'Насыщенный шоколад', price: 104000, w: 1000, kcal: 442, p: 7, f: 26, c: 48 },
          ],
        },
        {
          name: 'Пирожные', slug: 'pirozhnye', sortOrder: 20,
          prods: [
            { name: 'Эклер', slug: 'ekler', desc: 'Заварное пирожное', price: 17000, w: 90, kcal: 280, p: 5, f: 16, c: 29 },
            { name: 'Пирожное картошка', slug: 'pirozhnoe-kartoshka', desc: 'Классический десерт', price: 15000, w: 85, kcal: 265, p: 4, f: 13, c: 30 },
          ],
        },
        {
          name: 'Печенье', slug: 'pechene', sortOrder: 30,
          prods: [
            { name: 'Печенье овсяное', slug: 'pechene-ovsyanoe', desc: 'Домашнее печенье', price: 12000, w: 120, kcal: 240, p: 5, f: 8, c: 36 },
            { name: 'Печенье с шоколадом', slug: 'pechene-s-shokoladom', desc: 'Хрустящее печенье', price: 14000, w: 120, kcal: 290, p: 4, f: 12, c: 39 },
          ],
        },
        {
          name: 'Десерты', slug: 'deserty', sortOrder: 40,
          prods: [
            { name: 'Чизкейк', slug: 'chizkejk', desc: 'Нежный десерт', price: 28000, w: 140, kcal: 330, p: 6, f: 20, c: 31 },
            { name: 'Макарон', slug: 'makaron', desc: 'Французский десерт', price: 16000, w: 70, kcal: 240, p: 4, f: 10, c: 33 },
            { name: 'Тарталетка с ягодами', slug: 'tartaletka-s-yagodami', desc: 'Ягодный десерт', price: 22000, w: 115, kcal: 265, p: 3, f: 12, c: 35 },
          ],
        },
      ],
    },
    {
      name: 'Бизнес-ланч', slug: 'biznes-lanch', sortOrder: 50,
      subs: [
        { name: 'Понедельник', slug: 'monday', sortOrder: 10, prods: [{ name: 'Ланч понедельника', slug: 'lanch-ponedelnika', desc: 'Суп, горячее и напиток', price: 42000, w: 430, kcal: 450, p: 22, f: 14, c: 58 }] },
        { name: 'Вторник', slug: 'tuesday', sortOrder: 20, prods: [{ name: 'Ланч вторника', slug: 'lanch-vtornika', desc: 'Салат, горячее и гарнир', price: 43000, w: 430, kcal: 458, p: 23, f: 14, c: 59 }] },
        { name: 'Среда', slug: 'wednesday', sortOrder: 30, prods: [{ name: 'Ланч среды', slug: 'lanch-sredy', desc: 'Комплекс дня', price: 46000, w: 440, kcal: 488, p: 24, f: 16, c: 58 }] },
        { name: 'Четверг', slug: 'thursday', sortOrder: 40, prods: [{ name: 'Ланч четверга', slug: 'lanch-chetverga', desc: 'Полный обед', price: 47000, w: 450, kcal: 500, p: 25, f: 17, c: 60 }] },
        { name: 'Пятница', slug: 'friday', sortOrder: 50, prods: [{ name: 'Ланч пятницы', slug: 'lanch-pyatnicy', desc: 'Горячее + салат', price: 45000, w: 430, kcal: 470, p: 23, f: 15, c: 59 }] },
        { name: 'Суббота', slug: 'saturday', sortOrder: 60, prods: [{ name: 'Ланч субботы', slug: 'lanch-subboty', desc: 'Сет выходного дня', price: 48000, w: 450, kcal: 510, p: 25, f: 18, c: 61 }] },
        { name: 'Воскресенье', slug: 'sunday', sortOrder: 70, prods: [{ name: 'Ланч воскресенья', slug: 'lanch-voskresenya', desc: 'Семейный обед', price: 49000, w: 460, kcal: 520, p: 26, f: 18, c: 63 }] },
      ],
    },
  ];

  // Clear existing data to avoid conflicts on re-seed
  await prisma.product.deleteMany();
  await prisma.subcategory.deleteMany();
  await prisma.category.deleteMany();

  for (const cat of categories) {
    const cc = await prisma.category.create({
      data: { name: cat.name, slug: cat.slug, sortOrder: cat.sortOrder },
    });
    console.log(`  ✓ Category: ${cat.name}`);

    for (const sub of cat.subs) {
      const cs = await prisma.subcategory.create({
        data: {
          categoryId: cc.id,
          name: sub.name,
          slug: sub.slug,
          sortOrder: sub.sortOrder,
        },
      });

      for (const p of sub.prods) {
        await prisma.product.create({
          data: {
            subcategoryId: cs.id,
            name: p.name,
            slug: p.slug,
            description: p.desc,
            price: p.price,
            weightGrams: p.w,
            kcal: p.kcal,
            protein: p.p,
            fat: p.f,
            carbs: p.c,
            isNew: p.isNew ?? false,
            sortOrder: 10,
          },
        });
      }
    }
  }

  // 3. Promotions
  await prisma.promotion.createMany({
    data: [
      {
        title: 'Скидка на первый заказ',
        description: 'При первом заказе через сайт — скидка 10%',
        discountPercent: 10,
        startsAt: new Date(),
        endsAt: new Date('2026-12-31T23:59:59Z'),
        active: true,
        productIds: [],
      },
      {
        title: 'Бесплатная доставка',
        description: 'Бесплатная доставка при заказе от 1500 ₽',
        startsAt: new Date(),
        endsAt: new Date('2026-12-31T23:59:59Z'),
        active: true,
        productIds: [],
      },
    ],
  });
  console.log('  ✓ Promotions created');

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
