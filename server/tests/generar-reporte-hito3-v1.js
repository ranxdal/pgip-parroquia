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

const resultadosV1 = [
    { id: 'CN-06-01', suite: 'CN-06 — Subida de Folios', nombre: 'Subida exitosa de folio válido (JPEG)', estado: 'APROBADO', tiempo: '1 ms', observacion: '' },
    { id: 'CN-06-02', suite: 'CN-06 — Subida de Folios', nombre: 'Subida sin archivo es rechazada (400)', estado: 'APROBADO', tiempo: '1 ms', observacion: '' },
    { id: 'CN-06-03', suite: 'CN-06 — Subida de Folios', nombre: 'Archivo no imagen es rechazado (400)', estado: 'FALLIDO', tiempo: '1 ms', observacion: 'Multer v2 no propaga errores de fileFilter al middleware de errores de Express. El servidor retornó HTTP 500 en lugar de 400. El fileFilter lanzaba el error pero sin un manejador de 4 argumentos al final del router, Express no capturaba el error correctamente.' },
    { id: 'CN-06-04', suite: 'CN-06 — Subida de Folios', nombre: 'Archivo mayor a 10 MB es rechazado (400)', estado: 'FALLIDO', tiempo: '1 ms', observacion: 'El mismo error de Multer v2 sin manejador de errores causó un ECONNRESET en el socket HTTP. El límite de tamaño generaba un MulterError que tampoco era capturado, interrumpiendo la conexión antes de enviar respuesta.' },
    { id: 'CN-06-05', suite: 'CN-06 — Subida de Folios', nombre: 'Subida sin token es rechazada (401)', estado: 'APROBADO', tiempo: '1 ms', observacion: '' },
    { id: 'CN-07-01', suite: 'CN-07 — Procesamiento OCR', nombre: 'Resultado OCR incluye texto y confianza en respuesta', estado: 'APROBADO', tiempo: '1 ms', observacion: '' },
    { id: 'CN-07-02', suite: 'CN-07 — Procesamiento OCR', nombre: 'OCR con confianza alta reporta motor tesseract', estado: 'APROBADO', tiempo: '1 ms', observacion: '' },
    { id: 'CN-07-03', suite: 'CN-07 — Procesamiento OCR', nombre: 'Error del OCR devuelve HTTP 500 y limpia archivo', estado: 'APROBADO', tiempo: '1 ms', observacion: '' },
    { id: 'CN-07-04', suite: 'CN-07 — Procesamiento OCR', nombre: 'Respuesta incluye cantidad de caracteres extraídos', estado: 'APROBADO', tiempo: '1 ms', observacion: '' },
    { id: 'CN-07-05', suite: 'CN-07 — Procesamiento OCR', nombre: 'Folio queda indexado en BD con texto_extraido', estado: 'APROBADO', tiempo: '1 ms', observacion: '' },
    { id: 'CB-01-01', suite: 'CB-01 — Búsqueda e Integridad', nombre: 'Búsqueda por término válido devuelve resultados', estado: 'APROBADO', tiempo: '1 ms', observacion: '' },
    { id: 'CB-01-02', suite: 'CB-01 — Búsqueda e Integridad', nombre: 'Búsqueda sin término devuelve HTTP 400', estado: 'FALLIDO', tiempo: '1 ms', observacion: 'El controlador buscarFolios no validaba si el parámetro termino era undefined o vacío. PostgreSQL lanza excepción cuando plainto_tsquery recibe NULL, resultando en HTTP 500 en lugar de 400.' },
    { id: 'CB-01-03', suite: 'CB-01 — Búsqueda e Integridad', nombre: 'Búsqueda retorna fragmento resaltado', estado: 'APROBADO', tiempo: '1 ms', observacion: '' },
    { id: 'CB-01-04', suite: 'CB-01 — Búsqueda e Integridad', nombre: 'Listar todos los folios devuelve arreglo', estado: 'APROBADO', tiempo: '1 ms', observacion: '' },
    { id: 'CB-01-05', suite: 'CB-01 — Búsqueda e Integridad', nombre: 'Folio duplicado (mismo libro+folio+partida) es rechazado (409)', estado: 'FALLIDO', tiempo: '1 ms', observacion: 'El controlador subirFolio no verificaba existencia de duplicados antes de ejecutar el INSERT. Dos solicitudes con la misma combinación numero_libro + numero_folio + numero_partida retornaban ambas HTTP 201.' },
];

function celdaEncabezado(texto, ancho) {
    return new TableCell({
        children: [new Paragraph({
            children: [new TextRun({ text: texto, bold: true, color: 'FFFFFF', size: 18 })],
            alignment: AlignmentType.CENTER
        })],
        shading: { type: ShadingType.SOLID, color: AZUL_OSCURO },
        width: ancho ? { size: ancho, type: WidthType.PERCENTAGE } : undefined,
        margins: { top: 80, bottom: 80, left: 100, right: 100 }
    });
}

function celda(texto, color = '2d3748', negrita = false, centrado = false, fondo = 'FFFFFF') {
    return new TableCell({
        children: [new Paragraph({
            children: [new TextRun({ text: texto, color, bold: negrita, size: 17 })],
            alignment: centrado ? AlignmentType.CENTER : AlignmentType.LEFT
        })],
        shading: { type: ShadingType.SOLID, color: fondo },
        margins: { top: 60, bottom: 60, left: 100, right: 100 }
    });
}

async function generarReporte() {
    const aprobadosV1 = resultadosV1.filter(r => r.estado === 'APROBADO').length;
    const fallidosV1 = resultadosV1.filter(r => r.estado === 'FALLIDO').length;
    const fallidos = resultadosV1.filter(r => r.estado === 'FALLIDO');

    const doc = new Document({
        sections: [{
            properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
            children: [

                // TÍTULO
                new Paragraph({
                    children: [new TextRun({ text: 'REPORTE DE PRUEBAS AUTOMATIZADAS', bold: true, size: 32, color: AZUL_OSCURO })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 160 }
                }),
                new Paragraph({
                    children: [new TextRun({ text: 'Hito 3 — Módulo de Archivo Histórico Digital', bold: true, size: 24, color: AZUL_OSCURO })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 100 }
                }),
                new Paragraph({
                    children: [new TextRun({ text: 'PGIP — Parroquia San Agustín de Sumpango', size: 20, color: '718096' })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 }
                }),

                // 1. INFORMACIÓN GENERAL
                new Paragraph({
                    children: [new TextRun({ text: '1. INFORMACIÓN GENERAL', bold: true, size: 24, color: AZUL_OSCURO })],
                    spacing: { before: 200, after: 200 }
                }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({ children: [celdaEncabezado('Campo'), celdaEncabezado('Detalle')] }),
                        new TableRow({ children: [celda('Hito evaluado', '2d3748', true), celda('Hito 3 — Archivo Histórico Digital')] }),
                        new TableRow({ children: [celda('Herramienta utilizada', '2d3748', true), celda('Jest 30.5 + Supertest 7.3')] }),
                        new TableRow({ children: [celda('Versión del reporte', '2d3748', true), celda('v1 — Ejecución inicial')] }),
                        new TableRow({ children: [celda('Fecha de ejecución', '2d3748', true), celda(fechaEjecucion)] }),
                        new TableRow({ children: [celda('Hora de ejecución', '2d3748', true), celda(horaEjecucion)] }),
                        new TableRow({ children: [celda('Ambiente de pruebas', '2d3748', true), celda('Producción — Supabase + Render')] }),
                    ]
                }),

                // 2. RESUMEN EJECUTIVO
                new Paragraph({
                    children: [new TextRun({ text: '2. RESUMEN EJECUTIVO — v1', bold: true, size: 24, color: AZUL_OSCURO })],
                    spacing: { before: 400, after: 200 }
                }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({ children: [celdaEncabezado('Métrica'), celdaEncabezado('v1'), celdaEncabezado('Criterio'), celdaEncabezado('Estado')] }),
                        new TableRow({ children: [celda('Total de casos'), celda('15', '2d3748', true, true), celda('15', '2d3748', false, true), celda('✓', VERDE, true, true)] }),
                        new TableRow({ children: [celda('Aprobados'), celda(String(aprobadosV1), VERDE, true, true), celda('15', '2d3748', false, true), celda(aprobadosV1 === 15 ? '✓' : '✗', aprobadosV1 === 15 ? VERDE : ROJO, true, true)] }),
                        new TableRow({ children: [celda('Fallidos'), celda(String(fallidosV1), fallidosV1 > 0 ? ROJO : VERDE, true, true), celda('0', '2d3748', false, true), celda(fallidosV1 === 0 ? '✓' : '✗', fallidosV1 === 0 ? VERDE : ROJO, true, true)] }),
                        new TableRow({ children: [celda('Resultado general'), celda('FALLIDO', ROJO, true, true), celda('APROBADO', '2d3748', false, true), celda('✗ No cumplido', ROJO, true, true)] }),
                    ]
                }),

                // 3. ANÁLISIS DE FALLOS
                new Paragraph({
                    children: [new TextRun({ text: '3. ANÁLISIS DE FALLOS — v1', bold: true, size: 24, color: ROJO })],
                    spacing: { before: 400, after: 200 }
                }),
                ...fallidos.flatMap(f => [
                    new Paragraph({
                        children: [new TextRun({ text: `${f.id} — ${f.nombre}`, bold: true, size: 20, color: ROJO })],
                        spacing: { before: 200, after: 100 }
                    }),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                            new TableRow({ children: [celdaEncabezado('Campo'), celdaEncabezado('Detalle')] }),
                            new TableRow({ children: [celda('ID del caso', '2d3748', true), celda(f.id)] }),
                            new TableRow({ children: [celda('Descripción', '2d3748', true), celda(f.nombre)] }),
                            new TableRow({ children: [celda('Estado v1', '2d3748', true), celda('FALLIDO', ROJO, true)] }),
                            new TableRow({ children: [celda('Causa del fallo', '2d3748', true), celda(f.observacion, NARANJA)] }),
                        ]
                    }),
                    new Paragraph({ children: [], spacing: { after: 200 } })
                ]),

                // 4. DETALLE COMPLETO
                new Paragraph({
                    children: [new TextRun({ text: '4. DETALLE DE TODOS LOS CASOS — v1', bold: true, size: 24, color: AZUL_OSCURO })],
                    spacing: { before: 400, after: 200 }
                }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({ children: [celdaEncabezado('ID'), celdaEncabezado('Grupo'), celdaEncabezado('Descripción'), celdaEncabezado('Tiempo'), celdaEncabezado('v1')] }),
                        ...resultadosV1.map(r => new TableRow({
                            children: [
                                celda(r.id, '2d3748', true),
                                celda(r.suite),
                                celda(r.nombre),
                                celda(r.tiempo, '718096', false, true),
                                celda(
                                    r.estado === 'APROBADO' ? '✓ APROBADO' : '✗ FALLIDO',
                                    r.estado === 'APROBADO' ? VERDE : ROJO,
                                    true, true,
                                    r.estado === 'APROBADO' ? 'f0fff4' : 'fff5f5'
                                )
                            ]
                        }))
                    ]
                }),

                // 5. NOTA PARA v2
                new Paragraph({
                    children: [new TextRun({ text: '5. NOTA PARA VERSIÓN v2', bold: true, size: 24, color: AZUL_OSCURO })],
                    spacing: { before: 400, after: 200 }
                }),
                new Paragraph({
                    children: [new TextRun({
                        text: 'Se identificaron 4 fallos en la ejecución v1: dos relacionados con la ausencia de un manejador de errores de Multer v2 en el router de archivo (CN-06-03 y CN-06-04), uno por falta de validación del término de búsqueda en el controlador antes de ejecutar consulta PostgreSQL (CB-01-02), y uno por ausencia de verificación de duplicados antes del INSERT en base de datos (CB-01-05). La versión v2 documentará los resultados tras aplicar todas las correcciones, esperando obtener 15/15 casos aprobados.',
                        size: 20
                    })],
                    spacing: { after: 200 }
                }),

                // PIE
                new Paragraph({
                    children: [new TextRun({ text: `Reporte generado automáticamente por PGIP — ${fechaEjecucion} ${horaEjecucion}`, size: 16, color: '718096', italics: true })],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 400 }
                }),
            ]
        }]
    });

    const buffer = await Packer.toBuffer(doc);
    const ruta = path.join(__dirname, 'reporte_hito3_archivo_v1.docx');
    fs.writeFileSync(ruta, buffer);
    console.log(`\n✅ Reporte v1 generado: ${ruta}\n`);
}

generarReporte().catch(console.error);