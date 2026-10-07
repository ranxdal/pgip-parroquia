const request = require('supertest');
const app = require('../../index');

let tokenParroco = '';
let tokenSecretaria = '';
let sesionCajaId = '';
let correlativoGenerado = '';
let qrFirma = '';

beforeAll(async () => {
    const res1 = await request(app)
        .post('/api/auth/login')
        .send({ usuario: 'parroco', contrasena: 'Admin2026*' });
    tokenParroco = res1.body.token;

    const res2 = await request(app)
        .post('/api/auth/login')
        .send({ usuario: 'secretaria', contrasena: 'Secretaria2026*' });
    tokenSecretaria = res2.body.token;
});

// ════════════════════════════════════════
// CN-03 — Registro de transacciones
// ════════════════════════════════════════
describe('CN-03 — Registro de transacciones de tesorería', () => {

    test('CN-03-01 — Apertura de caja con monto inicial válido', async () => {
        const res = await request(app)
            .post('/api/tesoreria/caja/abrir')
            .set('Authorization', `Bearer ${tokenParroco}`)
            .send({ monto_inicial: 500.00 });

        // Puede ser 201 (nueva caja) o 400 (ya existe una hoy)
        expect([201, 400]).toContain(res.statusCode);

        if (res.statusCode === 201) {
            expect(res.body.sesion).toBeDefined();
            expect(res.body.sesion.estado).toBe('abierta');
            sesionCajaId = res.body.sesion.id;
        }
    });

    test('CN-03-02 — No se puede abrir una segunda caja el mismo día', async () => {
        const res = await request(app)
            .post('/api/tesoreria/caja/abrir')
            .set('Authorization', `Bearer ${tokenParroco}`)
            .send({ monto_inicial: 100.00 });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBeDefined();
    });

    test('CN-03-03 — Balance del día retorna datos correctos', async () => {
        const res = await request(app)
            .get('/api/tesoreria/caja/balance')
            .set('Authorization', `Bearer ${tokenParroco}`);

        expect([200, 404]).toContain(res.statusCode);
        if (res.statusCode === 200) {
            expect(res.body.balance).toBeDefined();
            expect(res.body.balance.estado).toBeDefined();
        }
    });

    test('CN-03-04 — Secretaria puede ver el balance del día', async () => {
        const res = await request(app)
            .get('/api/tesoreria/caja/balance')
            .set('Authorization', `Bearer ${tokenSecretaria}`);

        expect([200, 404]).toContain(res.statusCode);
    });

    test('CN-03-05 — Sin token no se puede ver el balance', async () => {
        const res = await request(app)
            .get('/api/tesoreria/caja/balance');

        expect(res.statusCode).toBe(401);
    });

});

// ════════════════════════════════════════
// CN-04 — Transacciones y correlativos
// ════════════════════════════════════════
describe('CN-04 — Transacciones y generación de correlativos', () => {

    beforeAll(async () => {
        // Obtener sesión de caja activa
        const res = await request(app)
            .get('/api/tesoreria/caja/balance')
            .set('Authorization', `Bearer ${tokenParroco}`);

        if (res.statusCode === 200) {
            sesionCajaId = res.body.balance.id;
        }
    });

    test('CN-04-01 — Registrar transacción en efectivo genera correlativo PGIP', async () => {
        if (!sesionCajaId) return;

        const res = await request(app)
            .post('/api/tesoreria/transaccion')
            .set('Authorization', `Bearer ${tokenParroco}`)
            .send({
                sesion_caja_id: sesionCajaId,
                tipo: 'efectivo',
                monto: 75.00,
                descripcion: 'Prueba automatizada Hito 2 — Intención de misa'
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.transaccion.correlativo).toMatch(/^PGIP-\d{8}-\d{4}$/);
        expect(res.body.transaccion.qr_hash).toBeDefined();
        expect(res.body.qr).toContain('/api/tesoreria/verificar/');

        correlativoGenerado = res.body.transaccion.correlativo;
        qrFirma = res.body.qr.split('/verificar/')[1];
    });

    test('CN-04-02 — Correlativo tiene formato PGIP-YYYYMMDD-NNNN', async () => {
        if (!correlativoGenerado) return;

        const patron = /^PGIP-\d{8}-\d{4}$/;
        expect(patron.test(correlativoGenerado)).toBe(true);

        const partes = correlativoGenerado.split('-');
        expect(partes[0]).toBe('PGIP');
        expect(partes[1]).toHaveLength(8);
        expect(partes[2]).toHaveLength(4);
    });

    test('CN-04-03 — Transacción con monto cero es rechazada', async () => {
        if (!sesionCajaId) return;

        const res = await request(app)
            .post('/api/tesoreria/transaccion')
            .set('Authorization', `Bearer ${tokenParroco}`)
            .send({
                sesion_caja_id: sesionCajaId,
                tipo: 'efectivo',
                monto: 0,
                descripcion: 'Monto inválido'
            });

        expect([400, 500]).toContain(res.statusCode);
    });

    test('CN-04-04 — Transacción con monto negativo es rechazada', async () => {
        if (!sesionCajaId) return;

        const res = await request(app)
            .post('/api/tesoreria/transaccion')
            .set('Authorization', `Bearer ${tokenParroco}`)
            .send({
                sesion_caja_id: sesionCajaId,
                tipo: 'efectivo',
                monto: -50,
                descripcion: 'Monto negativo'
            });

        expect([400, 500]).toContain(res.statusCode);
    });

    test('CN-04-05 — Registrar transacción por transferencia también genera correlativo', async () => {
        if (!sesionCajaId) return;

        const res = await request(app)
            .post('/api/tesoreria/transaccion')
            .set('Authorization', `Bearer ${tokenParroco}`)
            .send({
                sesion_caja_id: sesionCajaId,
                tipo: 'transferencia',
                monto: 150.00,
                descripcion: 'Prueba transferencia Hito 2'
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.transaccion.correlativo).toMatch(/^PGIP-\d{8}-\d{4}$/);
        expect(res.body.transaccion.tipo).toBe('transferencia');
    });

});

// ════════════════════════════════════════
// CN-05 — Verificación QR
// ════════════════════════════════════════
describe('CN-05 — Verificación de autenticidad del código QR', () => {

    test('CN-05-01 — QR válido retorna datos del comprobante', async () => {
        if (!qrFirma) return;

        const res = await request(app)
            .get(`/api/tesoreria/verificar/${qrFirma}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.mensaje).toContain('válido');
        expect(res.body.comprobante).toBeDefined();
        expect(res.body.comprobante.correlativo).toMatch(/^PGIP-/);
    });

    test('CN-05-02 — QR falsificado es rechazado', async () => {
        const firmaFalsa = 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899';

        const res = await request(app)
            .get(`/api/tesoreria/verificar/${firmaFalsa}`);

        expect(res.statusCode).toBe(404);
    });

    test('CN-05-03 — QR con firma alterada es rechazado', async () => {
        if (!qrFirma) return;

        const firmaAlterada = qrFirma.slice(0, -4) + 'XXXX';

        const res = await request(app)
            .get(`/api/tesoreria/verificar/${firmaAlterada}`);

        expect(res.statusCode).toBe(404);
    });

    test('CN-05-04 — Verificación QR es accesible sin token', async () => {
        if (!qrFirma) return;

        const res = await request(app)
            .get(`/api/tesoreria/verificar/${qrFirma}`);

        // No debe requerir autenticación
        expect(res.statusCode).not.toBe(401);
        expect(res.statusCode).not.toBe(403);
    });

    test('CN-05-05 — Tiempo de verificación QR es menor a 500ms', async () => {
        if (!qrFirma) return;

        const inicio = Date.now();
        await request(app).get(`/api/tesoreria/verificar/${qrFirma}`);
        const duracion = Date.now() - inicio;

        expect(duracion).toBeLessThan(500);
    });

});

// ════════════════════════════════════════
// CB-04 — Integridad ACID
// ════════════════════════════════════════
describe('CB-04 — Integridad de datos y propiedades ACID', () => {

    test('CB-04-01 — Transacción sin sesion_caja_id es rechazada', async () => {
        const res = await request(app)
            .post('/api/tesoreria/transaccion')
            .set('Authorization', `Bearer ${tokenParroco}`)
            .send({
                tipo: 'efectivo',
                monto: 50.00,
                descripcion: 'Sin sesión'
            });

        expect([400, 500]).toContain(res.statusCode);
    });

    test('CB-04-02 — Transacción con sesion_caja_id inválido es rechazada', async () => {
        const res = await request(app)
            .post('/api/tesoreria/transaccion')
            .set('Authorization', `Bearer ${tokenParroco}`)
            .send({
                sesion_caja_id: '00000000-0000-0000-0000-000000000000',
                tipo: 'efectivo',
                monto: 50.00,
                descripcion: 'Sesión inválida'
            });

        expect([400, 500]).toContain(res.statusCode);
    });

    test('CN-04-03 — Transacción con monto cero es rechazada', async () => {
        if (!sesionCajaId) return;

        const res = await request(app)
            .post('/api/tesoreria/transaccion')
            .set('Authorization', `Bearer ${tokenParroco}`)
            .send({
                sesion_caja_id: sesionCajaId,
                tipo: 'efectivo',
                monto: 0,
                descripcion: 'Monto inválido'
            });

        expect([400, 500]).toContain(res.statusCode);
    });

    test('CN-04-04 — Transacción con monto negativo es rechazada', async () => {
        if (!sesionCajaId) return;

        const res = await request(app)
            .post('/api/tesoreria/transaccion')
            .set('Authorization', `Bearer ${tokenParroco}`)
            .send({
                sesion_caja_id: sesionCajaId,
                tipo: 'efectivo',
                monto: -50,
                descripcion: 'Monto negativo'
            });

        expect([400, 500]).toContain(res.statusCode);
    });

    test('CB-04-05 — Tiempo de respuesta del balance es menor a 500ms', async () => {
        const inicio = Date.now();
        await request(app)
            .get('/api/tesoreria/caja/balance')
            .set('Authorization', `Bearer ${tokenParroco}`);
        const duracion = Date.now() - inicio;

        expect(duracion).toBeLessThan(500);
    });

});