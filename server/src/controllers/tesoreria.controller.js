const pool = require('../services/db');
const { generarCorrelativo } = require('../services/correlativo.service');
const { generarQRPayload, verificarQR } = require('../services/qr.service');
const { v4: uuidv4 } = require('uuid');

// Abrir caja
const abrirCaja = async (req, res) => {
    const { monto_inicial } = req.body;

    try {
        const { rows: cajaExiste } = await pool.query(
            `SELECT id FROM pgip.sesion_caja
             WHERE DATE(fecha) = CURRENT_DATE
             AND estado = 'abierta'`
        );

        if (cajaExiste.length > 0) {
            return res.status(400).json({ error: 'Ya existe una caja abierta para hoy' });
        }

        const { rows } = await pool.query(
            `INSERT INTO pgip.sesion_caja (fecha, monto_inicial, usuario_id)
             VALUES (CURRENT_DATE, $1, $2)
             RETURNING *`,
            [monto_inicial, req.usuario.id]
        );

        res.status(201).json({ mensaje: 'Caja abierta exitosamente', sesion: rows[0] });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Cerrar caja
const cerrarCaja = async (req, res) => {
    const { sesion_caja_id, monto_final } = req.body;

    try {
        const { rows } = await pool.query(
            `UPDATE pgip.sesion_caja
             SET estado = 'cerrada', monto_final = $1
             WHERE id = $2 AND estado = 'abierta'
             RETURNING *`,
            [monto_final, sesion_caja_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'No se encontró una caja abierta con ese ID' });
        }

        const { rows: totales } = await pool.query(
            `SELECT COALESCE(SUM(monto), 0) AS total
             FROM pgip.transaccion WHERE sesion_caja_id = $1`,
            [sesion_caja_id]
        );

        const totalTransacciones = parseFloat(totales[0].total);
        const diferencia = monto_final - rows[0].monto_inicial - totalTransacciones;

        res.json({
            mensaje: 'Caja cerrada exitosamente',
            sesion: rows[0],
            resumen: {
                monto_inicial: rows[0].monto_inicial,
                total_transacciones: totalTransacciones,
                monto_final,
                diferencia: Math.abs(diferencia),
                estado_cuadre: diferencia === 0 ? 'Cuadre exacto' : 'Discrepancia detectada'
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Registrar transacción — acepta concepto
const registrarTransaccion = async (req, res) => {
    const { sesion_caja_id, tipo, monto, descripcion, concepto } = req.body;

    if (!sesion_caja_id) return res.status(400).json({ error: 'El campo sesion_caja_id es obligatorio' });
    if (!tipo || !['efectivo', 'transferencia'].includes(tipo))
        return res.status(400).json({ error: 'El tipo de pago debe ser efectivo o transferencia' });
    if (!monto || monto <= 0) return res.status(400).json({ error: 'El monto debe ser mayor a cero' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const correlativo    = await generarCorrelativo();
        const transaccionId  = uuidv4();
        const qr             = generarQRPayload(transaccionId, correlativo, monto);

        // Derivar tipo_certificado del concepto
        let tipo_certificado = null;
        if (concepto && concepto.startsWith('certificado_')) {
            tipo_certificado = concepto.replace('certificado_', '');
        }

        const { rows } = await client.query(
            `INSERT INTO pgip.transaccion
             (id, correlativo, sesion_caja_id, tipo, monto,
              descripcion, usuario_id, ip_origen, qr_hash,
              concepto, tipo_certificado)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             RETURNING *`,
            [transaccionId, correlativo, sesion_caja_id,
             tipo, monto, descripcion, req.usuario.id,
             req.ip, qr.firma,
             concepto || null, tipo_certificado]
        );

        // Obtener nombre del usuario emisor
        const { rows: usr } = await client.query(
            `SELECT nombre, apellido FROM pgip.usuario WHERE id = $1`,
            [req.usuario.id]
        );

        await client.query('COMMIT');

        const transaccion = {
            ...rows[0],
            nombre_usuario:   usr[0]?.nombre   || null,
            apellido_usuario: usr[0]?.apellido  || null,
        };

        res.status(201).json({
            mensaje:     'Transacción registrada exitosamente',
            transaccion,
            qr:          qr.url
        });

    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

// Verificar QR
const verificarCodigo = async (req, res) => {
    const { firma } = req.params;
    try {
        const { rows } = await pool.query(
            `SELECT t.*, sc.fecha
             FROM pgip.transaccion t
             JOIN pgip.sesion_caja sc ON t.sesion_caja_id = sc.id
             WHERE t.qr_hash = $1`,
            [firma]
        );

        if (rows.length === 0)
            return res.status(404).json({ error: 'Comprobante no encontrado o inválido' });

        res.json({
            mensaje: 'Comprobante válido',
            comprobante: {
                correlativo:  rows[0].correlativo,
                monto:        rows[0].monto,
                tipo:         rows[0].tipo,
                fecha:        rows[0].fecha,
                descripcion:  rows[0].descripcion,
                concepto:     rows[0].concepto,
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener balance del día
const obtenerBalance = async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT
                sc.id,
                sc.fecha,
                sc.monto_inicial,
                sc.monto_final,
                sc.estado,
                COALESCE(SUM(t.monto), 0)  AS total_transacciones,
                COUNT(t.id)                 AS cantidad_transacciones
             FROM pgip.sesion_caja sc
             LEFT JOIN pgip.transaccion t ON t.sesion_caja_id = sc.id
             WHERE DATE(sc.fecha) = CURRENT_DATE
             GROUP BY sc.id`
        );

        if (rows.length === 0)
            return res.status(404).json({ error: 'No hay caja registrada para hoy' });

        res.json({ balance: rows[0] });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Historial de transacciones de una sesión (con nombre de usuario emisor)
const obtenerTransacciones = async (req, res) => {
    const { sesion_id } = req.params;
    try {
        const { rows } = await pool.query(
            `SELECT
                t.*,
                u.nombre   AS nombre_usuario,
                u.apellido AS apellido_usuario
             FROM pgip.transaccion t
             LEFT JOIN pgip.usuario u ON u.id = t.usuario_id
             WHERE t.sesion_caja_id = $1
             ORDER BY t.created_at ASC`,
            [sesion_id]
        );
        res.json({ transacciones: rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    abrirCaja,
    cerrarCaja,
    registrarTransaccion,
    verificarCodigo,
    obtenerBalance,
    obtenerTransacciones,
};