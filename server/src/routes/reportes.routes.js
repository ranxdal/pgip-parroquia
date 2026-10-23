const express = require('express');
const router  = express.Router();
const { reporteTesoreria, reporteIntenciones, reporteCertificados } = require('../controllers/reportes.controller');
const { verificarToken, verificarRol } = require('../middleware/auth.middleware');

router.use(verificarToken);
router.use(verificarRol(['admin', 'operador']));

router.get('/tesoreria',    reporteTesoreria);
router.get('/intenciones',  reporteIntenciones);
router.get('/certificados', reporteCertificados);

module.exports = router;