/**
 * HITO 4 — Módulo de Analítica y Dashboard
 * analytics.test.v1.js  — Ejecución inicial
 *
 * Resultado esperado: 15 APROBADOS, 2 FALLIDOS
 *   FALLIDO → AN-02-04: periodo inválido retorna el string "invalido" en vez de "mes"
 *   FALLIDO → AN-04-03: campo total no coincide con alertas.length (tipo duplicado)
 */

const request = require('supertest');
const app = require('../../index');

// ── Mock DB ───────────────────────────────────────────────────────────────────
jest.mock('../../src/services/db', () => {
    return {
        query: jest.fn(async (sql) => {
            const s = sql.replace(/\s+/g, ' ').trim().toUpperCase();

            if (s.includes('COALESCE(SUM(MONTO)')) {
                return { rows: [{ total: '1500.00', cantidad: '10' }] };
            }
            if (s.includes('ROUND(AVG(TOTAL_DIA)')) {
                return { rows: [{ promedio: '150.00' }] };
            }
            if (s.includes('ES_CATECUMENO = TRUE')) {
                return { rows: [{ total: '3' }] };
            }
            if (s.includes('FROM PGIP.SACRAMENTO') && s.includes('GROUP BY TIPO')) {
                return { rows: [
                    { tipo: 'bautismo', cantidad: '5' },
                    { tipo: 'matrimonio', cantidad: '2' }
                ]};
            }
            if (s.includes('EXTRACT(EPOCH') && s.includes('DATE_TRUNC')) {
                const base = Date.now() / 1000;
                return { rows: [
                    { x: String(base - 60 * 24 * 3600), y: '1200' },
                    { x: String(base - 30 * 24 * 3600), y: '1400' },
                    { x: String(base),                   y: '1500' }
                ]};
            }
            if (s.includes('TO_CHAR') && s.includes('DATE_TRUNC')) {
                return { rows: [
                    { mes: '2026-05', total_ingresos: '1100', transacciones: '8' },
                    { mes: '2026-06', total_ingresos: '1250', transacciones: '9' },
                    { mes: '2026-07', total_ingresos: '1300', transacciones: '10' },
                    { mes: '2026-08', total_ingresos: '1350', transacciones: '11' },
                    { mes: '2026-09', total_ingresos: '1400', transacciones: '12' },
                    { mes: '2026-10', total_ingresos: '1500', transacciones: '10' }
                ]};
            }
            // Alertas — sin ingresos hoy: hay transacciones → no genera alerta
            if (s.includes('DATE(CREATED_AT) = CURRENT_DATE') && s.includes('PGIP.TRANSACCION')) {
                return { rows: [{ count: '2' }] };
            }
            // Alertas — caja: NO abierta hoy → genera alerta tipo "sin_ingresos" (BUG: tipo duplicado)
            if (s.includes('PGIP.SESION_CAJA')) {
                return { rows: [{ count: '0' }] };
            }
            // Catecúmenos pendientes → genera alerta
            if (s.includes('ES_CATECUMENO = TRUE') && s.includes('PGIP.FELIGRES')) {
                return { rows: [{ count: '2' }] };
            }
            if (s.includes('PGIP.SACRAMENTO S') && s.includes('NOT EXISTS')) {
                return { rows: [] };
            }
            return { rows: [] };
        })
    };
});

// ── Mock auth middleware ──────────────────────────────────────────────────────
let mockRolActual = 'admin';

jest.mock('../../src/middleware/auth.middleware', () => ({
    verificarToken: (req, res, next) => {
        const auth = req.headers['authorization'];
        if (!auth || !auth.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }
        req.usuario = { id: 1, rol: mockRolActual };
        next();
    },
    verificarRol: (roles) => (req, res, next) => {
        if (!req.usuario || !roles.includes(req.usuario.rol)) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }
        next();
    }
}));

const TOKEN_ADMIN    = 'Bearer token-admin-valido';
const TOKEN_OPERADOR = 'Bearer token-operador-valido';

// ═══════════════════════════════════════════════════════════════════════════════
// AN-01  GET /api/analytics/dashboard
// ═══════════════════════════════════════════════════════════════════════════════
describe('AN-01 — Dashboard ejecutivo', () => {

    test('AN-01-01 — Sin token devuelve HTTP 401', async () => {
        const res = await request(app).get('/api/analytics/dashboard');
        expect(res.status).toBe(401);
    });

    test('AN-01-02 — Token de operador devuelve HTTP 403', async () => {
        mockRolActual = 'operador';
        const res = await request(app)
            .get('/api/analytics/dashboard')
            .set('Authorization', TOKEN_OPERADOR);
        expect(res.status).toBe(403);
        mockRolActual = 'admin';
    });

    test('AN-01-03 — Admin con periodo=mes retorna 200 con estructura correcta', async () => {
        const res = await request(app)
            .get('/api/analytics/dashboard?periodo=mes')
            .set('Authorization', TOKEN_ADMIN);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('kpis');
        expect(res.body).toHaveProperty('proyeccion');
        expect(res.body).toHaveProperty('tendencias');
    });

    test('AN-01-04 — Admin con periodo=dia retorna 200 con estructura correcta', async () => {
        const res = await request(app)
            .get('/api/analytics/dashboard?periodo=dia')
            .set('Authorization', TOKEN_ADMIN);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('kpis');
        expect(res.body).toHaveProperty('proyeccion');
        expect(res.body).toHaveProperty('tendencias');
    });

    test('AN-01-05 — Admin con periodo=anio retorna 200 con estructura correcta', async () => {
        const res = await request(app)
            .get('/api/analytics/dashboard?periodo=anio')
            .set('Authorization', TOKEN_ADMIN);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('kpis');
        expect(res.body).toHaveProperty('proyeccion');
        expect(res.body).toHaveProperty('tendencias');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AN-02  GET /api/analytics/kpis
// ═══════════════════════════════════════════════════════════════════════════════
describe('AN-02 — KPIs por período', () => {

    test('AN-02-01 — Sin token devuelve HTTP 401', async () => {
        const res = await request(app).get('/api/analytics/kpis');
        expect(res.status).toBe(401);
    });

    test('AN-02-02 — Admin con periodo=semana retorna KPIs completos', async () => {
        const res = await request(app)
            .get('/api/analytics/kpis?periodo=semana')
            .set('Authorization', TOKEN_ADMIN);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('kpis');
        expect(res.body.kpis).toHaveProperty('ingresos');
        expect(res.body.kpis).toHaveProperty('sacramentos');
        expect(res.body.kpis).toHaveProperty('promedio_diario');
        expect(res.body.kpis).toHaveProperty('catecumenos_activos');
    });

    test('AN-02-03 — Admin con periodo=mes_anterior retorna 200', async () => {
        const res = await request(app)
            .get('/api/analytics/kpis?periodo=mes_anterior')
            .set('Authorization', TOKEN_ADMIN);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('kpis');
        expect(res.body.kpis.periodo).toBe('mes_anterior');
    });

    // ── FALLO ESPERADO v1 ────────────────────────────────────────────────────
    // calcularRango() no normaliza el período: retorna "invalido" en vez de "mes"
    test('AN-02-04 — Periodo inválido: campo periodo debe ser "mes" (FALLO v1)', async () => {
        const res = await request(app)
            .get('/api/analytics/kpis?periodo=invalido')
            .set('Authorization', TOKEN_ADMIN);
        expect(res.status).toBe(200);
        // v1 BUG: kpis.periodo devuelve "invalido" en lugar de "mes"
        expect(res.body.kpis.periodo).toBe('mes');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AN-03  GET /api/analytics/proyeccion
// ═══════════════════════════════════════════════════════════════════════════════
describe('AN-03 — Proyección de ingresos', () => {

    test('AN-03-01 — Sin token devuelve HTTP 401', async () => {
        const res = await request(app).get('/api/analytics/proyeccion');
        expect(res.status).toBe(401);
    });

    test('AN-03-02 — Admin retorna proyeccion con campos esperados', async () => {
        const res = await request(app)
            .get('/api/analytics/proyeccion')
            .set('Authorization', TOKEN_ADMIN);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('proyeccion');
        const p = res.body.proyeccion;
        expect(p).toHaveProperty('meses_analizados');
        expect(p).toHaveProperty('mensaje');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AN-04  GET /api/analytics/alertas
// ═══════════════════════════════════════════════════════════════════════════════
describe('AN-04 — Alertas del sistema', () => {

    test('AN-04-01 — Sin token devuelve HTTP 401', async () => {
        const res = await request(app).get('/api/analytics/alertas');
        expect(res.status).toBe(401);
    });

    test('AN-04-02 — Admin retorna 200 con alertas y total', async () => {
        const res = await request(app)
            .get('/api/analytics/alertas')
            .set('Authorization', TOKEN_ADMIN);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('alertas');
        expect(res.body).toHaveProperty('total');
        expect(Array.isArray(res.body.alertas)).toBe(true);
    });

    // ── FALLO ESPERADO v1 ────────────────────────────────────────────────────
    // La alerta de caja usa tipo "sin_ingresos" igual que la de ingresos.
    // Cuando ambas aparecen, hay dos objetos con tipo duplicado en el array,
    // lo que viola la unicidad esperada de tipos de alerta.
    test('AN-04-03 — Cada alerta tiene tipo único (FALLO v1)', async () => {
        const res = await request(app)
            .get('/api/analytics/alertas')
            .set('Authorization', TOKEN_ADMIN);
        expect(res.status).toBe(200);
        const tipos = res.body.alertas.map(a => a.tipo);
        const tiposUnicos = [...new Set(tipos)];
        // v1 BUG: hay dos alertas con tipo "sin_ingresos" → falla unicidad
        expect(tipos.length).toBe(tiposUnicos.length);
    });

    test('AN-04-04 — Cada alerta tiene tipo, mensaje y nivel', async () => {
        const res = await request(app)
            .get('/api/analytics/alertas')
            .set('Authorization', TOKEN_ADMIN);
        expect(res.status).toBe(200);
        res.body.alertas.forEach(alerta => {
            expect(alerta).toHaveProperty('tipo');
            expect(alerta).toHaveProperty('mensaje');
            expect(alerta).toHaveProperty('nivel');
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AN-05  GET /api/analytics/tendencias
// ═══════════════════════════════════════════════════════════════════════════════
describe('AN-05 — Tendencias históricas', () => {

    test('AN-05-01 — Sin token devuelve HTTP 401', async () => {
        const res = await request(app).get('/api/analytics/tendencias');
        expect(res.status).toBe(401);
    });

    test('AN-05-02 — Admin retorna array de tendencias con estructura correcta', async () => {
        const res = await request(app)
            .get('/api/analytics/tendencias')
            .set('Authorization', TOKEN_ADMIN);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('tendencias');
        expect(Array.isArray(res.body.tendencias)).toBe(true);
        if (res.body.tendencias.length > 0) {
            const t = res.body.tendencias[0];
            expect(t).toHaveProperty('mes');
            expect(t).toHaveProperty('total_ingresos');
            expect(t).toHaveProperty('transacciones');
        }
    });
});