const express = require('express');
const router = express.Router();
const {
    abrirCaja,
    cerrarCaja,
    registrarTransaccion,
    verificarCodigo,
    obtenerBalance,
    obtenerTransacciones,
    obtenerResumenIngresos,
} = require('../controllers/tesoreria.controller');
const { verificarToken, verificarRol } = require('../middleware/auth.middleware');

// Ruta pública — verificación QR sin token
router.get('/verificar/:firma', verificarCodigo);

// Todas las rutas siguientes requieren token válido
router.use(verificarToken);

// Rutas de caja
router.post('/caja/abrir', verificarRol(['admin', 'operador']), abrirCaja);
router.post('/caja/cerrar', verificarRol(['admin', 'operador']), cerrarCaja);
router.get('/caja/balance', verificarRol(['admin', 'operador']), obtenerBalance);

// Rutas de transacciones
router.post('/transaccion',              verificarRol(['admin', 'operador']), registrarTransaccion);
router.get('/transacciones/:sesion_id', verificarRol(['admin', 'operador']), obtenerTransacciones);
router.get('/resumen',                  verificarRol(['admin', 'operador']), obtenerResumenIngresos);

module.exports = router;