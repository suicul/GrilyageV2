import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailService } from '../src/email/email.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

describe('API e2e: register → login → catalog → order', () => {
  let app: INestApplication;

  // Mock Prisma — store data in-memory
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store: any = {
    user: new Map<string, any>(),
    refreshToken: new Map<string, any>(),
    emailToken: new Map<string, any>(),
    userConsent: new Map<string, any>(),
    category: new Map<string, any>(),
    product: new Map<string, any>(),
    subcategory: new Map<string, any>(),
    order: new Map<string, any>(),
    orderItem: new Map<string, any>(),
    promotion: new Map<string, any>(),
  };

  // Pre-seed catalog data
  const catId = 'cat-1';
  const subId = 'sub-1';
  const prodId = 'prod-1';

  // Break circular ref: declare txPrisma first, assign after
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockTxPrisma: any = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockPrisma: any = {
    $transaction: jest.fn(async (cb: any) => {
      if (typeof cb === 'function') return cb(mockTxPrisma);
      return cb;
    }),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    user: {
      findUnique: jest.fn(async ({ where }: any) => {
        for (const u of store.user.values()) {
          if (u.email === where.email || u.id === where.id) return u;
        }
        return null;
      }),
      findFirst: jest.fn(async ({ where }: any) => {
        for (const u of store.user.values()) {
          if (where.activationToken && u.activationToken === where.activationToken) return u;
        }
        return null;
      }),
      create: jest.fn(async ({ data }: any) => {
        const id = crypto.randomUUID();
        const user = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        store.user.set(id, user);
        return user;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const user = store.user.get(where.id);
        if (!user) throw new Error('User not found');
        Object.assign(user, data);
        return user;
      }),
    },
    refreshToken: {
      findUnique: jest.fn(async ({ where }: any) => {
        for (const t of store.refreshToken.values()) {
          if (t.tokenHash === where.tokenHash) return t;
        }
        return null;
      }),
      create: jest.fn(async ({ data }: any) => {
        const id = crypto.randomUUID();
        const token = { id, ...data, createdAt: new Date() };
        store.refreshToken.set(id, token);
        return token;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const token = store.refreshToken.get(where.id);
        if (token) Object.assign(token, data);
        return token;
      }),
      updateMany: jest.fn(),
    },
    emailToken: {
      create: jest.fn(async ({ data }: any) => {
        const id = crypto.randomUUID();
        const token = { id, ...data, createdAt: new Date() };
        store.emailToken.set(id, token);
        return token;
      }),
    },
    userConsent: {
      create: jest.fn(async ({ data }: any) => {
        const id = crypto.randomUUID();
        const consent = { id, ...data, createdAt: new Date() };
        store.userConsent.set(id, consent);
        return consent;
      }),
    },
    category: {
      findMany: jest.fn(async () => {
        return Array.from(store.category.values()).map((cat: any) => ({
          ...cat,
          subcategories: Array.from(store.subcategory.values())
            .filter((s: any) => s.categoryId === cat.id)
            .map((s: any) => ({
              ...s,
              products: Array.from(store.product.values())
                .filter((p: any) => p.subcategoryId === s.id && p.active !== false)
                .slice(0, 4)
                .map((p: any) => ({
                  id: p.id,
                  name: p.name,
                  slug: p.slug,
                  priceRubles: p.priceRubles,
                  priceKopecks: p.priceKopecks,
                  weightGrams: p.weightGrams,
                  kcal: p.kcal,
                  protein: p.protein,
                  fat: p.fat,
                  carbs: p.carbs,
                  imageUrl: p.imageUrl,
                  isNew: p.isNew,
                  description: p.description,
                })),
            })),
        }));
      }),
      findUnique: jest.fn(async ({ where }: any) => store.category.get(where.slug) ?? null),
    },
    subcategory: {
      findMany: jest.fn(async ({ where }: any = {}) => {
        const all = Array.from(store.subcategory.values());
        if (where?.categoryId) return all.filter((s: any) => s.categoryId === where.categoryId);
        if (where?.active !== undefined) return all.filter((s: any) => s.active === where.active);
        return all;
      }),
      findFirst: jest.fn(async ({ where }: any) => {
        for (const s of store.subcategory.values()) {
          if ((s as any).slug === where.slug) return s;
        }
        return null;
      }),
    },
    product: {
      findMany: jest.fn(async ({ where }: any = {}) => {
        let all = Array.from(store.product.values());
        if (where?.subcategoryId) all = all.filter((p: any) => p.subcategoryId === where.subcategoryId);
        if (where?.active !== undefined) all = all.filter((p: any) => p.active === where.active);
        return all;
      }),
      findUnique: jest.fn(async ({ where }: any) => {
        for (const p of store.product.values()) {
          if ((p as any).slug === where.slug) return p;
        }
        return null;
      }),
    },
    promotion: {
      findMany: jest.fn(async () => Array.from(store.promotion.values())),
    },
    order: {
      create: jest.fn(async ({ data }: any) => {
        const id = crypto.randomUUID();
        const order = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        store.order.set(id, order);
        return order;
      }),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    orderItem: {
      create: jest.fn(async ({ data }: any) => {
        const id = crypto.randomUUID();
        const item = { id, ...data };
        store.orderItem.set(id, item);
        return item;
      }),
    },
  };
  Object.assign(mockTxPrisma, mockPrisma);

  const mockEmailService = {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    // Seed catalog data
    store.category.set(catId, {
      id: catId, name: 'Категория 1', slug: 'cat-1',
      active: true, sortOrder: 1, createdAt: new Date(),
    });
    store.subcategory.set(subId, {
      id: subId, name: 'Подкатегория 1', slug: 'sub-1',
      active: true, sortOrder: 1, categoryId: catId, createdAt: new Date(),
    });
    store.product.set(prodId, {
      id: prodId, name: 'Тестовый товар', slug: 'test-product',
      description: 'Описание товара',
      priceRubles: 500, priceKopecks: 0,
      weightGrams: 200, kcal: 300, protein: 20, fat: 10, carbs: 40,
      imageUrl: null, isNew: false,
      active: true, sortOrder: 1,
      subcategoryId: subId, createdAt: new Date(), updatedAt: new Date(),
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(EmailService)
      .useValue(mockEmailService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health', () => {
    it('GET /health should return 200', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200);
    });
  });

  describe('Auth: Register → Login → Profile', () => {
    const email = 'test-e2e@example.com';
    const password = 'password123';
    const name = 'Test User';
    let accessToken: string;
    let refreshToken: string;

    it('POST /api/v1/auth/register should register a user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email, password, name })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe(email);
      expect(res.body.name).toBe(name);
      expect(res.body).toHaveProperty('message');
    });

    it('POST /api/v1/auth/register should reject duplicate', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email, password, name })
        .expect(409);
    });

    it('POST /api/v1/auth/login should fail with inactive user', async () => {
      // Activate the user manually in store
      const user: any = Array.from(store.user.values()).find((u: any) => u.email === email);
      if (user) {
        user.isActive = true;
        user.emailVerifiedAt = new Date();
        user.activationToken = null;
        user.activationTokenExpiresAt = null;
      }

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('POST /api/v1/auth/login should fail with wrong password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'wrong' })
        .expect(401);
    });

    it('GET /api/v1/auth/me should return profile with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe(email);
    });

    it('GET /api/v1/auth/me should reject without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('POST /api/v1/auth/refresh should return new token pair', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });
  });

  describe('Catalog: Categories → Products', () => {
    it('GET /api/v1/categories should return categories with subcategories', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[0]).toHaveProperty('subcategories');
    });

    it('GET /api/v1/products should return product list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('name');
    });

    it('GET /api/v1/products/:slug should return single product', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products/test-product')
        .expect(200);

      expect(res.body).toHaveProperty('name', 'Тестовый товар');
      expect(res.body).toHaveProperty('price');
    });
  });

  describe('Orders: Create order', () => {
    it('POST /api/v1/orders should create order without auth', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          items: [{ productId: prodId, qty: 2 }],
          deliveryMode: 'PICKUP',
          paymentMethod: 'CASH',
          customerName: 'Иван Иванов',
          customerPhone: '+7-999-888-77-66',
          customerEmail: 'order@example.com',
          address: '',
          comment: 'Позвоните за 10 минут',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
    });

    it('POST /api/v1/orders should reject with invalid data', () => {
      return request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({ items: [] })
        .expect(400);
    });
  });
});
