import { test, expect } from '@playwright/test';

test.describe('Módulo 3: Finanzas y Cierre de Caja', () => {

  test('TC-AUTO-003: Registrar intención de misa y validar balance', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo Electrónico').fill('admin@parroquia.org');
    await page.getByLabel('Contraseña').fill('PGIP2026*Secure');
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click();

    await page.goto('/finanzas/caja');

    // Obtener balance inicial
    const balanceInicialText = await page.getByTestId('total-caja').innerText();
    const balanceInicial = parseFloat(balanceInicialText.replace('$', '').replace(',', ''));

    // Registrar estipendio de $15.00
    await page.getByRole('button', { name: /Nueva Intención|Ingreso/i }).click();
    await page.getByLabel('Monto').fill('15.00');
    await page.getByLabel('Concepto').fill('Intención de Misa de Difunto');
    await page.getByRole('button', { name: /Confirmar Ingreso/i }).click();

    // Verificar actualización de balance
    const nuevoBalanceEsperado = `$${(balanceInicial + 15.00).toFixed(2)}`;
    await expect(page.getByTestId('total-caja')).toHaveText(nuevoBalanceEsperado);
  });

});
