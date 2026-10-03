import { test, expect, request, APIRequestContext } from '@playwright/test';

const API_URL = process.env.API_URL!;
const LOGIN = process.env.API_LOGIN_PATH || '/api/auth/login';
const SEC_USER = process.env.SECRETARIO_USER!;
const SEC_PASS = process.env.SECRETARIO_PASS!;
const PAR_USER = process.env.PARROCO_USER!;
const PAR_PASS = process.env.PARROCO_PASS!;

let api: APIRequestContext;

test.describe('CN-01 Autenticación con credenciales válidas (API)', () => {
  test.beforeAll(async () => {
    api = await request.newContext({ baseURL: API_URL });
    // Calentamiento: despierta el backend de Render para no medir el arranque en frío
    await api.get('/', { timeout: 60000 }).catch(() => {});
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test('CN-01-02 Login exitoso vía API (secretario)', async () => {
    const inicio = Date.now();
    const res = await api.post(LOGIN, {
      data: { usuario: SEC_USER, contrasena: SEC_PASS },
    });
    const ms = Date.now() - inicio;

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.token).toBe('string');
    expect(body.token.length).toBeGreaterThan(0);
    expect(body.usuario.usuario).toBe(SEC_USER);
    expect(body.usuario.rol).toBeTruthy();
    expect(ms, `Tiempo de respuesta: ${ms} ms`).toBeLessThan(1000);
  });

  test('CN-01-03 Estructura y claims del token JWT', async () => {
    const res = await api.post(LOGIN, {
      data: { usuario: PAR_USER, contrasena: PAR_PASS },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();

    const partes = body.token.split('.');
    expect(partes).toHaveLength(3);

    const decodificar = (p: string) =>
      JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    const cabecera = decodificar(partes[0]);
    const payload = decodificar(partes[1]);

    expect(cabecera.alg).toBeTruthy();
    expect(payload.id).toBeDefined();
    expect(payload.rol).toBe(body.usuario.rol);
    expect(typeof payload.iat).toBe('number');
    expect(typeof payload.exp).toBe('number');
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  test('CN-01-05 Rechazo de credenciales inválidas', async () => {
    const claveMala = await api.post(LOGIN, {
      data: { usuario: PAR_USER, contrasena: 'Incorrecta#1' },
    });
    expect(claveMala.status()).toBe(401);
    const cuerpoA = await claveMala.json();
    expect(cuerpoA.token).toBeUndefined();

    const usuarioFalso = await api.post(LOGIN, {
      data: { usuario: 'usuario_que_no_existe', contrasena: 'Incorrecta#1' },
    });
    expect(usuarioFalso.status()).toBe(401);
    const cuerpoB = await usuarioFalso.json();

    // El mensaje no debe revelar si falló el usuario o la contraseña
    expect(cuerpoA.error).toBe(cuerpoB.error);
  });
});