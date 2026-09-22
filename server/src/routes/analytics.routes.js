const express = require('express');
const router = express.Router();
const {
    obtenerDashboard,
    obtenerKPIsPeriodo,
    obtenerProyeccion,
    obtenerAlertas,
    obtenerTendenciasHistoricas
} = require('../controllers/analytics.controller');
const { verificarToken, verificarRol } = require('../middleware/auth.middleware');

// Todas las rutas requieren token y rol admin
router.use(verificarToken);
router.use(verificarRol(['admin']));

// Rutas del dashboard
router.get('/dashboard', obtenerDashboard);
router.get('/kpis', obtenerKPIsPeriodo);
router.get('/proyeccion', obtenerProyeccion);
router.get('/alertas', obtenerAlertas);
router.get('/tendencias', obtenerTendenciasHistoricas);

module.exports = router;