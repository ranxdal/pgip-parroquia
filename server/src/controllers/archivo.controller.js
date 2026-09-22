const pool = require('../services/db');
const { procesarFolio } = require('../services/ocr.service');
const path = require('path');
const fs = require('fs');

// Subir y procesar folio histórico
const subirFolio = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            error: 'No se proporcionó ninguna imagen'
        });
    }

    try {
        console.log(`Procesando folio: ${req.file.originalname}`);

        const resultado = await procesarFolio(req.file.path);

        const { rows } = await pool.query(
            `INSERT INTO pgip.folio_historico
             (numero_libro, numero_folio, numero_partida,
              tipo_sacramento, texto_extraido, confianza_ocr,
              ruta_imagen, procesado_por, usuario_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             RETURNING *`,
            [
                req.body.numero_libro || null,
                req.body.numero_folio || null,
                req.body.numero_partida || null,
                req.body.tipo_sacramento || null,
                resultado.texto,
                resultado.confianza,
                req.file.path,
                resultado.motor,
                req.usuario.id
            ]
        );

        res.status(201).json({
            mensaje: 'Folio procesado e indexado exitosamente',
            folio: rows[0],
            ocr: {
                motor: resultado.motor,
                confianza: resultado.confianza,
                caracteres_extraidos: resultado.texto.length
            }
        });

    } catch (error) {
        // Limpiar archivo si hubo error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message });
    }
};

// Buscar en folios históricos por texto
const buscarFolios = async (req, res) => {
    const { termino } = req.query;

    try {
        const { rows } = await pool.query(
            `SELECT id, numero_libro, numero_folio, numero_partida,
                    tipo_sacramento, fecha_sacramento, confianza_ocr,
                    procesado_por, created_at,
                    ts_headline('spanish', texto_extraido,
                        plainto_tsquery('spanish', $1)) AS fragmento
             FROM pgip.folio_historico
             WHERE to_tsvector('spanish', coalesce(texto_extraido, ''))
                   @@ plainto_tsquery('spanish', $1)
             ORDER BY created_at DESC
             LIMIT 20`,
            [termino]
        );

        res.json({
            resultados: rows,
            total: rows.length
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener todos los folios
const obtenerFolios = async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, numero_libro, numero_folio, numero_partida,
                    tipo_sacramento, fecha_sacramento, confianza_ocr,
                    procesado_por, created_at
             FROM pgip.folio_historico
             ORDER BY created_at DESC
             LIMIT 50`
        );

        res.json({
            folios: rows,
            total: rows.length
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener folio por ID
const obtenerFolio = async (req, res) => {
    const { id } = req.params;

    try {
        const { rows } = await pool.query(
            `SELECT * FROM pgip.folio_historico WHERE id = $1`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                error: 'Folio no encontrado'
            });
        }

        res.json({ folio: rows[0] });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    subirFolio,
    buscarFolios,
    obtenerFolios,
    obtenerFolio
};