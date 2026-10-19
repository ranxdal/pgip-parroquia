const pool = require('../services/db');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        WidthType, AlignmentType, HeadingLevel, BorderStyle } = require('docx');

// ─── Registrar intención de misa ─────────────────────────────────────────────
const registrarIntencion = async (req, res) => {
    const { fecha_misa, nombre_familia, intencion, texto_lectura } = req.body;

    if (!fecha_misa || !nombre_familia || !intencion) {
        return res.status(400).json({ error: 'fecha_misa, nombre_familia e intencion son requeridos' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO intenciones_misa (fecha_misa, nombre_familia, intencion, texto_lectura, creado_por)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [fecha_misa, nombre_familia, intencion, texto_lectura || null, req.usuario?.id || null]
        );
        res.status(201).json({ mensaje: 'Intención registrada', intencion: result.rows[0] });
    } catch (err) {
        console.error('Error al registrar intención:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// ─── Listar intenciones por fecha ─────────────────────────────────────────────
const listarIntencionesPorFecha = async (req, res) => {
    const { fecha } = req.params;

    if (!fecha) {
        return res.status(400).json({ error: 'Fecha requerida' });
    }

    try {
        const result = await pool.query(
            `SELECT * FROM intenciones_misa
             WHERE fecha_misa = $1
             ORDER BY created_at ASC`,
            [fecha]
        );
        res.json({ intenciones: result.rows });
    } catch (err) {
        console.error('Error al listar intenciones:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// ─── Listar todas las intenciones ─────────────────────────────────────────────
const listarIntenciones = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM intenciones_misa ORDER BY fecha_misa DESC, created_at DESC LIMIT 100`
        );
        res.json({ intenciones: result.rows });
    } catch (err) {
        console.error('Error al listar intenciones:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// ─── Actualizar intención ─────────────────────────────────────────────────────
const actualizarIntencion = async (req, res) => {
    const { id } = req.params;
    const { nombre_familia, intencion, texto_lectura } = req.body;

    try {
        const result = await pool.query(
            `UPDATE intenciones_misa
             SET nombre_familia = COALESCE($1, nombre_familia),
                 intencion      = COALESCE($2, intencion),
                 texto_lectura  = COALESCE($3, texto_lectura),
                 updated_at     = NOW()
             WHERE id = $4
             RETURNING *`,
            [nombre_familia, intencion, texto_lectura, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Intención no encontrada' });
        }
        res.json({ mensaje: 'Intención actualizada', intencion: result.rows[0] });
    } catch (err) {
        console.error('Error al actualizar intención:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// ─── Eliminar intención ───────────────────────────────────────────────────────
const eliminarIntencion = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'DELETE FROM intenciones_misa WHERE id = $1 RETURNING id',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Intención no encontrada' });
        }
        res.json({ mensaje: 'Intención eliminada' });
    } catch (err) {
        console.error('Error al eliminar intención:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// ─── Exportar a Word ──────────────────────────────────────────────────────────
const exportarWordPorFecha = async (req, res) => {
    const { fecha } = req.params;

    try {
        const result = await pool.query(
            `SELECT * FROM intenciones_misa
             WHERE fecha_misa = $1
             ORDER BY created_at ASC`,
            [fecha]
        );

        const intenciones = result.rows;

        // Formatear fecha para el título
        const [anio, mes, dia] = fecha.split('-');
        const meses = ['enero','febrero','marzo','abril','mayo','junio',
                       'julio','agosto','septiembre','octubre','noviembre','diciembre'];
        const fechaFormato = `${parseInt(dia)} de ${meses[parseInt(mes)-1]} de ${anio}`;

        // Construir secciones por cada intención
        const secciones = [];

        intenciones.forEach((item, idx) => {
            secciones.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `${idx + 1}. Familia ${item.nombre_familia}`,
                            bold: true,
                            size: 24,
                        })
                    ],
                    spacing: { before: 200, after: 100 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: 'Intención: ',
                            bold: true,
                            size: 22,
                        }),
                        new TextRun({
                            text: item.intencion,
                            size: 22,
                        })
                    ],
                    spacing: { after: 80 }
                })
            );

            if (item.texto_lectura) {
                secciones.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'Texto para la misa:',
                                bold: true,
                                italics: true,
                                size: 22,
                            })
                        ],
                        spacing: { after: 60 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: item.texto_lectura,
                                size: 22,
                                italics: true,
                            })
                        ],
                        spacing: { after: 200 }
                    })
                );
            }

            // Separador entre intenciones
            if (idx < intenciones.length - 1) {
                secciones.push(
                    new Paragraph({
                        children: [new TextRun({ text: '─'.repeat(60), color: 'AAAAAA', size: 18 })],
                        spacing: { before: 100, after: 100 }
                    })
                );
            }
        });

        if (intenciones.length === 0) {
            secciones.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: 'No hay intenciones registradas para esta fecha.',
                            italics: true,
                            size: 22,
                            color: '888888'
                        })
                    ]
                })
            );
        }

        const doc = new Document({
            sections: [{
                properties: {
                    page: {
                        margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }
                    }
                },
                children: [
                    // Encabezado principal
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: 'PARROQUIA',
                                bold: true,
                                size: 28,
                                allCaps: true,
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 100 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `INTENCIONES DE MISA`,
                                bold: true,
                                size: 32,
                                allCaps: true,
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 100 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: fechaFormato,
                                bold: true,
                                size: 26,
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 80 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `Total de intenciones: ${intenciones.length}`,
                                size: 22,
                                color: '555555'
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 }
                    }),
                    // Línea divisoria como borde inferior de párrafo
                    new Paragraph({
                        children: [],
                        border: { bottom: { color: '2b6cb0', size: 6, style: BorderStyle.SINGLE } },
                        spacing: { after: 400 }
                    }),
                    // Intenciones
                    ...secciones
                ]
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        const filename = `intenciones_misa_${fecha}.docx`;
        res.setHeader('Content-Type',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);

    } catch (err) {
        console.error('Error al exportar Word:', err);
        res.status(500).json({ error: 'Error al generar documento Word' });
    }
};

module.exports = {
    registrarIntencion,
    listarIntencionesPorFecha,
    listarIntenciones,
    actualizarIntencion,
    eliminarIntencion,
    exportarWordPorFecha
};