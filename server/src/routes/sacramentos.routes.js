const express = require('express');
const router = express.Router();
const {
    registrarFeligres,
    buscarFeligres,
    registrarSacramento,
    obtenerSacramentosFeligres,
    actualizarSacramento,
    actualizarFeligres,
    eliminarSacramento
} = require('../controllers/sacramentos.controller');
const { verificarToken, verificarRol } = require('../middleware/auth.middleware');

// Todas las rutas requieren token válido
router.use(verificarToken);

// Rutas de feligreses
router.post('/feligres', verificarRol(['admin', 'operador']), registrarFeligres);
router.get('/feligres/buscar', verificarRol(['admin', 'operador']), buscarFeligres);
router.get('/feligres/:feligres_id', verificarRol(['admin', 'operador']), obtenerSacramentosFeligres);
router.put('/feligres/:feligres_id', verificarRol(['admin', 'operador']), actualizarFeligres);

// Rutas de sacramentos
router.post('/', verificarRol(['admin', 'operador']), registrarSacramento);
router.put('/:id', verificarRol(['admin', 'operador']), actualizarSacramento);
router.delete('/:id', verificarRol(['admin']), eliminarSacramento);

module.exports = router;