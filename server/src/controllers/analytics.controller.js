const { obtenerKPIs, proyectarIngresos, obtenerTendencias } = require('../services/analytics.service');
const pool = require('../services/db');

// Dashboard ejecutivo
const obtenerDashboard = async (req, res) => {
    const { periodo = 'mes' } = req.query;

    try {
        const [kpis, proyeccion, tendencias] = await Promise.all([
            obtenerKPIs(periodo),
            proyectarIngresos(),
            obtenerTendencias()
        ]);

        res.json({
            kpis,
            proyeccion,
            tendencias
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// KPIs por período
const obtenerKPIsPeriodo = async (req, res) => {
    const { periodo = 'mes' } = req.query;

    try {
        const kpis = await obtenerKPIs(periodo);
        res.json({ kpis });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Proyección de ingresos
const obtenerProyeccion = async (req, res) => {
    try {
        const proyeccion = await proyectarIngresos();
        res.json({ proyeccion });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Alertas del sistema
const obtenerAlertas = async (req, res) => {
    try {
        const alertas = [];

        // Alerta 1: días sin ingresos
        const { rows: sinIngresos } = await pool.query(
            `SELECT COUNT(*) FROM pgip.transaccion
             WHERE DATE(created_at) = CURRENT_DATE`
        );
        if (parseInt(sinIngresos[0].count) === 0) {
            alertas.push({
                tipo: 'sin_ingresos',
                mensaje: 'No se han registrado ingresos el día de hoy',
                nivel: 'advertencia'
            });
        }

        // Alerta 2: catecúmenos sin sacramento reciente
        const { rows: catecumenos } = await pool.query(
            `SELECT COUNT(*) FROM pgip.feligres
             WHERE es_catecumeno = true`
        );
        if (parseInt(catecumenos[0].count) > 0) {
            alertas.push({
                tipo: 'catecumeno_pendiente',
                mensaje: `${catecumenos[0].count} catecúmeno(s) pendiente(s) de recibir sacramentos`,
                nivel: 'informacion'
            });
        }

        // Alerta 3: feligreses con prerrequisitos incompletos
        const { rows: incompletos } = await pool.query(
            `SELECT f.nombres, f.apellidos
             FROM pgip.feligres f
             WHERE EXISTS (
                 SELECT 1 FROM pgip.sacramento s
                 WHERE s.feligres_id = f.id
                 AND s.tipo = 'matrimonio'
                 AND NOT EXISTS (
                     SELECT 1 FROM pgip.sacramento s2
                     WHERE s2.feligres_id = f.id
                     AND s2.tipo = 'bautismo'
                 )
             ) LIMIT 5`
        );
        if (incompletos.length > 0) {
            alertas.push({
                tipo: 'sacramento_incompleto',
                mensaje: `${incompletos.length} feligrés(es) con sacramentos incompletos detectados`,
                nivel: 'urgente'
            });
        }

        // Alerta 4: caja sin abrir hoy
        const { rows: cajaHoy } = await pool.query(
            `SELECT COUNT(*) FROM pgip.sesion_caja
             WHERE DATE(fecha) = CURRENT_DATE`
        );
        if (parseInt(cajaHoy[0].count) === 0) {
            alertas.push({
                tipo: 'sin_ingresos',
                mensaje: 'La caja no ha sido abierta hoy',
                nivel: 'advertencia'
            });
        }

        res.json({
            alertas,
            total: alertas.length,
            fecha_consulta: new Date()
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Tendencias históricas
const obtenerTendenciasHistoricas = async (req, res) => {
    try {
        const tendencias = await obtenerTendencias();
        res.json({ tendencias });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    obtenerDashboard,
    obtenerKPIsPeriodo,
    obtenerProyeccion,
    obtenerAlertas,
    obtenerTendenciasHistoricas
};