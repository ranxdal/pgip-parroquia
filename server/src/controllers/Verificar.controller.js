const pool = require('../services/db');

/**
 * GET /verificar/:serie
 * Ruta pública — sin token — devuelve HTML con los datos del certificado.
 * El número de serie tiene formato: PGIP-BAU-XXXXXXXX (generado en el frontend)
 * Se busca por correlativo en la tabla transaccion.
 */
const verificarCertificado = async (req, res) => {
    const { serie } = req.params;

    try {
        const { rows } = await pool.query(
            `SELECT
                t.correlativo,
                t.monto,
                t.concepto,
                t.tipo_certificado,
                t.created_at,
                u.nombre   AS nombre_usuario,
                u.apellido AS apellido_usuario
             FROM pgip.transaccion t
             LEFT JOIN pgip.usuario u ON u.id = t.usuario_id
             WHERE t.correlativo = $1`,
            [serie]
        );

        if (rows.length === 0) {
            return res.status(404).send(paginaHTML({
                valido:  false,
                serie,
                mensaje: 'No se encontró ningún certificado con este número de serie.',
            }));
        }

        const tx = rows[0];

        // Solo certificados (concepto empieza con "certificado_")
        if (!tx.concepto?.startsWith('certificado_')) {
            return res.status(404).send(paginaHTML({
                valido:  false,
                serie,
                mensaje: 'Este código no corresponde a un certificado sacramental.',
            }));
        }

        const tipo   = tx.tipo_certificado || tx.concepto.replace('certificado_', '');
        const emisor = tx.nombre_usuario
            ? `${tx.nombre_usuario} ${tx.apellido_usuario}`
            : 'Secretaría Parroquial';

        const fechaEmision = tx.created_at
            ? new Date(tx.created_at).toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' })
            : '—';

        return res.send(paginaHTML({
            valido: true,
            serie,
            tipo,
            fecha:  fechaEmision,
            monto:  tx.monto,
            emisor,
        }));

    } catch (error) {
        console.error('Error en verificarCertificado:', error);
        return res.status(500).send(paginaHTML({
            valido:  false,
            serie,
            mensaje: 'Error interno al verificar el certificado.',
        }));
    }
};

/* ── Página HTML de respuesta ──────────────────────────────────── */
function paginaHTML({ valido, serie, tipo, fecha, monto, emisor, mensaje }) {
    const TIPOS = {
        bautismo:     'Bautismo',
        confirmacion: 'Confirmación',
        matrimonio:   'Matrimonio Religioso',
    };

    const colorPrincipal = valido ? '#276749' : '#c53030';
    const icono          = valido ? '✅' : '❌';
    const titulo         = valido ? 'Certificado Auténtico' : 'Certificado No Encontrado';

    const detalles = valido ? `
        <div class="fila"><span class="etiqueta">Tipo de sacramento</span><span class="valor">${TIPOS[tipo] || tipo}</span></div>
        <div class="fila"><span class="etiqueta">Fecha de emisión</span><span class="valor">${fecha || '—'}</span></div>
        <div class="fila"><span class="etiqueta">Monto cobrado</span><span class="valor">Q${parseFloat(monto || 0).toFixed(2)}</span></div>
        <div class="fila"><span class="etiqueta">Emitido por</span><span class="valor">${emisor}</span></div>
        <div class="fila"><span class="etiqueta">Número de serie</span><span class="valor mono">${serie}</span></div>
    ` : `<p class="msg-error">${mensaje}</p>`;

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verificación de Certificado — Parroquia San Agustín</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: Georgia, 'Times New Roman', serif;
            background: #f7f3ee;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px 16px;
        }
        .tarjeta {
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.10);
            max-width: 480px;
            width: 100%;
            overflow: hidden;
        }
        .cabecera {
            background: ${colorPrincipal};
            color: #fff;
            padding: 28px 24px 20px;
            text-align: center;
        }
        .cabecera .icono { font-size: 48px; display: block; margin-bottom: 8px; }
        .cabecera h1 { font-size: 20px; font-weight: bold; letter-spacing: 0.5px; }
        .parroquia {
            font-size: 11px;
            color: rgba(255,255,255,0.80);
            margin-top: 4px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .cuerpo { padding: 24px; }
        .fila {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 10px 0;
            border-bottom: 1px solid #f0ebe4;
            gap: 12px;
        }
        .fila:last-child { border-bottom: none; }
        .etiqueta { color: #718096; font-size: 13px; flex-shrink: 0; }
        .valor { color: #1a202c; font-size: 14px; font-weight: bold; text-align: right; }
        .mono { font-family: monospace; font-size: 12px; }
        .msg-error { color: #c53030; text-align: center; padding: 16px 0; font-size: 15px; }
        .pie {
            text-align: center;
            padding: 16px 24px;
            background: #f7f3ee;
            font-size: 11px;
            color: #a0aec0;
            border-top: 1px solid #e8e0d5;
        }
    </style>
</head>
<body>
    <div class="tarjeta">
        <div class="cabecera">
            <span class="icono">${icono}</span>
            <h1>${titulo}</h1>
            <p class="parroquia">Parroquia San Agustín · Sumpango, Sacatepéquez</p>
        </div>
        <div class="cuerpo">
            ${detalles}
        </div>
        <div class="pie">
            Verificado mediante PGIP · Sistema de Gestión Parroquial
        </div>
    </div>
</body>
</html>`;
}

/* ── Registrar emisión de certificado ─────────────────────────── */
const registrarEmisionCertificado = async (req, res) => {
    const { correlativo, tipo_certificado, concepto, monto } = req.body;

    if (!correlativo || !tipo_certificado) {
        return res.status(400).json({ error: 'correlativo y tipo_certificado son requeridos' });
    }

    try {
        // Verificar que no exista ya ese correlativo
        const { rows: existe } = await pool.query(
            `SELECT id FROM pgip.transaccion WHERE correlativo = $1`,
            [correlativo]
        );
        if (existe.length > 0) {
            return res.status(200).json({ mensaje: 'Ya registrado', id: existe[0].id });
        }

        const conceptoValido = `certificado_${tipo_certificado}`; // ej: certificado_bautismo
        const montoFinal = parseFloat(monto) > 0 ? parseFloat(monto) : 1; // monto debe ser > 0

        const { rows } = await pool.query(
            `INSERT INTO pgip.transaccion
                (correlativo, tipo, monto, concepto, tipo_certificado, usuario_id, ip_origen)
             VALUES ($1, 'efectivo', $2, $3, $4, $5, $6)
             RETURNING id`,
            [
                correlativo,
                montoFinal,
                conceptoValido,
                tipo_certificado,
                req.usuario?.id || null,
                req.ip || null,
            ]
        );

        return res.status(201).json({ mensaje: 'Emisión registrada', id: rows[0].id });
    } catch (error) {
        console.error('Error en registrarEmisionCertificado:', error);
        return res.status(500).json({ error: 'Error al registrar la emisión' });
    }
};

module.exports = { verificarCertificado, registrarEmisionCertificado };