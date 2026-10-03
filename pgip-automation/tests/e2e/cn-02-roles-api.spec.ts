import { test, expect, request, APIRequestContext } from '@playwright/test';

const API_URL = process.env.API_URL!;
const LOGIN = process.env.API_LOGIN_PATH || '/api/auth/login';
const RUTA_SOLO_ADMIN = '/api/analytics/dashboard';

let api: APIRequestContext;
let tokenAdmin: string;
let rolAdmin: string;
let tokenOperador: string;
let rolOperador: string;

async function login(usuario: string, contrasena: string) {
  const res = await api.post(LOGIN, { data: { usuario, contrasena } });
  expect(res.status(), `Login de ${usuario}`).toBe(200);
  const body = await res.json();
  return { token: body.token as string, rol: body.usuario.rol as string };
}

test.describe('CN-02 Restricción de roles RBAC (API)', () => {
  test.beforeAll(async () => {
    api = await request.newContext({ baseURL: API_URL });
    await api.get('/', { timeout: 60000 }).catch(() => {});
    const a = await login(process.env.PARROCO_USER!, process.env.PARROCO_PASS!);
    const o = await login(process.env.SECRETARIO_USER!, process.env.SECRETARIO_PASS!);
    tokenAdmin = a.token;
    rolAdmin = a.rol;
    tokenOperador = o.token;
    rolOperador = o.rol;
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test('CN-02-03 API de analítica rechaza al secretario', async () => {
    const res = await api.get(RUTA_SOLO_ADMIN, {
      headers: { Authorization: `Bearer ${tokenOperador}` },
    });
    expect(res.status()).toBe(403);
  });

  test('CN-02-04 Contraste de permisos: párroco vs secretario', async () => {
    // Precondición: los usuarios de prueba tienen los roles esperados
    expect(rolAdmin).toBe('admin');
    expect(rolOperador).toBe('operador');

    const conAdmin = await api.get(RUTA_SOLO_ADMIN, {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    expect(conAdmin.status(), 'Párroco (admin)').toBe(200);

    const conOperador = await api.get(RUTA_SOLO_ADMIN, {
      headers: { Authorization: `Bearer ${tokenOperador}` },
    });
    expect(conOperador.status(), 'Secretario (operador)').toBe(403);
  });

  test('CN-02-05 Token con rol alterado es rechazado', async () => {
    const [cabecera, payload, firma] = tokenOperador.split('.');
    const datos = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    datos.rol = 'admin'; // elevación de privilegios sin volver a firmar
    const payloadAlterado = Buffer.from(JSON.stringify(datos)).toString('base64url');
    const tokenAlterado = `${cabecera}.${payloadAlterado}.${firma}`;

    const res = await api.get(RUTA_SOLO_ADMIN, {
      headers: { Authorization: `Bearer ${tokenAlterado}` },
    });
    expect(res.status()).toBe(401);
  });
});