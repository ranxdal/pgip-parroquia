const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../services/db');

// Registro de usuario
const registrar = async (req, res) => {
    const { nombre, apellido, usuario, contrasena, rol } = req.body;

    try {
        // Verificar si el usuario ya existe
        const { rows: existe } = await pool.query(
            `SELECT id FROM pgip.usuario WHERE usuario = $1`,
            [usuario]
        );

        if (existe.length > 0) {
            return res.status(400).json({ 
                error: 'El nombre de usuario ya está en uso' 
            });
        }

        // Encriptar contraseña
        const hash = await bcrypt.hash(contrasena, 10);

        // Insertar usuario
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
        // Buscar usuario
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

        // Verificar contraseña
        const contrasenaValida = await bcrypt.compare(
            contrasena, 
            usuarioEncontrado.contrasena
        );

        if (!contrasenaValida) {
            return res.status(401).json({ 
                error: 'Credenciales incorrectas' 
            });
        }

        // Generar token JWT
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
                id: usuarioEncontrado.id,
                nombre: usuarioEncontrado.nombre,
                apellido: usuarioEncontrado.apellido,
                usuario: usuarioEncontrado.usuario,
                rol: usuarioEncontrado.rol
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { registrar, login };