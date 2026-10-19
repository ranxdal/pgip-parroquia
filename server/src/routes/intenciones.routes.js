const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middleware/auth.middleware');
const {
    registrarIntencion,
    listarIntencionesPorFecha,
    listarIntenciones,
    actualizarIntencion,
    eliminarIntencion,
    exportarWordPorFecha
} = require('../controllers/intenciones.controller');

// Todas las rutas requieren token
router.use(verificarToken);

// Listar todas
router.get('/', verificarRol(['admin', 'operador']), listarIntenciones);

// Listar por fecha
router.get('/fecha/:fecha', verificarRol(['admin', 'operador']), listarIntencionesPorFecha);

// Exportar Word por fecha
router.get('/exportar/:fecha', verificarRol(['admin', 'operador']), exportarWordPorFecha);

// Registrar nueva intención
router.post('/', verificarRol(['admin', 'operador']), registrarIntencion);

// Actualizar
router.put('/:id', verificarRol(['admin', 'operador']), actualizarIntencion);

// Eliminar
router.delete('/:id', verificarRol(['admin', 'operador']), eliminarIntencion);

module.exports = router;