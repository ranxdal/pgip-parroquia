const pool = require('../services/db');

// Registrar feligrés
const registrarFeligres = async (req, res) => {
    const { nombres, apellidos, fecha_nacimiento, es_catecumeno,
            nombre_padre, nombre_madre } = req.body;

    try {
        const { rows: existe } = await pool.query(
            `SELECT id FROM pgip.feligres
             WHERE nombres ILIKE $1 AND apellidos ILIKE $2`,
            [nombres, apellidos]
        );

        if (existe.length > 0) {
            return res.status(400).json({
                error: 'Ya existe un feligrés registrado con ese nombre',
                feligres_id: existe[0].id
            });
        }

        const estado = es_catecumeno ? 'catecumeno' : 'activo';

        const { rows } = await pool.query(
            `INSERT INTO pgip.feligres
             (nombres, apellidos, fecha_nacimiento, es_catecumeno, estado,
              nombre_padre, nombre_madre)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [nombres, apellidos, fecha_nacimiento, es_catecumeno || false, estado,
             nombre_padre || null, nombre_madre || null]
        );

        res.status(201).json({
            mensaje: 'Feligrés registrado exitosamente',
            feligres: rows[0]
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Buscar feligrés por nombre con similitud fonética
const buscarFeligres = async (req, res) => {
    const { termino } = req.query;

    try {
        const { rows } = await pool.query(
            `SELECT id, nombres, apellidos, fecha_nacimiento,
                    es_catecumeno, estado,
                    similarity(nombres || ' ' || apellidos, $1) AS similitud
             FROM pgip.feligres
             WHERE similarity(nombres || ' ' || apellidos, $1) > 0.1
             ORDER BY similitud DESC
             LIMIT 10`,
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

// Validar prerrequisitos sacramentales
const validarPrerrequisitos = async (feligresId, tipoSacramento) => {
    const PREREQUISITOS = {
        confirmacion: ['bautismo'],
        matrimonio: ['bautismo', 'confirmacion']
    };

    const requeridos = PREREQUISITOS[tipoSacramento];
    if (!requeridos) return { valido: true, faltantes: [] };

    const { rows } = await pool.query(
        `SELECT tipo FROM pgip.sacramento
         WHERE feligres_id = $1 AND tipo = ANY($2)`,
        [feligresId, requeridos]
    );

    const registrados = rows.map(r => r.tipo);
    const faltantes = requeridos.filter(r => !registrados.includes(r));

    return {
        valido: faltantes.length === 0,
        faltantes
    };
};

// Registrar sacramento
const registrarSacramento = async (req, res) => {
    const {
        feligres_id, tipo, fecha, libro,
        folio, partida, ministro, padrino_1, padrino_2, conyuge
    } = req.body;

    try {
        const { valido, faltantes } = await validarPrerrequisitos(feligres_id, tipo);

        if (!valido) {
            return res.status(400).json({
                error: `No se puede registrar el sacramento. Faltan los siguientes sacramentos previos: ${faltantes.join(', ')}`,
                faltantes
            });
        }

        if (new Date(fecha) > new Date()) {
            return res.status(400).json({
                error: 'La fecha del sacramento no puede ser una fecha futura'
            });
        }

        const { rows } = await pool.query(
            `INSERT INTO pgip.sacramento
             (feligres_id, tipo, fecha, libro, folio, partida,
              ministro, padrino_1, padrino_2, conyuge, usuario_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             RETURNING *`,
            [feligres_id, tipo, fecha, libro, folio, partida,
             ministro, padrino_1, padrino_2, conyuge || null, req.usuario.id]
        );

        await pool.query(
            `UPDATE pgip.feligres SET estado = 'activo',
             es_catecumeno = false
             WHERE id = $1 AND es_catecumeno = true`,
            [feligres_id]
        );

        res.status(201).json({
            mensaje: 'Sacramento registrado exitosamente',
            sacramento: rows[0]
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener sacramentos de un feligrés
const obtenerSacramentosFeligres = async (req, res) => {
    const { feligres_id } = req.params;

    try {
        const { rows: feligres } = await pool.query(
            `SELECT * FROM pgip.feligres WHERE id = $1`,
            [feligres_id]
        );

        if (feligres.length === 0) {
            return res.status(404).json({ error: 'Feligrés no encontrado' });
        }

        const { rows: sacramentos } = await pool.query(
            `SELECT * FROM pgip.sacramento
             WHERE feligres_id = $1
             ORDER BY fecha ASC`,
            [feligres_id]
        );

        res.json({
            feligres: feligres[0],
            sacramentos,
            total: sacramentos.length
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Actualizar sacramento
const actualizarSacramento = async (req, res) => {
    const { id } = req.params;
    const { fecha, libro, folio, partida, ministro, padrino_1, padrino_2, conyuge } = req.body;

    try {
        const { rows: existe } = await pool.query(
            `SELECT id FROM pgip.sacramento WHERE id = $1`,
            [id]
        );

        if (existe.length === 0) {
            return res.status(404).json({ error: 'Sacramento no encontrado' });
        }

        if (fecha && new Date(fecha) > new Date()) {
            return res.status(400).json({
                error: 'La fecha del sacramento no puede ser una fecha futura'
            });
        }

        const { rows } = await pool.query(
            `UPDATE pgip.sacramento
             SET fecha     = COALESCE($1, fecha),
                 libro     = COALESCE($2, libro),
                 folio     = COALESCE($3, folio),
                 partida   = COALESCE($4, partida),
                 ministro  = COALESCE($5, ministro),
                 padrino_1 = COALESCE($6, padrino_1),
                 padrino_2 = COALESCE($7, padrino_2),
                 conyuge   = COALESCE($8, conyuge)
             WHERE id = $9
             RETURNING *`,
            [fecha, libro, folio, partida, ministro, padrino_1, padrino_2, conyuge || null, id]
        );

        res.json({
            mensaje: 'Sacramento actualizado exitosamente',
            sacramento: rows[0]
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Actualizar datos básicos de un feligrés (nombre de padres, etc.)
const actualizarFeligres = async (req, res) => {
    const { feligres_id } = req.params;
    const { nombre_padre, nombre_madre } = req.body;

    try {
        const { rows: existe } = await pool.query(
            `SELECT id FROM pgip.feligres WHERE id = $1`,
            [feligres_id]
        );

        if (existe.length === 0) {
            return res.status(404).json({ error: 'Feligrés no encontrado' });
        }

        const { rows } = await pool.query(
            `UPDATE pgip.feligres
             SET nombre_padre = COALESCE($1, nombre_padre),
                 nombre_madre = COALESCE($2, nombre_madre)
             WHERE id = $3
             RETURNING *`,
            [nombre_padre || null, nombre_madre || null, feligres_id]
        );

        res.json({
            mensaje: 'Feligrés actualizado exitosamente',
            feligres: rows[0]
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Eliminar sacramento
const eliminarSacramento = async (req, res) => {
    const { id } = req.params;

    try {
        const { rows: existe } = await pool.query(
            `SELECT id, feligres_id, tipo FROM pgip.sacramento WHERE id = $1`,
            [id]
        );

        if (existe.length === 0) {
            return res.status(404).json({ error: 'Sacramento no encontrado' });
        }

        await pool.query(`DELETE FROM pgip.sacramento WHERE id = $1`, [id]);

        res.json({ mensaje: 'Sacramento eliminado exitosamente' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    registrarFeligres,
    buscarFeligres,
    registrarSacramento,
    obtenerSacramentosFeligres,
    actualizarSacramento,
    actualizarFeligres,
    eliminarSacramento
};