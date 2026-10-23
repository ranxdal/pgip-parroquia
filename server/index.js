require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pool = require('./src/services/db');
const archivoRoutes     = require('./src/routes/archivo.routes');
const intencionesRoutes = require('./src/routes/intenciones.routes');
const sacrarentosRoutes = require('./src/routes/sacramentos.routes');
const authRoutes        = require('./src/routes/auth.routes');
const tesoreriaRoutes   = require('./src/routes/tesoreria.routes');

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
            callback(null, true);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// Rutas
app.use('/api/auth',        authRoutes);
app.use('/api/archivo',     archivoRoutes);
app.use('/api/intenciones', intencionesRoutes);
app.use('/api/sacramentos', sacrarentosRoutes);
app.use('/api/tesoreria',   tesoreriaRoutes);

app.get('/api/ping', (req, res) => {
    res.json({ mensaje: 'Servidor PGIP funcionando correctamente' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Servidor PGIP corriendo en http://localhost:${PORT}`);
    });
}

module.exports = app;