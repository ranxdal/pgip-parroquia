const pool = require('../services/db');

/**
 * Reporte de Tesorería
 * GET /reportes/tesoreria?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 */
const reporteTesoreria = async (req, res) => {
    const { desde, hasta } = req.query;
    if (!desde || !hasta)
        return res.status(400).json({ error: 'Parámetros desde y hasta son requeridos' });

    try {
        // Resumen general
        const { rows: resumen } = await pool.query(
            `SELECT
                COALESCE(SUM(monto), 0)  AS total_ingresos,
                COUNT(*)                 AS total_transacciones
             FROM pgip.transaccion
             WHERE DATE(created_at) BETWEEN $1 AND $2`,
            [desde, hasta]
        );

        // Desglose por concepto
        const { rows: porConcepto } = await pool.query(
            `SELECT
                concepto,
                COUNT(*)                AS cantidad,
                COALESCE(SUM(monto), 0) AS total
             FROM pgip.transaccion
             WHERE DATE(created_at) BETWEEN $1 AND $2
             GROUP BY concepto
             ORDER BY total DESC`,
            [desde, hasta]
        );

        // Detalle de transacciones
        const { rows: transacciones } = await pool.query(
            `SELECT
                t.correlativo,
                TO_CHAR(t.created_at AT TIME ZONE 'America/Guatemala', 'YYYY-MM-DD') AS fecha,
                TO_CHAR(t.created_at AT TIME ZONE 'America/Guatemala', 'HH24:MI')    AS hora,
                t.tipo,
                t.concepto,
                t.monto,
                u.nombre   AS nombre_usuario,
                u.apellido AS apellido_usuario
             FROM pgip.transaccion t
             LEFT JOIN pgip.usuario u ON u.id = t.usuario_id
             WHERE DATE(t.created_at AT TIME ZONE 'America/Guatemala') BETWEEN $1 AND $2
             ORDER BY t.created_at ASC`,
            [desde, hasta]
        );

        res.json({
            periodo: { desde, hasta },
            resumen: {
                total_ingresos:      parseFloat(resumen[0].total_ingresos),
                total_transacciones: parseInt(resumen[0].total_transacciones),
            },
            por_concepto:  porConcepto,
            transacciones,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Reporte de Intenciones de Misa
 * GET /reportes/intenciones?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 */
const reporteIntenciones = async (req, res) => {
    const { desde, hasta } = req.query;
    if (!desde || !hasta)
        return res.status(400).json({ error: 'Parámetros desde y hasta son requeridos' });

    try {
        const { rows: intenciones } = await pool.query(
            `SELECT
                i.id,
                i.fecha_misa,
                i.nombre_familia,
                i.intencion,
                i.texto_lectura,
                i.created_at,
                u.nombre   AS nombre_usuario,
                u.apellido AS apellido_usuario
             FROM intenciones_misa i
             LEFT JOIN pgip.usuario u ON u.id::text = i.creado_por::text
             WHERE i.fecha_misa BETWEEN $1 AND $2
             ORDER BY i.fecha_misa ASC, i.created_at ASC`,
            [desde, hasta]
        );

        const { rows: resumen } = await pool.query(
            `SELECT
                COUNT(*) AS total
             FROM intenciones_misa
             WHERE fecha_misa BETWEEN $1 AND $2`,
            [desde, hasta]
        );

        res.json({
            periodo: { desde, hasta },
            resumen: { total: resumen[0].total },
            intenciones,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Reporte de Certificados emitidos
 * GET /reportes/certificados?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 */
const reporteCertificados = async (req, res) => {
    const { desde, hasta } = req.query;
    if (!desde || !hasta)
        return res.status(400).json({ error: 'Parámetros desde y hasta son requeridos' });

    try {
        // Certificados = transacciones de tipo certificado en el período
        const { rows: certificados } = await pool.query(
            `SELECT
                t.correlativo,
                TO_CHAR(t.created_at AT TIME ZONE 'America/Guatemala', 'YYYY-MM-DD') AS fecha,
                t.tipo_certificado,
                t.monto,
                u.nombre   AS nombre_usuario,
                u.apellido AS apellido_usuario
             FROM pgip.transaccion t
             LEFT JOIN pgip.usuario u ON u.id = t.usuario_id
             WHERE t.concepto LIKE 'certificado_%'
               AND DATE(t.created_at AT TIME ZONE 'America/Guatemala') BETWEEN $1 AND $2
             ORDER BY t.created_at ASC`,
            [desde, hasta]
        );

        const { rows: resumen } = await pool.query(
            `SELECT
                tipo_certificado,
                COUNT(*)                AS cantidad,
                COALESCE(SUM(monto), 0) AS total
             FROM pgip.transaccion
             WHERE concepto LIKE 'certificado_%'
               AND DATE(created_at AT TIME ZONE 'America/Guatemala') BETWEEN $1 AND $2
             GROUP BY tipo_certificado
             ORDER BY cantidad DESC`,
            [desde, hasta]
        );

        res.json({
            periodo: { desde, hasta },
            resumen,
            certificados,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { reporteTesoreria, reporteIntenciones, reporteCertificados };