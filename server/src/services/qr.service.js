const crypto = require('crypto');

function generarQRPayload(transaccionId, correlativo, monto) {
    const datos = `${transaccionId}|${correlativo}|${monto}`;
    const firma = crypto
        .createHmac('sha256', process.env.HMAC_SECRET)
        .update(datos)
        .digest('hex');

    return {
        datos,
        firma,
        url: `http://localhost:3000/api/tesoreria/verificar/${firma}`
    };
}

function verificarQR(datos, firmaRecibida) {
    const firmaEsperada = crypto
        .createHmac('sha256', process.env.HMAC_SECRET)
        .update(datos)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(firmaEsperada),
        Buffer.from(firmaRecibida)
    );
}

module.exports = { generarQRPayload, verificarQR };