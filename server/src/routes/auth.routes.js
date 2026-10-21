const express = require('express');
const router = express.Router();
const {
    registrar,
    login,
    obtenerPerfil,
    actualizarPerfil,
    cambiarContrasena,
    listarUsuarios,
    crearUsuario,
    toggleActivo,
    resetearContrasena
} = require('../controllers/auth.controller');
const { verificarToken, verificarRol } = require('../middleware/auth.middleware');

// ── Rutas públicas ──────────────────────────────────────────
router.post('/login',     login);
router.post('/registrar', registrar); // solo desarrollo

// Verificar token activo
router.get('/verificar', verificarToken, (req, res) => {
    res.json({ mensaje: 'Token válido', usuario: req.usuario });
});

// ── Perfil propio (cualquier usuario autenticado) ───────────
router.get ('/perfil',             verificarToken, obtenerPerfil);
router.put ('/perfil',             verificarToken, actualizarPerfil);
router.post('/perfil/contrasena',  verificarToken, cambiarContrasena);

// ── Gestión de usuarios (solo admin) ───────────────────────
router.get ('/usuarios',              verificarToken, verificarRol(['admin']), listarUsuarios);
router.post('/usuarios',              verificarToken, verificarRol(['admin']), crearUsuario);
router.patch('/usuarios/:id/activo', verificarToken, verificarRol(['admin']), toggleActivo);
router.post('/usuarios/:id/reset',   verificarToken, verificarRol(['admin']), resetearContrasena);

module.exports = router;