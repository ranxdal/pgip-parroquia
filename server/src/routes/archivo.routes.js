const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
    subirFolio,
    buscarFolios,
    obtenerFolios,
    obtenerFolio
} = require('../controllers/archivo.controller');
const { verificarToken, verificarRol } = require('../middleware/auth.middleware');

// Crear carpeta de uploads si no existe
const uploadsDir = path.join(__dirname, '../../uploads/folios');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de multer
const storage = multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const extension = path.extname(file.originalname);
        cb(null, `folio_${timestamp}${extension}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const permitidos = ['image/jpeg', 'image/png', 'image/tiff'];
        if (permitidos.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes JPG, PNG o TIFF'));
        }
    }
});

// Todas las rutas requieren token
router.use(verificarToken);

// Rutas
router.post('/subir', verificarRol(['admin', 'operador']),
    upload.single('imagen'), subirFolio);
router.get('/buscar', verificarRol(['admin', 'operador']), buscarFolios);
router.get('/', verificarRol(['admin', 'operador']), obtenerFolios);
router.get('/:id', verificarRol(['admin', 'operador']), obtenerFolio);

module.exports = router;