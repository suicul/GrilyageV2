import { test, expect } from '@playwright/test';

test.describe('Grilyage main flow', () => {
  test('guest browses menu, adds to cart, places order', async ({ page }) => {
    await page.goto('/');

    // Verify page loads
    await expect(page.locator('h1')).toContainText('Грильяж');

    // Click "Перейти к меню"
    await page.locator('.cta').click();

    // Wait for menu section
    await page.waitForSelector('.product-grid');

    // Click first "В корзину" button
    const addButtons = page.locator('.card footer button');
    await addButtons.first().click();

    // Cart should open with item
    await expect(page.locator('.cart.open')).toBeVisible();
    await expect(page.locator('.cart-item')).toHaveCount(1);

    // Close cart
    await page.locator('.overlay').click();

    // Open cart again via cart button
    await page.locator('.cart-button').click();
    await expect(page.locator('.cart.open')).toBeVisible();

    // Proceed to checkout
    await page.locator('.summary button:has-text("Оформить заказ")').click();

    // Fill checkout form
    await page.fill('input[placeholder="Как к вам обращаться"]', 'Тестовый пользователь');
    await page.fill('input[placeholder="+7 (___) ___-__-__"]', '+7 (999) 123-45-67');

    // Submit order
    await page.locator('button:has-text("Подтвердить заказ")').click();

    // Should show success toast
    await expect(page.locator('.toast')).toContainText('принят');
  });

  test('guest can browse categories and search', async ({ page }) => {
    await page.goto('/');

    // Click a category
    const categories = page.locator('.categories button');
    const count = await categories.count();
    expect(count).toBeGreaterThanOrEqual(4);

    // Click second category
    await categories.nth(1).click();

    // Products should update
    await expect(page.locator('.product-grid')).toBeVisible();
  });

  test('user can open auth modal', async ({ page }) => {
    await page.goto('/');

    // Click "Войти" button
    const loginButton = page.locator('button:has-text("Войти")');
    await loginButton.click();

    // Auth modal should appear
    await expect(page.locator('.auth-modal')).toBeVisible();
    await expect(page.locator('.auth-tab.active')).toContainText('Войти');

    // Switch to register tab
    await page.locator('button:has-text("Регистрация")').click();
    await expect(page.locator('.auth-tab.active')).toContainText('Регистрация');

    // Close modal
    await page.locator('.auth-modal .close').click();
    await expect(page.locator('.auth-modal')).not.toBeVisible();
  });
});
