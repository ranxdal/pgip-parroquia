require('dotenv').config();
console.log('CLIENT_URL configurado:', process.env.CLIENT_URL);
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pool = require('./src/services/db');
const authRoutes = require('./src/routes/auth.routes');
const tesoreríaRoutes = require('./src/routes/tesoreria.routes');
const sacramentosRoutes = require('./src/routes/sacramentos.routes');
const archivoRoutes = require('./src/routes/archivo.routes');
const analyticsRoutes = require('./src/routes/analytics.routes');
const intencionesRoutes = require('./src/routes/intenciones.routes');

const app = express();

app.use(helmet());
app.use(cors({
    origin: function(origin, callback) {
        const allowedOrigins = [
            'https://pgip-parroquia.vercel.app',
            'http://localhost:5173',
            'http://localhost:3000'
        ];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('CORS bloqueado para origen:', origin);
            callback(null, true); // Permitir temporalmente todo
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/tesoreria', tesoreríaRoutes);
app.use('/api/sacramentos', sacramentosRoutes);
app.use('/api/archivo', archivoRoutes);
app.use('/api/analytics', analyticsRoutes);

// Rutas de prueba
app.get('/api/ping', (req, res) => {
    res.json({ mensaje: 'Servidor PGIP funcionando correctamente' });
});

app.get('/api/db-test', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT table_name
             FROM information_schema.tables
             WHERE table_schema = 'pgip'
             ORDER BY table_name`
        );
        res.json({
            mensaje: 'Conexión a base de datos exitosa',
            tablas: rows.map(r => r.table_name)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Servidor PGIP corriendo en http://localhost:${PORT}`);
    });
}

module.exports = app;