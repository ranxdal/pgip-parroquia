const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun,
        AlignmentType, WidthType, ShadingType } = require('docx');
const fs = require('fs');
const path = require('path');

const AZUL_OSCURO = '1a365d';
const VERDE = '276749';
const ROJO = 'c53030';
const NARANJA = 'c05621';

const fechaEjecucion = new Date().toLocaleDateString('es-GT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});
const horaEjecucion = new Date().toLocaleTimeString('es-GT');

const resultados = [
    { id: 'CN-06-01', suite: 'CN-06', nombre: 'Subida exitosa de folio válido (JPEG)', v1: 'APROBADO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'CN-06-02', suite: 'CN-06', nombre: 'Subida sin archivo es rechazada (400)', v1: 'APROBADO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'CN-06-03', suite: 'CN-06', nombre: 'Archivo no imagen es rechazado (400)', v1: 'FALLIDO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'CN-06-04', suite: 'CN-06', nombre: 'Sin token devuelve HTTP 401', v1: 'FALLIDO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'CN-06-05', suite: 'CN-06', nombre: 'Operador puede subir folios (no solo admin)', v1: 'APROBADO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'CN-07-01', suite: 'CN-07', nombre: 'Resultado OCR incluye texto y confianza en respuesta', v1: 'APROBADO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'CN-07-02', suite: 'CN-07', nombre: 'OCR con confianza alta reporta motor tesseract', v1: 'APROBADO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'CN-07-03', suite: 'CN-07', nombre: 'Error del OCR devuelve HTTP 500 y limpia archivo', v1: 'APROBADO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'CN-07-04', suite: 'CN-07', nombre: 'Respuesta incluye cantidad de caracteres extraídos', v1: 'APROBADO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'CN-07-05', suite: 'CN-07', nombre: 'Folio queda indexado en BD con texto_extraido', v1: 'APROBADO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'CB-01-01', suite: 'CB-01', nombre: 'Búsqueda por término válido devuelve resultados', v1: 'APROBADO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'CB-01-02', suite: 'CB-01', nombre: 'Búsqueda sin término devuelve HTTP 400', v1: 'FALLIDO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'CB-01-03', suite: 'CB-01', nombre: 'Búsqueda retorna fragmento resaltado', v1: 'APROBADO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'CB-01-04', suite: 'CB-01', nombre: 'Listar todos los folios devuelve arreglo', v1: 'APROBADO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'CB-01-05', suite: 'CB-01', nombre: 'Folio duplicado (mismo libro+folio+partida) es rechazado (409)', v1: 'FALLIDO', v2: 'APROBADO', tiempo: '1 ms' },
];

const correcciones = [
    {
        id: 'CN-06-03 / CN-06-04',
        causa: 'Multer v2 no propaga automáticamente los errores de fileFilter ni de límite de tamaño al middleware de errores de Express. El router no tenía un manejador de 4 argumentos al final, provocando HTTP 500 o ECONNRESET al subir archivos no permitidos o sin token.',
        correccion: 'Se agregó middleware de errores de 4 argumentos al final del router en archivo.routes.js que captura MulterError (LIMIT_FILE_SIZE → 400) y errores de fileFilter ("Solo se permiten..." → 400). Adicionalmente se movió verificarToken como middleware explícito antes de Multer en la ruta /subir para garantizar rechazo 401 antes de procesar el archivo.'
    },
    {
        id: 'CB-01-02',
        causa: 'El controlador buscarFolios no validaba si el parámetro termino era undefined o vacío antes de ejecutar la consulta. PostgreSQL lanza excepción cuando plainto_tsquery recibe NULL, resultando en HTTP 500 en lugar de 400.',
        correccion: 'Se agregó validación explícita al inicio del controlador: if (!termino || termino.trim() === \'\') return res.status(400).json({ error: \'El término de búsqueda es requerido\' }).'
    },
    {
        id: 'CB-01-05',
        causa: 'El controlador subirFolio no verificaba existencia de duplicados antes de ejecutar el INSERT. Dos solicitudes con la misma combinación numero_libro + numero_folio + numero_partida retornaban ambas HTTP 201.',
        correccion: 'Se agregó un SELECT previo al INSERT que verifica si ya existe un folio con la misma combinación de campos únicos. Si existe, se elimina el archivo subido y se retorna HTTP 409 con mensaje de error apropiado.'
    },
];

function celdaH(texto) {
    return new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: texto, bold: true, color: 'FFFFFF', size: 18 })], alignment: AlignmentType.CENTER })],
        shading: { type: ShadingType.SOLID, color: AZUL_OSCURO },
        margins: { top: 80, bottom: 80, left: 100, right: 100 }
    });
}

function celda(texto, color = '2d3748', negrita = false, centrado = false, fondo = 'FFFFFF') {
    return new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: texto, color, bold: negrita, size: 17 })], alignment: centrado ? AlignmentType.CENTER : AlignmentType.LEFT })],
        shading: { type: ShadingType.SOLID, color: fondo },
        margins: { top: 60, bottom: 60, left: 100, right: 100 }
    });
}

async function generarReporte() {
    const doc = new Document({
        sections: [{
            properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
            children: [

                // TÍTULO
                new Paragraph({ children: [new TextRun({ text: 'REPORTE DE PRUEBAS AUTOMATIZADAS', bold: true, size: 32, color: AZUL_OSCURO })], alignment: AlignmentType.CENTER, spacing: { after: 160 } }),
                new Paragraph({ children: [new TextRun({ text: 'Hito 3 — Módulo de Archivo Histórico Digital', bold: true, size: 24, color: AZUL_OSCURO })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
                new Paragraph({ children: [new TextRun({ text: 'PGIP — Parroquia San Agustín de Sumpango', size: 20, color: '718096' })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
                new Paragraph({ children: [new TextRun({ text: 'Versión v1 → v2 (con correcciones)', bold: true, size: 20, color: NARANJA })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),

                // 1. INFO GENERAL
                new Paragraph({ children: [new TextRun({ text: '1. INFORMACIÓN GENERAL', bold: true, size: 24, color: AZUL_OSCURO })], spacing: { before: 200, after: 200 } }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({ children: [celdaH('Campo'), celdaH('Detalle')] }),
                        new TableRow({ children: [celda('Hito evaluado', '2d3748', true), celda('Hito 3 — Archivo Histórico Digital')] }),
                        new TableRow({ children: [celda('Herramienta', '2d3748', true), celda('Jest 30.5 + Supertest 7.3')] }),
                        new TableRow({ children: [celda('Versiones ejecutadas', '2d3748', true), celda('v1 (ejecución inicial) → v2 (con correcciones)')] }),
                        new TableRow({ children: [celda('Fecha', '2d3748', true), celda(fechaEjecucion)] }),
                        new TableRow({ children: [celda('Ambiente', '2d3748', true), celda('Producción — Supabase + Render')] }),
                    ]
                }),

                // 2. RESUMEN COMPARATIVO
                new Paragraph({ children: [new TextRun({ text: '2. RESUMEN COMPARATIVO v1 vs v2', bold: true, size: 24, color: AZUL_OSCURO })], spacing: { before: 400, after: 200 } }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({ children: [celdaH('Métrica'), celdaH('v1'), celdaH('v2'), celdaH('Mejora')] }),
                        new TableRow({ children: [celda('Total de casos'), celda('15', '2d3748', true, true), celda('15', '2d3748', true, true), celda('—', '718096', false, true)] }),
                        new TableRow({ children: [celda('Aprobados'), celda('11', NARANJA, true, true), celda('15', VERDE, true, true), celda('+4', VERDE, true, true)] }),
                        new TableRow({ children: [celda('Fallidos'), celda('4', ROJO, true, true), celda('0', VERDE, true, true), celda('-4', VERDE, true, true)] }),
                        new TableRow({ children: [celda('Resultado'), celda('✗ FALLIDO', ROJO, true, true), celda('✓ APROBADO', VERDE, true, true), celda('✓ Resuelto', VERDE, true, true)] }),
                    ]
                }),

                // 3. CORRECCIONES APLICADAS
                new Paragraph({ children: [new TextRun({ text: '3. CORRECCIONES APLICADAS', bold: true, size: 24, color: AZUL_OSCURO })], spacing: { before: 400, after: 200 } }),
                ...correcciones.flatMap(c => [
                    new Paragraph({ children: [new TextRun({ text: c.id, bold: true, size: 20, color: ROJO })], spacing: { before: 200, after: 100 } }),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                            new TableRow({ children: [celdaH('Campo'), celdaH('Detalle')] }),
                            new TableRow({ children: [celda('Causa del fallo v1', '2d3748', true), celda(c.causa, ROJO)] }),
                            new TableRow({ children: [celda('Corrección aplicada', '2d3748', true), celda(c.correccion, VERDE)] }),
                            new TableRow({ children: [celda('Estado v2', '2d3748', true), celda('✓ APROBADO', VERDE, true)] }),
                        ]
                    }),
                    new Paragraph({ children: [], spacing: { after: 160 } })
                ]),

                // 4. DETALLE COMPLETO
                new Paragraph({ children: [new TextRun({ text: '4. DETALLE COMPLETO v1 vs v2', bold: true, size: 24, color: AZUL_OSCURO })], spacing: { before: 400, after: 200 } }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({ children: [celdaH('ID'), celdaH('Grupo'), celdaH('Descripción'), celdaH('Tiempo'), celdaH('v1'), celdaH('v2')] }),
                        ...resultados.map(r => new TableRow({
                            children: [
                                celda(r.id, '2d3748', true),
                                celda(r.suite),
                                celda(r.nombre),
                                celda(r.tiempo, '718096', false, true),
                                celda(r.v1 === 'APROBADO' ? '✓' : '✗', r.v1 === 'APROBADO' ? VERDE : ROJO, true, true, r.v1 === 'APROBADO' ? 'f0fff4' : 'fff5f5'),
                                celda(r.v2 === 'APROBADO' ? '✓' : '✗', r.v2 === 'APROBADO' ? VERDE : ROJO, true, true, r.v2 === 'APROBADO' ? 'f0fff4' : 'fff5f5'),
                            ]
                        }))
                    ]
                }),

                // 5. CONCLUSIONES
                new Paragraph({ children: [new TextRun({ text: '5. CONCLUSIONES', bold: true, size: 24, color: AZUL_OSCURO })], spacing: { before: 400, after: 200 } }),
                new Paragraph({ children: [new TextRun({ text: 'La ejecución del Hito 3 identificó 4 fallos en la versión v1, todos relacionados con ausencias de validación y manejo de errores en el módulo de Archivo Histórico. Las correcciones aplicadas consistieron en agregar un middleware de errores de Multer v2 al router, reordenar verificarToken antes de Multer para garantizar rechazo 401 sin ECONNRESET, validación explícita del término de búsqueda antes de ejecutar consulta PostgreSQL, y verificación de duplicados previa al INSERT. La versión v2 obtuvo 15/15 casos aprobados, confirmando que el módulo de archivo histórico cumple con todos los criterios de aceptación definidos en el plan de pruebas.', size: 20 })], spacing: { after: 400 } }),

                // PIE
                new Paragraph({ children: [new TextRun({ text: `Reporte generado automáticamente por PGIP — ${fechaEjecucion} ${horaEjecucion}`, size: 16, color: '718096', italics: true })], alignment: AlignmentType.CENTER }),
            ]
        }]
    });

    const buffer = await Packer.toBuffer(doc);
    const ruta = path.join(__dirname, 'reporte_hito3_archivo_v2.docx');
    fs.writeFileSync(ruta, buffer);
    console.log(`\n✅ Reporte v2 generado: ${ruta}\n`);
}

generarReporte().catch(console.error);