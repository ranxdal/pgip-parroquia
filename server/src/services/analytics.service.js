const pool = require('./db');
const ss = require('simple-statistics');

function calcularRango(periodo) {
    const ahora = new Date();
    let desde, hasta;

    switch (periodo) {
        case 'dia':
            desde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
            hasta = new Date(desde);
            hasta.setDate(hasta.getDate() + 1);
            break;
        case 'semana':
            desde = new Date(ahora);
            desde.setDate(ahora.getDate() - 7);
            hasta = ahora;
            break;
        case 'mes':
            desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
            hasta = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
            break;
        case 'anio':
            desde = new Date(ahora.getFullYear(), 0, 1);
            hasta = new Date(ahora.getFullYear() + 1, 0, 1);
            break;
        case 'mes_anterior':
            desde = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
            hasta = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
            break;
        default:
            desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
            hasta = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
    }

    return { desde, hasta };
}

async function obtenerKPIs(periodo = 'mes') {
    const { desde, hasta } = calcularRango(periodo);

    const [ingresos, sacramentos, promedio, catecumenos] = await Promise.all([

        // Total de ingresos del período
        pool.query(
            `SELECT COALESCE(SUM(monto), 0) AS total,
                    COUNT(*) AS cantidad
             FROM pgip.transaccion
             WHERE created_at BETWEEN $1 AND $2`,
            [desde, hasta]
        ),

        // Sacramentos por tipo
        pool.query(
            `SELECT tipo, COUNT(*) AS cantidad
             FROM pgip.sacramento
             WHERE fecha BETWEEN $1 AND $2
             GROUP BY tipo ORDER BY cantidad DESC`,
            [desde, hasta]
        ),

        // Promedio diario de ingresos
        pool.query(
            `SELECT ROUND(AVG(total_dia), 2) AS promedio
             FROM (
                 SELECT DATE(created_at) AS fecha_dia,
                        SUM(monto) AS total_dia
                 FROM pgip.transaccion
                 WHERE created_at BETWEEN $1 AND $2
                 GROUP BY DATE(created_at)
             ) sub`,
            [desde, hasta]
        ),

        // Catecúmenos activos
        pool.query(
            `SELECT COUNT(*) AS total
             FROM pgip.feligres
             WHERE es_catecumeno = true`
        )
    ]);

    return {
        periodo,
        desde,
        hasta,
        ingresos: {
            total: parseFloat(ingresos.rows[0].total),
            cantidad_transacciones: parseInt(ingresos.rows[0].cantidad)
        },
        sacramentos: sacramentos.rows,
        promedio_diario: parseFloat(promedio.rows[0].promedio) || 0,
        catecumenos_activos: parseInt(catecumenos.rows[0].total)
    };
}

async function proyectarIngresos() {
    const { rows } = await pool.query(
        `SELECT
            EXTRACT(EPOCH FROM DATE_TRUNC('month', created_at)) AS x,
            SUM(monto) AS y
         FROM pgip.transaccion
         WHERE created_at >= NOW() - INTERVAL '12 months'
         GROUP BY DATE_TRUNC('month', created_at)
         ORDER BY DATE_TRUNC('month', created_at)`
    );

    if (rows.length < 2) {
        return {
            proyeccion: null,
            mensaje: 'Se necesitan al menos 2 meses de datos para proyectar',
            meses_analizados: rows.length
        };
    }

    const puntos = rows.map(r => [parseFloat(r.x), parseFloat(r.y)]);
    const regresion = ss.linearRegression(puntos);
    const modelo = ss.linearRegressionLine(regresion);

    const proximoMes = (Date.now() / 1000) + (30 * 24 * 60 * 60);
    const valorProyectado = Math.max(0, modelo(proximoMes));
    const rCuadrado = ss.rSquared(puntos, modelo);

    return {
        proyeccion: Math.round(valorProyectado * 100) / 100,
        r_cuadrado: Math.round(rCuadrado * 100) / 100,
        meses_analizados: rows.length,
        mensaje: `Proyección basada en ${rows.length} meses de datos históricos`
    };
}

async function obtenerTendencias() {
    const { rows } = await pool.query(
        `SELECT
            TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS mes,
            SUM(monto) AS total_ingresos,
            COUNT(*) AS transacciones
         FROM pgip.transaccion
         WHERE created_at >= NOW() - INTERVAL '6 months'
         GROUP BY DATE_TRUNC('month', created_at)
         ORDER BY DATE_TRUNC('month', created_at)`
    );

    return rows;
}

module.exports = { obtenerKPIs, proyectarIngresos, obtenerTendencias };