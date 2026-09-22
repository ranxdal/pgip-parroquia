import { test, expect } from '@playwright/test';

test.describe('Módulo 2: Registro e Impresión de Actas', () => {

  test.beforeEach(async ({ page }) => {
    // Autenticación previa
    await page.goto('/login');
    await page.getByLabel('Correo Electrónico').fill('secretaria@parroquia.org');
    await page.getByLabel('Contraseña').fill('PGIP2026*Secure');
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('TC-AUTO-002: Registrar nueva acta de Bautismo', async ({ page }) => {
    // Navegar a módulo de actas
    await page.getByRole('link', { name: /Actas Sacramentales|Bautismos/i }).click();
    await page.getByRole('button', { name: /Nueva Acta/i }).click();

    // Llenar formulario de acta
    await page.getByLabel('Nombre del Bautizado').fill('Juan Carlos Pérez');
    await page.getByLabel('Fecha de Nacimiento').fill('2024-05-15');
    await page.getByLabel('Nombre del Padre').fill('Carlos Pérez');
    await page.getByLabel('Nombre de la Madre').fill('María Gómez');
    await page.getByLabel('Padrino').fill('Roberto Gómez');

    // Guardar
    await page.getByRole('button', { name: /Guardar Registro|Registrar/i }).click();

    // Notificación de éxito
    await expect(page.getByText(/Acta registrada exitosamente/i)).toBeVisible();
  });

});
