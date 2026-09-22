const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

pool.on('connect', () => {
    console.log('Conectado a la base de datos Supabase');
});

pool.on('error', (err) => {
    console.error('Error en la base de datos:', err);
    process.exit(-1);
});

module.exports = pool;