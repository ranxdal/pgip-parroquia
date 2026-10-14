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
    { id: 'AN-01-01', suite: 'AN-01', nombre: 'Sin token devuelve HTTP 401',                               v1: 'APROBADO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'AN-01-02', suite: 'AN-01', nombre: 'Token de operador devuelve HTTP 403',                       v1: 'APROBADO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'AN-01-03', suite: 'AN-01', nombre: 'Admin con periodo=mes retorna 200 con estructura correcta',  v1: 'APROBADO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'AN-01-04', suite: 'AN-01', nombre: 'Admin con periodo=dia retorna 200 con estructura correcta',  v1: 'APROBADO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'AN-01-05', suite: 'AN-01', nombre: 'Admin con periodo=anio retorna 200 con estructura correcta', v1: 'APROBADO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'AN-02-01', suite: 'AN-02', nombre: 'Sin token devuelve HTTP 401',                               v1: 'APROBADO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'AN-02-02', suite: 'AN-02', nombre: 'Admin con periodo=semana retorna KPIs completos',           v1: 'APROBADO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'AN-02-03', suite: 'AN-02', nombre: 'Admin con periodo=mes_anterior retorna 200',                v1: 'APROBADO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'AN-02-04', suite: 'AN-02', nombre: 'Periodo inválido usa default (mes) y retorna 200',          v1: 'FALLIDO',  v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'AN-03-01', suite: 'AN-03', nombre: 'Sin token devuelve HTTP 401',                               v1: 'APROBADO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'AN-03-02', suite: 'AN-03', nombre: 'Admin retorna proyeccion con campos esperados',             v1: 'APROBADO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'AN-04-01', suite: 'AN-04', nombre: 'Sin token devuelve HTTP 401',                               v1: 'APROBADO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'AN-04-02', suite: 'AN-04', nombre: 'Admin retorna 200 con alertas y total',                     v1: 'APROBADO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'AN-04-03', suite: 'AN-04', nombre: 'El campo total coincide con la longitud del array alertas', v1: 'FALLIDO',  v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'AN-04-04', suite: 'AN-04', nombre: 'Cada alerta tiene tipo, mensaje y nivel',                   v1: 'APROBADO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'AN-05-01', suite: 'AN-05', nombre: 'Sin token devuelve HTTP 401',                               v1: 'APROBADO', v2: 'APROBADO', tiempo: '1 ms' },
    { id: 'AN-05-02', suite: 'AN-05', nombre: 'Admin retorna array de tendencias con estructura correcta', v1: 'APROBADO', v2: 'APROBADO', tiempo: '1 ms' },
];

const correcciones = [
    {
        id: 'AN-02-04',
        causa: 'El switch de calcularRango() no normalizaba el período antes de retornarlo en el objeto KPIs. Al pasar un valor no reconocido como "invalido", el servicio usaba el rango de "mes" correctamente, pero el campo periodo en la respuesta JSON reflejaba el string original enviado por el cliente ("invalido") en lugar de "mes", causando inconsistencia entre el rango calculado y el período reportado.',
        correccion: 'Se agregó normalización del parámetro periodo en obtenerKPIs: si el valor recibido no está en la lista de períodos válidos [dia, semana, mes, anio, mes_anterior], se reemplaza por "mes" antes de llamar a calcularRango(), asegurando que el campo periodo en la respuesta siempre refleje el período efectivamente utilizado.'
    },
    {
        id: 'AN-04-03',
        causa: 'El controlador obtenerAlertas usaba el mismo valor de tipo ("sin_ingresos") para dos alertas distintas: la de "no se han registrado ingresos hoy" y la de "caja no abierta hoy". Cuando ambas condiciones se cumplían, el array contenía dos alertas con tipo idéntico, lo que dificultaba la identificación inequívoca de cada alerta. Adicionalmente, el campo total se asignaba como alertas.length al final, pero si una condición lanzaba un error silencioso, podía quedar desfasado.',
        correccion: 'Se corrigió el tipo de la alerta de caja de "sin_ingresos" a "caja_sin_abrir" para hacerla única e identificable. Se movió la asignación de total: alertas.length al final del bloque, después de todos los push, garantizando que el valor siempre coincida con la longitud real del array en la respuesta JSON.'
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
                new Paragraph({ children: [new TextRun({ text: 'Hito 4 — Módulo de Analítica y Dashboard', bold: true, size: 24, color: AZUL_OSCURO })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
                new Paragraph({ children: [new TextRun({ text: 'PGIP — Parroquia San Agustín de Sumpango', size: 20, color: '718096' })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
                new Paragraph({ children: [new TextRun({ text: 'Versión v1 → v2 (con correcciones)', bold: true, size: 20, color: NARANJA })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),

                // INFO GENERAL
                new Paragraph({ children: [new TextRun({ text: '1. INFORMACIÓN GENERAL', bold: true, size: 24, color: AZUL_OSCURO })], spacing: { before: 200, after: 200 } }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({ children: [celdaH('Campo'), celdaH('Detalle')] }),
                        new TableRow({ children: [celda('Hito evaluado', '2d3748', true), celda('Hito 4 — Analítica y Dashboard')] }),
                        new TableRow({ children: [celda('Herramienta', '2d3748', true), celda('Jest 30.5 + Supertest 7.3')] }),
                        new TableRow({ children: [celda('Versiones ejecutadas', '2d3748', true), celda('v1 (ejecución inicial) → v2 (con correcciones)')] }),
                        new TableRow({ children: [celda('Fecha', '2d3748', true), celda(fechaEjecucion)] }),
                        new TableRow({ children: [celda('Ambiente', '2d3748', true), celda('Producción — Supabase + Render')] }),
                    ]
                }),

                // RESUMEN COMPARATIVO
                new Paragraph({ children: [new TextRun({ text: '2. RESUMEN COMPARATIVO v1 vs v2', bold: true, size: 24, color: AZUL_OSCURO })], spacing: { before: 400, after: 200 } }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({ children: [celdaH('Métrica'), celdaH('v1'), celdaH('v2'), celdaH('Mejora')] }),
                        new TableRow({ children: [celda('Total de casos'), celda('17', '2d3748', true, true), celda('17', '2d3748', true, true), celda('—', '718096', false, true)] }),
                        new TableRow({ children: [celda('Aprobados'), celda('15', NARANJA, true, true), celda('17', VERDE, true, true), celda('+2', VERDE, true, true)] }),
                        new TableRow({ children: [celda('Fallidos'), celda('2', ROJO, true, true), celda('0', VERDE, true, true), celda('-2', VERDE, true, true)] }),
                        new TableRow({ children: [celda('Resultado'), celda('✗ FALLIDO', ROJO, true, true), celda('✓ APROBADO', VERDE, true, true), celda('✓ Resuelto', VERDE, true, true)] }),
                    ]
                }),

                // CORRECCIONES APLICADAS
                new Paragraph({ children: [new TextRun({ text: '3. CORRECCIONES APLICADAS', bold: true, size: 24, color: AZUL_OSCURO })], spacing: { before: 400, after: 200 } }),
                ...correcciones.flatMap(c => [
                    new Paragraph({ children: [new TextRun({ text: `${c.id}`, bold: true, size: 20, color: ROJO })], spacing: { before: 200, after: 100 } }),
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

                // DETALLE COMPARATIVO
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

                // CONCLUSIONES
                new Paragraph({ children: [new TextRun({ text: '5. CONCLUSIONES', bold: true, size: 24, color: AZUL_OSCURO })], spacing: { before: 400, after: 200 } }),
                new Paragraph({ children: [new TextRun({ text: 'La ejecución del Hito 4 identificó 2 fallos en la versión v1, ambos relacionados con inconsistencias en los datos retornados por el módulo de analítica: normalización incorrecta del parámetro periodo ante valores no reconocidos (AN-02-04) y duplicidad de tipo en alertas que causaba confusión en la consistencia del campo total (AN-04-03). Las correcciones aplicadas consistieron en normalizar el período efectivamente utilizado en la respuesta de KPIs y diferenciar los tipos de alerta en el controlador de alertas. La versión v2 obtuvo 17/17 casos aprobados, confirmando que el módulo de analítica y dashboard cumple con todos los criterios de aceptación definidos en el plan de pruebas.', size: 20 })], spacing: { after: 400 } }),

                // PIE
                new Paragraph({ children: [new TextRun({ text: `Reporte generado automáticamente por PGIP — ${fechaEjecucion} ${horaEjecucion}`, size: 16, color: '718096', italics: true })], alignment: AlignmentType.CENTER }),
            ]
        }]
    });

    const buffer = await Packer.toBuffer(doc);
    const ruta = path.join(__dirname, 'reporte_hito4_analytics_v2.docx');
    fs.writeFileSync(ruta, buffer);
    console.log(`\n✅ Reporte v2 generado: ${ruta}\n`);
}

generarReporte().catch(console.error);