const express = require('express');
const router = express.Router();
const { registrar, login } = require('../controllers/auth.controller');
const { verificarToken } = require('../middleware/auth.middleware');

// Ruta pública — iniciar sesión
router.post('/login', login);

// Ruta pública — registrar usuario (solo en desarrollo)
router.post('/registrar', registrar);

// Ruta protegida — verificar token activo
router.get('/verificar', verificarToken, (req, res) => {
    res.json({ 
        mensaje: 'Token válido',
        usuario: req.usuario 
    });
});

module.exports = router;