import { test, expect } from '@playwright/test';

test.describe('Módulo 1: Autenticación y Control de Acceso (PGIP)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('TC-AUTO-001A: Inicio de sesión exitoso como Administrador', async ({ page }) => {
    // Ingresar credenciales
    await page.getByLabel('Correo Electrónico').fill('admin@parroquia.org');
    await page.getByLabel('Contraseña').fill('PGIP2026*Secure');
    await page.getByRole('button', { name: /Iniciar Sesión|Ingresar/i }).click();

    // Verificaciones
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: /Gestión Parroquial|Dashboard/i })).toBeVisible();

    // Validar token de sesión en LocalStorage
    const token = await page.evaluate(() => localStorage.getItem('pgip_token'));
    expect(token).toBeTruthy();
  });

  test('TC-AUTO-001B: Denegar acceso con credenciales incorrectas', async ({ page }) => {
    await page.getByLabel('Correo Electrónico').fill('admin@parroquia.org');
    await page.getByLabel('Contraseña').fill('ClaveErronea123');
    await page.getByRole('button', { name: /Iniciar Sesión|Ingresar/i }).click();

    // Verificar mensaje de error de alerta
    const alertMessage = page.getByRole('alert');
    await expect(alertMessage).toBeVisible();
    await expect(alertMessage).toContainText(/Credenciales inválidas|Usuario o contraseña incorrectos/i);
    
    // Asegurar que no navegó
    await expect(page).toHaveURL('/login');
  });

});