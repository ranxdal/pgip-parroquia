const express = require('express');
const router = express.Router();
const { verificarCertificado } = require('../controllers/verificar.controller');

// Ruta pública — sin token, para que funcione al escanear el QR
router.get('/:serie', verificarCertificado);

module.exports = router;