const request = require('supertest');
const app = require('../../index');

// ── Credenciales de prueba ──
const PARROCO = { usuario: 'parroco', contrasena: 'Admin2026*' };
const SECRETARIA = { usuario: 'secretaria', contrasena: 'Secretaria2026*' };

let tokenParroco = '';
let tokenSecretaria = '';

// ════════════════════════════════════════
// CN-01 — Autenticación
// ════════════════════════════════════════
describe('CN-01 — Autenticación de usuarios', () => {

    test('CN-01-01 — Login exitoso párroco devuelve HTTP 200 y token', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send(PARROCO);

        expect(res.statusCode).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.token.length).toBeGreaterThan(20);
        expect(res.body.usuario.rol).toBe('admin');

        tokenParroco = res.body.token;
    });

    test('CN-01-02 — Login exitoso secretaria devuelve HTTP 200 y token', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send(SECRETARIA);

        expect(res.statusCode).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.usuario.rol).toBe('operador');

        tokenSecretaria = res.body.token;
    });

    test('CN-01-03 — Token JWT tiene estructura válida (3 segmentos)', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send(PARROCO);

        const token = res.body.token;
        const segmentos = token.split('.');
        expect(segmentos).toHaveLength(3);

        // Verificar payload decodificable
        const payload = JSON.parse(
            Buffer.from(segmentos[1], 'base64').toString('utf8')
        );
        expect(payload.id).toBeDefined();
        expect(payload.rol).toBe('admin');
        expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
    });

    test('CN-01-04 — Login con contraseña incorrecta devuelve HTTP 401', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ usuario: 'parroco', contrasena: 'contraseña_incorrecta' });

        expect(res.statusCode).toBe(401);
        expect(res.body.token).toBeUndefined();
        expect(res.body.error).toBeDefined();
    });

    test('CN-01-05 — Login con usuario inexistente devuelve HTTP 401', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ usuario: 'usuario_falso', contrasena: '12345' });

        expect(res.statusCode).toBe(401);
        expect(res.body.token).toBeUndefined();
    });

});

// ════════════════════════════════════════
// CN-02 — Control de acceso RBAC
// ════════════════════════════════════════
describe('CN-02 — Control de acceso basado en roles (RBAC)', () => {

    beforeAll(async () => {
        // Obtener tokens frescos
        const res1 = await request(app).post('/api/auth/login').send(PARROCO);
        tokenParroco = res1.body.token;

        const res2 = await request(app).post('/api/auth/login').send(SECRETARIA);
        tokenSecretaria = res2.body.token;
    });

    test('CN-02-01 — Párroco accede al dashboard sin error', async () => {
        const res = await request(app)
            .get('/api/analytics/dashboard?periodo=mes')
            .set('Authorization', `Bearer ${tokenParroco}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.kpis).toBeDefined();
    });

    test('CN-02-02 — Secretaria no puede acceder al dashboard (solo admin)', async () => {
        const res = await request(app)
            .get('/api/analytics/dashboard?periodo=mes')
            .set('Authorization', `Bearer ${tokenSecretaria}`);

        expect(res.statusCode).toBe(403);
    });

    test('CN-02-03 — Petición sin token devuelve HTTP 401', async () => {
        const res = await request(app)
            .get('/api/analytics/dashboard?periodo=mes');

        expect(res.statusCode).toBe(401);
        expect(res.body.error).toContain('Token');
    });

    test('CN-02-04 — Token con firma alterada devuelve HTTP 403', async () => {
        const tokenFalsificado = tokenSecretaria.slice(0, -5) + 'XXXXX';

        const res = await request(app)
            .get('/api/analytics/dashboard?periodo=mes')
            .set('Authorization', `Bearer ${tokenFalsificado}`);

        expect(res.statusCode).toBe(403);
    });

    test('CN-02-05 — Ambos roles acceden a tesorería correctamente', async () => {
        const resParroco = await request(app)
            .get('/api/tesoreria/caja/balance')
            .set('Authorization', `Bearer ${tokenParroco}`);

        const resSecretaria = await request(app)
            .get('/api/tesoreria/caja/balance')
            .set('Authorization', `Bearer ${tokenSecretaria}`);

        // Ambos deben poder acceder (200) o recibir 404 si no hay caja
        expect([200, 404]).toContain(resParroco.statusCode);
        expect([200, 404]).toContain(resSecretaria.statusCode);
    });

});

// ════════════════════════════════════════
// CB-05 — Seguridad contra inyección SQL
// ════════════════════════════════════════
describe('CB-05 — Protección contra inyección SQL', () => {

    test('CB-05-01 — Inyección SQL clásica en login es rechazada', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ usuario: "' OR '1'='1' --", contrasena: "' OR '1'='1' --" });

        expect(res.statusCode).toBe(401);
        expect(res.body.token).toBeUndefined();
    });

    test('CB-05-02 — Payload destructivo en campo usuario es rechazado', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ usuario: "'; DROP TABLE pgip.usuario; --", contrasena: 'test' });

        expect(res.statusCode).toBe(401);
        expect(res.body.token).toBeUndefined();
    });

    test('CB-05-03 — UNION SELECT en búsqueda de feligreses es rechazado', async () => {
        const res1 = await request(app).post('/api/auth/login').send(PARROCO);
        const token = res1.body.token;

        const res = await request(app)
            .get("/api/sacramentos/feligres/buscar?termino=' UNION SELECT usuario, contrasena FROM pgip.usuario --")
            .set('Authorization', `Bearer ${token}`);

        // Debe responder sin datos sensibles
        expect(res.statusCode).toBe(200);
        if (res.body.resultados) {
            expect(res.body.resultados).toHaveLength(0);
        }
    });

});

// ════════════════════════════════════════
// CB-06 — Cabeceras de seguridad HTTP
// ════════════════════════════════════════
describe('CB-06 — Cabeceras de seguridad HTTP (Helmet)', () => {

    test('CB-06-01 — Respuesta incluye X-Content-Type-Options', async () => {
        const res = await request(app).get('/api/ping');
        expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    test('CB-06-02 — Respuesta incluye X-Frame-Options', async () => {
        const res = await request(app).get('/api/ping');
        expect(res.headers['x-frame-options']).toBeDefined();
    });

    test('CB-06-03 — Tiempo de respuesta del login es menor a 1000ms', async () => {
        const inicio = Date.now();
        await request(app).post('/api/auth/login').send(PARROCO);
        const duracion = Date.now() - inicio;
        expect(duracion).toBeLessThan(1000);
    });

});

module.exports = { getTokenParroco: () => tokenParroco };