// server/tests/setup.js
const pool = require('../src/services/db');

afterAll(async () => {
    await pool.end();
});