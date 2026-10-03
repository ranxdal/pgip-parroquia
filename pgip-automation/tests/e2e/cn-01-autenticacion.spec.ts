import { test, expect, Page } from '@playwright/test';

const USER = process.env.PARROCO_USER!;
const PASS = process.env.PARROCO_PASS!;

async function iniciarSesion(page: Page) {
  await page.getByPlaceholder('Ingrese su usuario').fill(USER);
  await page.getByPlaceholder('Ingrese su contraseña').fill(PASS);
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30000 });
}

async function hayJwt(page: Page) {
  return page.evaluate(() => {
    const jwt = /^[\w-]+\.[\w-]+\.[\w-]+$/;
    return [localStorage, sessionStorage].some((almacen) =>
      Object.keys(almacen).some((k) => jwt.test(almacen.getItem(k) ?? ''))
    );
  });
}

test.describe('CN-01 Autenticación con credenciales válidas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByPlaceholder('Ingrese su usuario')).toBeVisible();
  });

  test('CN-01-01 Login exitoso desde la interfaz (párroco)', async ({ page }) => {
    await iniciarSesion(page);
    expect(await hayJwt(page)).toBe(true);
  });

  test('CN-01-04 Persistencia de sesión al recargar la página', async ({ page }) => {
    await iniciarSesion(page);
    const urlAntes = page.url();

    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(page).not.toHaveURL(/\/login/);
    expect(page.url()).toBe(urlAntes);
    expect(await hayJwt(page)).toBe(true);
  });
});