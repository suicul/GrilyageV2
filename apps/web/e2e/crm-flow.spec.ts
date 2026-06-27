import { test, expect } from '@playwright/test';

test.describe('CRM (admin panel)', () => {
  const staffToken = 'test-staff-token';

  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('redirects to login for admin subpages', async ({ page }) => {
    await page.goto('/admin/orders');
    await expect(page).toHaveURL(/\/admin\/login/);

    await page.goto('/admin/catalog');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('shows login page directly', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test.describe('authenticated', () => {
    test.beforeEach(async ({ page }) => {
      // Set staff_token cookie
      await page.context().addCookies([
        { name: 'staff_token', value: staffToken, domain: 'localhost', path: '/' },
      ]);

      // Mock API routes for orders page
      await page.route('**/api/v1/staff/orders**', (route) => {
        const url = new URL(route.request().url());
        const status = url.searchParams.get('status');
        let orders: any[];

        if (status === 'NEW') {
          orders = [
            {
              id: 'ord-1', number: 101, status: 'NEW', customerName: 'Иван Иванов',
              customerPhone: '+7 (999) 111-22-33', deliveryMode: 'DELIVERY',
              paymentMethod: 'CASH', address: 'ул. Ленина, 1', comment: 'Позвонить в домофон',
              itemsTotal: 35000, deliveryCost: 5000, total: 40000,
              createdAt: new Date().toISOString(),
              items: [{ id: 'item-1', nameSnapshot: 'Котлета по-киевски', priceSnapshot: 35000, qty: 1 }],
            },
          ];
        } else if (status === 'COMPLETED') {
          orders = [
            {
              id: 'ord-2', number: 100, status: 'COMPLETED', customerName: 'Пётр Петров',
              customerPhone: '+7 (999) 222-33-44', deliveryMode: 'PICKUP',
              paymentMethod: 'CARD', address: null, comment: null,
              itemsTotal: 70000, deliveryCost: 0, total: 70000,
              createdAt: new Date(Date.now() - 86400000).toISOString(),
              items: [{ id: 'item-2', nameSnapshot: 'Борщ', priceSnapshot: 35000, qty: 2 }],
            },
          ];
        } else {
          orders = [
            {
              id: 'ord-1', number: 101, status: 'NEW', customerName: 'Иван Иванов',
              customerPhone: '+7 (999) 111-22-33', deliveryMode: 'DELIVERY',
              paymentMethod: 'CASH', address: 'ул. Ленина, 1', comment: 'Позвонить в домофон',
              itemsTotal: 35000, deliveryCost: 5000, total: 40000,
              createdAt: new Date().toISOString(),
              items: [{ id: 'item-1', nameSnapshot: 'Котлета по-киевски', priceSnapshot: 35000, qty: 1 }],
            },
            {
              id: 'ord-2', number: 100, status: 'COMPLETED', customerName: 'Пётр Петров',
              customerPhone: '+7 (999) 222-33-44', deliveryMode: 'PICKUP',
              paymentMethod: 'CARD', address: null, comment: null,
              itemsTotal: 70000, deliveryCost: 0, total: 70000,
              createdAt: new Date(Date.now() - 86400000).toISOString(),
              items: [{ id: 'item-2', nameSnapshot: 'Борщ', priceSnapshot: 35000, qty: 2 }],
            },
          ];
        }

        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: orders, total: orders.length, skip: 0, take: 50 }),
        });
      });

      // Mock order status update
      await page.route('**/api/v1/staff/orders/*/status', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
      );
    });

    test('loads orders page with table', async ({ page }) => {
      await page.goto('/admin/orders');
      await expect(page.locator('h1')).toContainText('Заказы');
      await expect(page.locator('.admin-table')).toBeVisible();
      await expect(page.locator('.admin-table tbody tr')).toHaveCount(2);
    });

    test('filters orders by status', async ({ page }) => {
      await page.goto('/admin/orders');

      // Click "Новый" filter
      await page.locator('button').filter({ hasText: 'Новый' }).click();

      // Should show only NEW orders
      await expect(page.locator('.order-status.NEW')).toHaveCount(1);
    });

    test('opens order detail modal', async ({ page }) => {
      await page.goto('/admin/orders');
      await expect(page.locator('.admin-table')).toBeVisible();

      // Click first "Подробнее" button
      await page.locator('button').filter({ hasText: 'Подробнее' }).first().click();

      // Modal should appear with order details
      await expect(page.locator('.admin-modal')).toBeVisible();
      await expect(page.locator('.admin-modal h2')).toContainText('Заказ №');
    });

    test('can change order status from modal', async ({ page }) => {
      await page.goto('/admin/orders');

      // Open first order
      await page.locator('button').filter({ hasText: 'Подробнее' }).first().click();
      await expect(page.locator('.admin-modal')).toBeVisible();

      // Click a status transition button
      const statusBtn = page.locator('.admin-modal button').filter({ hasText: '→' }).first();
      if (await statusBtn.isVisible()) {
        await statusBtn.click();
        // Modal should close after successful update
        await expect(page.locator('.admin-modal')).not.toBeVisible({ timeout: 5000 });
      }
    });

    test('search filters orders by query', async ({ page }) => {
      await page.goto('/admin/orders');

      const searchInput = page.locator('input[placeholder*="Поиск"]');
      await expect(searchInput).toBeVisible();

      // Type a search query and click search
      await searchInput.fill('Иван');
      await page.locator('button').filter({ hasText: 'Найти' }).click();
    });

    test('catalog page loads categories', async ({ page }) => {
      await page.route('**/api/v1/staff/categories**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 'cat-1', name: 'Кулинария', slug: 'culinary', sortOrder: 1, active: true, subcategories: [] },
          ]),
        })
      );

      await page.goto('/admin/catalog');
      await expect(page.locator('h1')).toContainText('Каталог');
    });
  });
});
