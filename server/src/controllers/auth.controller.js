const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../services/db');
const { createClient } = require('@supabase/supabase-js');

// Cliente admin de Supabase (usa service_role key para Storage)
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Registro de usuario
const registrar = async (req, res) => {
    const { nombre, apellido, usuario, contrasena, rol } = req.body;

    try {
        const { rows: existe } = await pool.query(
            `SELECT id FROM pgip.usuario WHERE usuario = $1`,
            [usuario]
        );

        if (existe.length > 0) {
            return res.status(400).json({
                error: 'El nombre de usuario ya está en uso'
            });
        }

        const hash = await bcrypt.hash(contrasena, 10);

        const { rows } = await pool.query(
            `INSERT INTO pgip.usuario
             (nombre, apellido, usuario, contrasena, rol)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, nombre, apellido, usuario, rol`,
            [nombre, apellido, usuario, hash, rol]
        );

        res.status(201).json({
            mensaje: 'Usuario creado exitosamente',
            usuario: rows[0]
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Inicio de sesión
const login = async (req, res) => {
    const { usuario, contrasena } = req.body;

    try {
        const { rows } = await pool.query(
            `SELECT * FROM pgip.usuario
             WHERE usuario = $1 AND activo = true`,
            [usuario]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                error: 'Credenciales incorrectas'
            });
        }

        const usuarioEncontrado = rows[0];

        const contrasenaValida = await bcrypt.compare(
            contrasena,
            usuarioEncontrado.contrasena
        );

        if (!contrasenaValida) {
            return res.status(401).json({
                error: 'Credenciales incorrectas'
            });
        }

        const token = jwt.sign(
            {
                id: usuarioEncontrado.id,
                rol: usuarioEncontrado.rol
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            mensaje: 'Inicio de sesión exitoso',
            token,
            usuario: {
                id:       usuarioEncontrado.id,
                nombre:   usuarioEncontrado.nombre,
                apellido: usuarioEncontrado.apellido,
                usuario:  usuarioEncontrado.usuario,
                rol:      usuarioEncontrado.rol,
                foto_url: usuarioEncontrado.foto_url || null
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener perfil propio
const obtenerPerfil = async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, nombre, apellido, usuario, rol, foto_url, created_at
             FROM pgip.usuario WHERE id = $1`,
            [req.usuario.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ usuario: rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Actualizar perfil propio (nombre, apellido)
const actualizarPerfil = async (req, res) => {
    const { nombre, apellido } = req.body;

    try {
        const { rows } = await pool.query(
            `UPDATE pgip.usuario
             SET nombre   = COALESCE($1, nombre),
                 apellido = COALESCE($2, apellido)
             WHERE id = $3
             RETURNING id, nombre, apellido, usuario, rol, foto_url`,
            [nombre || null, apellido || null, req.usuario.id]
        );

        res.json({
            mensaje: 'Perfil actualizado exitosamente',
            usuario: rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Subir foto de perfil a Supabase Storage
const subirFotoPerfil = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se recibió ningún archivo' });
        }

        const usuarioId = req.usuario.id;
        const ext = req.file.mimetype.split('/')[1].replace('jpeg', 'jpg');
        const fileName = `perfil-${usuarioId}-${Date.now()}.${ext}`;
        const bucket = 'fotos-perfil';

        // Subir a Supabase Storage
        const { error: uploadError } = await supabaseAdmin.storage
            .from(bucket)
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true,
            });

        if (uploadError) {
            console.error('Error al subir a Supabase Storage:', uploadError);
            return res.status(500).json({ error: 'Error al subir la imagen' });
        }

        // Obtener URL pública
        const { data: urlData } = supabaseAdmin.storage
            .from(bucket)
            .getPublicUrl(fileName);

        const fotoUrl = urlData.publicUrl;

        // Guardar URL en la base de datos
        const { rows } = await pool.query(
            `UPDATE pgip.usuario SET foto_url = $1 WHERE id = $2
             RETURNING id, nombre, apellido, usuario, rol, activo, foto_url`,
            [fotoUrl, usuarioId]
        );

        return res.json({ mensaje: 'Foto actualizada', usuario: rows[0] });
    } catch (error) {
        console.error('Error en subirFotoPerfil:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Cambiar contraseña propia
const cambiarContrasena = async (req, res) => {
    const { contrasena_actual, contrasena_nueva } = req.body;

    if (!contrasena_actual || !contrasena_nueva) {
        return res.status(400).json({ error: 'Ambas contraseñas son requeridas' });
    }

    if (contrasena_nueva.length < 6) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    try {
        const { rows } = await pool.query(
            `SELECT contrasena FROM pgip.usuario WHERE id = $1`,
            [req.usuario.id]
        );

        const valida = await bcrypt.compare(contrasena_actual, rows[0].contrasena);
        if (!valida) {
            return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
        }

        const hash = await bcrypt.hash(contrasena_nueva, 10);

        await pool.query(
            `UPDATE pgip.usuario SET contrasena = $1 WHERE id = $2`,
            [hash, req.usuario.id]
        );

        res.json({ mensaje: 'Contraseña actualizada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── Admin: gestión de usuarios ──────────────────────────────

// Listar todos los usuarios (solo admin)
const listarUsuarios = async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, nombre, apellido, usuario, rol, activo, foto_url, created_at
             FROM pgip.usuario
             ORDER BY rol DESC, nombre ASC`
        );

        res.json({ usuarios: rows, total: rows.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Crear usuario operador (solo admin)
const crearUsuario = async (req, res) => {
    const { nombre, apellido, usuario, contrasena } = req.body;
    const rol = 'operador';

    if (!nombre || !apellido || !usuario || !contrasena) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (contrasena.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    try {
        const { rows: existe } = await pool.query(
            `SELECT id FROM pgip.usuario WHERE usuario = $1`,
            [usuario]
        );

        if (existe.length > 0) {
            return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
        }

        const hash = await bcrypt.hash(contrasena, 10);

        const { rows } = await pool.query(
            `INSERT INTO pgip.usuario (nombre, apellido, usuario, contrasena, rol)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, nombre, apellido, usuario, rol, activo, created_at`,
            [nombre, apellido, usuario, hash, rol]
        );

        res.status(201).json({
            mensaje: 'Operador creado exitosamente',
            usuario: rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Activar / desactivar usuario (solo admin)
const toggleActivo = async (req, res) => {
    const { id } = req.params;

    if (id === req.usuario.id) {
        return res.status(400).json({ error: 'No puede desactivar su propia cuenta' });
    }

    try {
        const { rows } = await pool.query(
            `UPDATE pgip.usuario
             SET activo = NOT activo
             WHERE id = $1
             RETURNING id, nombre, apellido, usuario, rol, activo`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const estado = rows[0].activo ? 'activado' : 'desactivado';
        res.json({ mensaje: `Usuario ${estado} exitosamente`, usuario: rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Resetear contraseña de un operador (solo admin)
const resetearContrasena = async (req, res) => {
    const { id } = req.params;
    const { contrasena_nueva } = req.body;

    if (!contrasena_nueva || contrasena_nueva.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    try {
        const hash = await bcrypt.hash(contrasena_nueva, 10);

        const { rows } = await pool.query(
            `UPDATE pgip.usuario SET contrasena = $1
             WHERE id = $2 AND rol = 'operador'
             RETURNING id, nombre, apellido, usuario`,
            [hash, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Operador no encontrado' });
        }

        res.json({ mensaje: 'Contraseña reseteada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    registrar,
    login,
    obtenerPerfil,
    actualizarPerfil,
    subirFotoPerfil,
    cambiarContrasena,
    listarUsuarios,
    crearUsuario,
    toggleActivo,
    resetearContrasena
};