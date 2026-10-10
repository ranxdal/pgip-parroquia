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
//router.use(verificarToken);

// Rutas
// Quita esta línea:
//router.use(verificarToken);

// Y agrega verificarToken explícito en cada ruta:
router.post('/subir', verificarToken, verificarRol(['admin', 'operador']),
    upload.single('imagen'), subirFolio);
router.get('/buscar', verificarToken, verificarRol(['admin', 'operador']), buscarFolios);
router.get('/', verificarToken, verificarRol(['admin', 'operador']), obtenerFolios);
router.get('/:id', verificarToken, verificarRol(['admin', 'operador']), obtenerFolio);


router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'El archivo excede el tamaño máximo permitido (10MB)' });
        }
        return res.status(400).json({ error: err.message });
    }
    if (err && err.message && err.message.includes('Solo se permiten')) {
        return res.status(400).json({ error: err.message });
    }
    next(err);
});

module.exports = router;