const express = require('express');
const router = express.Router();
const { verificarCertificado, registrarEmisionCertificado } = require('../controllers/Verificar.controller');

// Ruta para registrar emisión — debe ir antes del /:serie
router.post('/registrar', registrarEmisionCertificado);

// Ruta pública — sin token, para que funcione al escanear el QR
router.get('/:serie', verificarCertificado);

module.exports = router;