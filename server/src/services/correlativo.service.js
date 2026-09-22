const pool = require('./db');

async function generarCorrelativo() {
    const fecha = new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, '');

    const { rows } = await pool.query(
        `SELECT COUNT(*) FROM pgip.transaccion
         WHERE DATE(created_at) = CURRENT_DATE`
    );

    const secuencial = String(parseInt(rows[0].count) + 1)
        .padStart(4, '0');

    return `PGIP-${fecha}-${secuencial}`;
}

module.exports = { generarCorrelativo };