import { test, expect } from '@playwright/test';

test.describe('Grilyage main flow', () => {
  test('guest browses menu, adds to cart, places order', async ({ page }) => {
    // Mock API routes so tests work without a running backend
    await page.route('**/api/v1/categories', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'cat-1',
            name: 'Кулинария',
            slug: 'culinary',
            imageUrl: null,
            sortOrder: 1,
            active: true,
            subcategories: [
              {
                id: 'sub-1',
                categoryId: 'cat-1',
                name: 'Горячее',
                slug: 'hot',
                sortOrder: 1,
                active: true,
                products: [
                  {
                    id: 'prod-1',
                    name: 'Котлета по-киевски',
                    slug: 'kotleta-po-kievski',
                    description: 'Сочная котлета с маслом',
                    priceRubles: 350,
                    priceKopecks: 0,
                    weightGrams: 250,
                    kcal: 450,
                    protein: 25,
                    fat: 30,
                    carbs: 15,
                    imageUrl: null,
                    isNew: false,
                    sortOrder: 1,
                    active: true,
                  },
                ],
              },
            ],
          },
        ]),
      }),
    );
    await page.route('**/api/v1/orders', (route) =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'order-1', number: 1 }),
      }),
    );

    await page.goto('/');

    // Verify page loads — h1 with brand name
    await expect(page.locator('h1')).toContainText('Грильяж');

    // Wait for mock data to render products
    await page.waitForSelector('.buy-btn', { timeout: 10000 });

    // Click first "В корзину" button (force to bypass hero animation instability)
    const buyBtn = page.locator('.buy-btn').first();
    await buyBtn.click({ force: true });

    // Cart drawer should open with one item
    await expect(page.locator('.cart.open')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.cart-item')).toHaveCount(1);

    // Close cart via overlay
    await page.locator('.overlay').click();
    await expect(page.locator('.cart.open')).not.toBeVisible();

    // Open cart again via cart button in header
    await page.locator('#cartOpenBtn').click();
    await expect(page.locator('.cart.open')).toBeVisible();

    // Proceed to checkout
    await page.locator('.summary button').filter({ hasText: 'Оформить заказ' }).click();

    // Fill checkout form
    await page.fill('input[placeholder="Как к вам обращаться"]', 'Тестовый пользователь');
    await page.fill('input[placeholder="+7 (___) ___-__-__"]', '+7 (999) 123-45-67');

    // Submit order
    await page.locator('button:has-text("Подтвердить заказ")').click();

    // After success, cart and checkout should close
    await expect(page.locator('.cart.open')).not.toBeVisible();
  });

  test('guest can browse categories', async ({ page }) => {
    // Mock API for categories
    await page.route('**/api/v1/categories', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'cat-1', name: 'Кулинария', slug: 'culinary',
            active: true, sortOrder: 1, imageUrl: null,
            subcategories: [],
          },
          {
            id: 'cat-2', name: 'Пекарня', slug: 'bakery',
            active: true, sortOrder: 2, imageUrl: null,
            subcategories: [],
          },
        ]),
      }),
    );

    await page.goto('/');

    // Wait for categories to render
    await page.waitForSelector('.categories .category', { timeout: 10000 });
    const categoryBtns = page.locator('.categories .category');
    const count = await categoryBtns.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Click second category (if enough exist)
    if (count >= 2) {
      await categoryBtns.nth(1).click();
      // Active class should switch
      await expect(categoryBtns.nth(1)).toHaveClass(/active/);
    }
  });

  test('user can open auth modal', async ({ page }) => {
    await page.goto('/');

    // Wait for page to be interactive
    await expect(page.locator('h1')).toContainText('Грильяж');

    // Click account button in header
    await page.locator('#accountOpenBtn').click();

    // Auth modal should appear
    await expect(page.locator('.auth-modal')).toBeVisible();

    // There should be 3 mode tabs
    const tabs = page.locator('.auth-mode-tab');
    await expect(tabs).toHaveCount(3);
    await expect(tabs.nth(0)).toContainText('Телефон');
    await expect(tabs.nth(1)).toContainText('Email');
    await expect(tabs.nth(2)).toContainText('Пароль');

    // Switch to "Пароль" tab
    await tabs.nth(2).click();
    await expect(tabs.nth(2)).toHaveClass(/active/);

    // Close modal via close button
    await page.locator('.auth-modal .close').click();
    await expect(page.locator('.auth-modal')).not.toBeVisible();
  });
});
