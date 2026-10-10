// server/tests/hito3/archivo.test.js
// HITO 3 — Archivo Histórico y OCR
// v2: Segunda ejecución — correcciones aplicadas, se esperan 15/15 APROBADO

const request = require('supertest');
const app = require('../../index');
const path = require('path');
const fs = require('fs');

// ── Mock del servicio OCR para no depender de Tesseract en pruebas ──
jest.mock('../../src/services/ocr.service', () => ({
    procesarFolio: jest.fn()
}));

const { procesarFolio } = require('../../src/services/ocr.service');

// ── Tokens de autenticación ──
let tokenAdmin = '';
let tokenOperador = '';
let folioIdCreado = '';

beforeAll(async () => {
    const resAdmin = await request(app)
        .post('/api/auth/login')
        .send({ usuario: 'parroco', contrasena: 'Admin2026*' });
    tokenAdmin = resAdmin.body.token;

    const resOp = await request(app)
        .post('/api/auth/login')
        .send({ usuario: 'secretaria', contrasena: 'Secretaria2026*' });
    tokenOperador = resOp.body.token;
});

// ── Imagen de prueba temporal ──
const imagenTestPath = path.join(__dirname, 'test_folio.jpg');

beforeAll(() => {
    const jpegMinimo = Buffer.from(
        'ffd8ffe000104a46494600010100000100010000ffdb004300' +
        '08060606070605080707070909080a0c140d0c0b0b0c1912' +
        '130f141d1a1f1e1d1a1c1c20242e2720222c231c1c283729' +
        '2c30313434341f27393d38323c2e333432' +
        'ffc0000b080001000101011100ffda00080101000003' +
        '01003f00ffd9',
        'hex'
    );
    fs.writeFileSync(imagenTestPath, jpegMinimo);
});

afterAll(() => {
    if (fs.existsSync(imagenTestPath)) {
        fs.unlinkSync(imagenTestPath);
    }
});

// ═══════════════════════════════════════════════════════
// CN-06 — Carga y validación de imágenes
// ═══════════════════════════════════════════════════════
describe('CN-06 — Carga y validación de imágenes', () => {

    test('CN-06-01 — Carga de imagen JPG válida devuelve HTTP 201', async () => {
        procesarFolio.mockResolvedValueOnce({
            texto: 'Parroquia San Agustín de Sumpango. Bautismo de Juan López. Fecha 15 de marzo de 2020.',
            confianza: 92,
            motor: 'tesseract'
        });

        const inicio = Date.now();
        const ts = Date.now();

        const res = await request(app)
            .post('/api/archivo/subir')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .attach('imagen', imagenTestPath)
            .field('numero_libro', `${ts}`)
            .field('numero_folio', `${ts}`)
            .field('numero_partida', `${ts}`)
            .field('tipo_sacramento', 'bautismo');

        const tiempo = Date.now() - inicio;
        console.log(`CN-06-01 — HTTP ${res.status} — ${tiempo} ms`);

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('folio');
        expect(res.body.folio).toHaveProperty('id');
        folioIdCreado = res.body.folio.id;
    });

    test('CN-06-02 — Carga sin imagen devuelve HTTP 400', async () => {
        const inicio = Date.now();
        const res = await request(app)
            .post('/api/archivo/subir')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send({});

        const tiempo = Date.now() - inicio;
        console.log(`CN-06-02 — HTTP ${res.status} — ${tiempo} ms`);

        expect(res.status).toBe(400);
    });

    test('CN-06-03 — Carga de formato no permitido (PDF) devuelve HTTP 400', async () => {
        const pdfPath = path.join(__dirname, 'test_fake.pdf');
        fs.writeFileSync(pdfPath, '%PDF-1.4 fake content');

        const inicio = Date.now();
        const res = await request(app)
            .post('/api/archivo/subir')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .attach('imagen', pdfPath);

        const tiempo = Date.now() - inicio;
        console.log(`CN-06-03 — HTTP ${res.status} — ${tiempo} ms`);

        fs.unlinkSync(pdfPath);

        // v2: middleware de errores Multer v2 aplicado — ahora sí devuelve 400
        expect(res.status).toBe(400);
    });

    test('CN-06-04 — Sin token devuelve HTTP 401', async () => {
        const inicio = Date.now();
        const res = await request(app)
            .post('/api/archivo/subir')
            .send({});

        const tiempo = Date.now() - inicio;
        console.log(`CN-06-04 — HTTP ${res.status} — ${tiempo} ms`);

        // v2: ECONNRESET resuelto al manejar correctamente los errores Multer
        expect(res.status).toBe(401);
    });

    test('CN-06-05 — Operador puede subir folios (no solo admin)', async () => {
        procesarFolio.mockResolvedValueOnce({
            texto: 'Texto de prueba con operador',
            confianza: 85,
            motor: 'tesseract'
        });

        const inicio = Date.now();
        const res = await request(app)
            .post('/api/archivo/subir')
            .set('Authorization', `Bearer ${tokenOperador}`)
            .attach('imagen', imagenTestPath)
            .field('tipo_sacramento', 'confirmacion');

        const tiempo = Date.now() - inicio;
        console.log(`CN-06-05 — HTTP ${res.status} — ${tiempo} ms`);

        expect(res.status).toBe(201);
    });

});

// ═══════════════════════════════════════════════════════
// CN-07 — Procesamiento OCR
// ═══════════════════════════════════════════════════════
describe('CN-07 — Procesamiento OCR y extracción de texto', () => {

    test('CN-07-01 — Resultado OCR incluye texto y confianza en respuesta', async () => {
        procesarFolio.mockResolvedValueOnce({
            texto: 'Confirmación de María García. Fecha 10 de junio de 2019.',
            confianza: 88,
            motor: 'tesseract'
        });

        const res = await request(app)
            .post('/api/archivo/subir')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .attach('imagen', imagenTestPath)
            .field('tipo_sacramento', 'confirmacion');

        console.log(`CN-07-01 — HTTP ${res.status} — ocr:`, res.body.ocr);

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('ocr');
        expect(res.body.ocr).toHaveProperty('confianza');
        expect(res.body.ocr.confianza).toBeGreaterThanOrEqual(0);
    });

    test('CN-07-02 — OCR con confianza alta reporta motor tesseract', async () => {
        procesarFolio.mockResolvedValueOnce({
            texto: 'Matrimonio de Carlos y Ana. Fecha 20 de diciembre de 2021.',
            confianza: 95,
            motor: 'tesseract'
        });

        const res = await request(app)
            .post('/api/archivo/subir')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .attach('imagen', imagenTestPath)
            .field('tipo_sacramento', 'matrimonio');

        console.log(`CN-07-02 — HTTP ${res.status} — motor: ${res.body.ocr?.motor}`);

        expect(res.status).toBe(201);
        expect(res.body.ocr.motor).toBe('tesseract');
    });

    test('CN-07-03 — Error del OCR devuelve HTTP 500 y limpia archivo', async () => {
        procesarFolio.mockRejectedValueOnce(new Error('Tesseract falló: imagen corrupta'));

        const res = await request(app)
            .post('/api/archivo/subir')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .attach('imagen', imagenTestPath)
            .field('tipo_sacramento', 'bautismo');

        console.log(`CN-07-03 — HTTP ${res.status}`);

        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty('error');
    });

    test('CN-07-04 — Respuesta incluye cantidad de caracteres extraídos', async () => {
        const textoLargo = 'En el libro de bautismos No. 6 Folio 75 Partida 120. ' +
            'De esta Parroquia consta que el día 14 de agosto del año 1995. ' +
            'Nombre: Carlos Felipe Santos Cubur. Padrinos: Edgar Vásquez Rucal.';

        procesarFolio.mockResolvedValueOnce({
            texto: textoLargo,
            confianza: 91,
            motor: 'tesseract'
        });

        const res = await request(app)
            .post('/api/archivo/subir')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .attach('imagen', imagenTestPath)
            .field('tipo_sacramento', 'bautismo');

        console.log(`CN-07-04 — caracteres: ${res.body.ocr?.caracteres_extraidos}`);

        expect(res.status).toBe(201);
        expect(res.body.ocr.caracteres_extraidos).toBe(textoLargo.length);
    });

    test('CN-07-05 — Folio queda indexado en BD con texto_extraido', async () => {
        if (!folioIdCreado) {
            console.warn('CN-07-05 — folioIdCreado vacío, saltando');
            return;
        }

        const res = await request(app)
            .get(`/api/archivo/${folioIdCreado}`)
            .set('Authorization', `Bearer ${tokenAdmin}`);

        console.log(`CN-07-05 — HTTP ${res.status} — texto: ${res.body.folio?.texto_extraido?.substring(0, 50)}`);

        expect(res.status).toBe(200);
        expect(res.body.folio).toHaveProperty('texto_extraido');
        expect(res.body.folio.texto_extraido.length).toBeGreaterThan(0);
    });

});

// ═══════════════════════════════════════════════════════
// CB-01 — Búsqueda e integridad
// ═══════════════════════════════════════════════════════
describe('CB-01 — Búsqueda full-text e integridad', () => {

    test('CB-01-01 — Búsqueda por término válido devuelve resultados', async () => {
        const inicio = Date.now();
        const res = await request(app)
            .get('/api/archivo/buscar')
            .query({ termino: 'bautismo' })
            .set('Authorization', `Bearer ${tokenAdmin}`);

        const tiempo = Date.now() - inicio;
        console.log(`CB-01-01 — HTTP ${res.status} — ${tiempo} ms — resultados: ${res.body.total}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('resultados');
        expect(Array.isArray(res.body.resultados)).toBe(true);
    });

    test('CB-01-02 — Búsqueda sin término devuelve HTTP 400', async () => {
        const inicio = Date.now();
        const res = await request(app)
            .get('/api/archivo/buscar')
            .set('Authorization', `Bearer ${tokenAdmin}`);

        const tiempo = Date.now() - inicio;
        console.log(`CB-01-02 — HTTP ${res.status} — ${tiempo} ms`);

        // v2: validación explícita en el controlador — ahora sí devuelve 400
        expect(res.status).toBe(400);
    });

    test('CB-01-03 — Búsqueda retorna fragmento resaltado (fragmento)', async () => {
        const res = await request(app)
            .get('/api/archivo/buscar')
            .query({ termino: 'bautismo' })
            .set('Authorization', `Bearer ${tokenAdmin}`);

        console.log(`CB-01-03 — fragmento: ${res.body.resultados?.[0]?.fragmento?.substring(0, 60)}`);

        expect(res.status).toBe(200);
        if (res.body.total > 0) {
            expect(res.body.resultados[0]).toHaveProperty('fragmento');
        }
    });

    test('CB-01-04 — Listar todos los folios devuelve arreglo', async () => {
        const inicio = Date.now();
        const res = await request(app)
            .get('/api/archivo')
            .set('Authorization', `Bearer ${tokenAdmin}`);

        const tiempo = Date.now() - inicio;
        console.log(`CB-01-04 — HTTP ${res.status} — ${tiempo} ms — total: ${res.body.total}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('folios');
        expect(Array.isArray(res.body.folios)).toBe(true);
    });

    test('CB-01-05 — Folio duplicado (mismo libro+folio+partida) devuelve HTTP 409', async () => {
        procesarFolio
            .mockResolvedValueOnce({ texto: 'Texto duplicado prueba', confianza: 90, motor: 'tesseract' })
            .mockResolvedValueOnce({ texto: 'Texto duplicado prueba', confianza: 90, motor: 'tesseract' });

        const tsDup = String(Date.now() + 1);
        const payload = { tipo_sacramento: 'bautismo', numero_libro: tsDup, numero_folio: tsDup, numero_partida: tsDup };

        const res1 = await request(app)
            .post('/api/archivo/subir')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .attach('imagen', imagenTestPath)
            .field(payload);

        const res2 = await request(app)
            .post('/api/archivo/subir')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .attach('imagen', imagenTestPath)
            .field(payload);

        console.log(`CB-01-05 — intento1: ${res1.status}, intento2: ${res2.status}`);

        // v2: verificación de duplicados aplicada — primer intento 201, segundo 409
        expect(res1.status).toBe(201);
        expect(res2.status).toBe(409);
    });

});