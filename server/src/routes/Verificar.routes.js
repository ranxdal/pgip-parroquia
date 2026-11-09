const express = require('express');
const router = express.Router();
const { verificarCertificado, registrarEmisionCertificado } = require('../controllers/Verificar.controller');
const { verificarToken } = require('../middleware/auth.middleware');

// Ruta pública — sin token, para que funcione al escanear el QR
router.get('/:serie', verificarCertificado);

// Ruta protegida — registrar emisión desde el frontend
router.post('/registrar', verificarToken, registrarEmisionCertificado);

module.exports = router;