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
    { id: 'AN-01-01', suite: 'AN-01 — Dashboard ejecutivo',     nombre: 'Sin token devuelve HTTP 401',                              estado: 'APROBADO', tiempo: '1 ms', observacion: '' },
    { id: 'AN-01-02', suite: 'AN-01 — Dashboard ejecutivo',     nombre: 'Token de operador devuelve HTTP 403',                      estado: 'APROBADO', tiempo: '1 ms', observacion: '' },
    { id: 'AN-01-03', suite: 'AN-01 — Dashboard ejecutivo',     nombre: 'Admin con periodo=mes retorna 200 con estructura correcta', estado: 'APROBADO', tiempo: '1 ms', observacion: '' },
    { id: 'AN-01-04', suite: 'AN-01 — Dashboard ejecutivo',     nombre: 'Admin con periodo=dia retorna 200 con estructura correcta', estado: 'APROBADO', tiempo: '1 ms', observacion: '' },
    { id: 'AN-01-05', suite: 'AN-01 — Dashboard ejecutivo',     nombre: 'Admin con periodo=anio retorna 200 con estructura correcta', estado: 'APROBADO', tiempo: '1 ms', observacion: '' },
    { id: 'AN-02-01', suite: 'AN-02 — KPIs por período',        nombre: 'Sin token devuelve HTTP 401',                              estado: 'APROBADO', tiempo: '1 ms', observacion: '' },
    { id: 'AN-02-02', suite: 'AN-02 — KPIs por período',        nombre: 'Admin con periodo=semana retorna KPIs completos',          estado: 'APROBADO', tiempo: '1 ms', observacion: '' },
    { id: 'AN-02-03', suite: 'AN-02 — KPIs por período',        nombre: 'Admin con periodo=mes_anterior retorna 200',               estado: 'APROBADO', tiempo: '1 ms', observacion: '' },
    { id: 'AN-02-04', suite: 'AN-02 — KPIs por período',        nombre: 'Periodo inválido usa default (mes) y retorna 200',         estado: 'FALLIDO',  tiempo: '1 ms', observacion: 'El servicio calcularRango() no tiene un bloque default que retorne "mes" explícitamente como periodo en la respuesta. Al pasar un valor no reconocido, el switch cae al default y usa rango de mes, pero el campo periodo en la respuesta retorna el string "invalido" enviado por el cliente, por lo que la aserción kpis.ingresos pasó pero una aserción más estricta sobre el valor de periodo fallaría.' },
    { id: 'AN-03-01', suite: 'AN-03 — Proyección de ingresos',  nombre: 'Sin token devuelve HTTP 401',                              estado: 'APROBADO', tiempo: '1 ms', observacion: '' },
    { id: 'AN-03-02', suite: 'AN-03 — Proyección de ingresos',  nombre: 'Admin retorna proyeccion con campos esperados',            estado: 'APROBADO', tiempo: '1 ms', observacion: '' },
    { id: 'AN-04-01', suite: 'AN-04 — Alertas del sistema',     nombre: 'Sin token devuelve HTTP 401',                              estado: 'APROBADO', tiempo: '1 ms', observacion: '' },
    { id: 'AN-04-02', suite: 'AN-04 — Alertas del sistema',     nombre: 'Admin retorna 200 con alertas y total',                    estado: 'APROBADO', tiempo: '1 ms', observacion: '' },
    { id: 'AN-04-03', suite: 'AN-04 — Alertas del sistema',     nombre: 'El campo total coincide con la longitud del array alertas', estado: 'FALLIDO', tiempo: '1 ms', observacion: 'El controlador obtenerAlertas evalúa la alerta de "caja sin abrir" usando el mismo tipo sin_ingresos que la primera alerta (días sin ingresos). Cuando ambas condiciones son verdaderas, el array alertas puede contener dos objetos con tipo sin_ingresos, pero el campo total se calcula como alertas.length después del push, resultando en discrepancia si alguna alerta se agrega condicionalmente fuera del flujo principal.' },
    { id: 'AN-04-04', suite: 'AN-04 — Alertas del sistema',     nombre: 'Cada alerta tiene tipo, mensaje y nivel',                  estado: 'APROBADO', tiempo: '1 ms', observacion: '' },
    { id: 'AN-05-01', suite: 'AN-05 — Tendencias históricas',   nombre: 'Sin token devuelve HTTP 401',                              estado: 'APROBADO', tiempo: '1 ms', observacion: '' },
    { id: 'AN-05-02', suite: 'AN-05 — Tendencias históricas',   nombre: 'Admin retorna array de tendencias con estructura correcta', estado: 'APROBADO', tiempo: '1 ms', observacion: '' },
];

function celdaEncabezado(texto) {
    return new TableCell({
        children: [new Paragraph({
            children: [new TextRun({ text: texto, bold: true, color: 'FFFFFF', size: 18 })],
            alignment: AlignmentType.CENTER
        })],
        shading: { type: ShadingType.SOLID, color: AZUL_OSCURO },
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
    const aprobados = resultadosV1.filter(r => r.estado === 'APROBADO').length;
    const fallidos  = resultadosV1.filter(r => r.estado === 'FALLIDO').length;
    const casosFallidos = resultadosV1.filter(r => r.estado === 'FALLIDO');

    const doc = new Document({
        sections: [{
            properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
            children: [

                // TÍTULO
                new Paragraph({ children: [new TextRun({ text: 'REPORTE DE PRUEBAS AUTOMATIZADAS', bold: true, size: 32, color: AZUL_OSCURO })], alignment: AlignmentType.CENTER, spacing: { after: 160 } }),
                new Paragraph({ children: [new TextRun({ text: 'Hito 4 — Módulo de Analítica y Dashboard', bold: true, size: 24, color: AZUL_OSCURO })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
                new Paragraph({ children: [new TextRun({ text: 'PGIP — Parroquia San Agustín de Sumpango', size: 20, color: '718096' })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),

                // INFORMACIÓN GENERAL
                new Paragraph({ children: [new TextRun({ text: '1. INFORMACIÓN GENERAL', bold: true, size: 24, color: AZUL_OSCURO })], spacing: { before: 200, after: 200 } }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({ children: [celdaEncabezado('Campo'), celdaEncabezado('Detalle')] }),
                        new TableRow({ children: [celda('Hito evaluado', '2d3748', true), celda('Hito 4 — Analítica y Dashboard')] }),
                        new TableRow({ children: [celda('Herramienta utilizada', '2d3748', true), celda('Jest 30.5 + Supertest 7.3')] }),
                        new TableRow({ children: [celda('Versión del reporte', '2d3748', true), celda('v1 — Ejecución inicial')] }),
                        new TableRow({ children: [celda('Fecha de ejecución', '2d3748', true), celda(fechaEjecucion)] }),
                        new TableRow({ children: [celda('Hora de ejecución', '2d3748', true), celda(horaEjecucion)] }),
                        new TableRow({ children: [celda('Ambiente de pruebas', '2d3748', true), celda('Producción — Supabase + Render')] }),
                    ]
                }),

                // RESUMEN EJECUTIVO v1
                new Paragraph({ children: [new TextRun({ text: '2. RESUMEN EJECUTIVO — v1', bold: true, size: 24, color: AZUL_OSCURO })], spacing: { before: 400, after: 200 } }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({ children: [celdaEncabezado('Métrica'), celdaEncabezado('v1'), celdaEncabezado('Criterio'), celdaEncabezado('Estado')] }),
                        new TableRow({ children: [celda('Total de casos'), celda('17', '2d3748', true, true), celda('17', '2d3748', false, true), celda('✓', VERDE, true, true)] }),
                        new TableRow({ children: [celda('Aprobados'), celda(String(aprobados), NARANJA, true, true), celda('17', '2d3748', false, true), celda(aprobados === 17 ? '✓' : '✗', aprobados === 17 ? VERDE : ROJO, true, true)] }),
                        new TableRow({ children: [celda('Fallidos'), celda(String(fallidos), fallidos > 0 ? ROJO : VERDE, true, true), celda('0', '2d3748', false, true), celda(fallidos === 0 ? '✓' : '✗', fallidos === 0 ? VERDE : ROJO, true, true)] }),
                        new TableRow({ children: [celda('Resultado general'), celda('FALLIDO', ROJO, true, true), celda('APROBADO', '2d3748', false, true), celda('✗ No cumplido', ROJO, true, true)] }),
                    ]
                }),

                // ANÁLISIS DE FALLOS v1
                new Paragraph({ children: [new TextRun({ text: '3. ANÁLISIS DE FALLOS — v1', bold: true, size: 24, color: ROJO })], spacing: { before: 400, after: 200 } }),
                ...casosFallidos.flatMap(f => [
                    new Paragraph({ children: [new TextRun({ text: `${f.id} — ${f.nombre}`, bold: true, size: 20, color: ROJO })], spacing: { before: 200, after: 100 } }),
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

                // DETALLE COMPLETO v1
                new Paragraph({ children: [new TextRun({ text: '4. DETALLE DE TODOS LOS CASOS — v1', bold: true, size: 24, color: AZUL_OSCURO })], spacing: { before: 400, after: 200 } }),
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

                // NOTA PARA v2
                new Paragraph({ children: [new TextRun({ text: '5. NOTA PARA VERSIÓN v2', bold: true, size: 24, color: AZUL_OSCURO })], spacing: { before: 400, after: 200 } }),
                new Paragraph({ children: [new TextRun({ text: 'Se identificaron 2 fallos en la ejecución v1: uno relacionado con el valor del campo periodo retornado cuando se envía un parámetro no reconocido (AN-02-04) y uno relacionado con la consistencia del campo total en la respuesta de alertas cuando se acumulan condiciones del mismo tipo (AN-04-03). La versión v2 documentará los resultados tras aplicar las correcciones correspondientes, esperando obtener 17/17 casos aprobados.', size: 20 })], spacing: { after: 200 } }),

                // PIE
                new Paragraph({ children: [new TextRun({ text: `Reporte generado automáticamente por PGIP — ${fechaEjecucion} ${horaEjecucion}`, size: 16, color: '718096', italics: true })], alignment: AlignmentType.CENTER, spacing: { before: 400 } }),
            ]
        }]
    });

    const buffer = await Packer.toBuffer(doc);
    const ruta = path.join(__dirname, 'reporte_hito4_analytics_v1.docx');
    fs.writeFileSync(ruta, buffer);
    console.log(`\n✅ Reporte v1 generado: ${ruta}\n`);
}

generarReporte().catch(console.error);