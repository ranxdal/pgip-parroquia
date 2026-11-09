const Tesseract = require('tesseract.js');
const { Jimp } = require('jimp');
const path = require('path');
const fs = require('fs');

const UMBRAL_CONFIANZA = 80;

async function preprocesarImagen(rutaOriginal) {
    const nombreArchivo = path.basename(rutaOriginal, path.extname(rutaOriginal));
    const rutaProcesada = path.join(
        path.dirname(rutaOriginal),
        `${nombreArchivo}_proc.jpg`
    );

    const imagen = await Jimp.read(rutaOriginal);
    imagen.greyscale();
    imagen.normalize();
    imagen.contrast(0.2);
    // Imágenes pequeñas: ampliar para que Tesseract distinga mejor las letras
    if (imagen.width < 2000) {
        imagen.scale(2);
    }
    await imagen.write(rutaProcesada);

    return rutaProcesada;
}

async function procesarConTesseract(rutaImagen) {
    const worker = await Tesseract.createWorker('spa');
    try {
        await worker.setParameters({
            tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
            preserve_interword_spaces: '1'
        });
        const { data } = await worker.recognize(rutaImagen);
        return {
            texto: data.text,
            confianza: data.confidence,
            motor: 'tesseract'
        };
    } finally {
        await worker.terminate();
    }
}

async function procesarFolio(rutaImagen) {
    const rutaProcesada = await preprocesarImagen(rutaImagen);

    const resultado = await procesarConTesseract(rutaProcesada);
    console.log(`Tesseract — confianza: ${resultado.confianza}%`);

    if (resultado.confianza < UMBRAL_CONFIANZA) {
        console.log(`Confianza baja (${resultado.confianza}%). Google Vision pendiente de configuración.`);
    }

    if (fs.existsSync(rutaProcesada)) {
        fs.unlinkSync(rutaProcesada);
    }

    return resultado;
}

module.exports = { procesarFolio };