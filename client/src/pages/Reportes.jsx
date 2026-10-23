import { useState } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import styles from './Reportes.module.css';

/* ─── Helpers de fecha ──────────────────────────────────────────── */
function fechaLocal(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function hoy()  { return fechaLocal(new Date()); }
function hace(dias) {
    const d = new Date(); d.setDate(d.getDate() - dias); return fechaLocal(d);
}

const PERIODOS_RAPIDOS = [
    { etiqueta: 'Hoy',         desde: () => hoy(),     hasta: () => hoy()    },
    { etiqueta: 'Esta semana', desde: () => hace(6),   hasta: () => hoy()    },
    { etiqueta: 'Este mes',    desde: () => hace(29),  hasta: () => hoy()    },
    { etiqueta: 'Este año',    desde: () => hace(364), hasta: () => hoy()    },
];

const ETIQUETAS_CONCEPTO = {
    intencion_misa:           'Intencion de Misa',
    certificado_bautismo:     'Certificado Bautismo',
    certificado_confirmacion: 'Certificado Confirmacion',
    certificado_matrimonio:   'Certificado Matrimonio',
};

const ETIQUETAS_CERT = {
    bautismo:     'Bautismo',
    confirmacion: 'Confirmacion',
    matrimonio:   'Matrimonio',
};

/* ─── PDF base ───────────────────────────────────────────────────── */
function pdfBase(titulo, desde, hasta) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PARROQUIA SAN AGUSTIN DE SUMPANGO, SACATEPEQUEZ', 148, 14, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(titulo, 148, 21, { align: 'center' });
    doc.text(`Periodo: ${desde}  al  ${hasta}`, 148, 27, { align: 'center' });
    doc.setLineWidth(0.4);
    doc.line(14, 30, 283, 30);
    return doc;
}

/* ══════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════════════════════ */
export default function Reportes() {
    const [tipo,     setTipo]     = useState('tesoreria');
    const [desde,    setDesde]    = useState(hace(29));
    const [hasta,    setHasta]    = useState(hoy());
    const [datos,    setDatos]    = useState(null);
    const [cargando, setCargando] = useState(false);
    const [error,    setError]    = useState('');

    /* ── Generar reporte ── */
    const generarReporte = async () => {
        setCargando(true); setError(''); setDatos(null);
        try {
            const { data } = await api.get(`/reportes/${tipo}?desde=${desde}&hasta=${hasta}`);
            setDatos(data);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al obtener datos');
        } finally {
            setCargando(false);
        }
    };

    const aplicarPeriodo = (p) => { setDesde(p.desde()); setHasta(p.hasta()); setDatos(null); };

    /* ══════════════════════════════════════════════════════════════
       EXPORTAR PDF
    ══════════════════════════════════════════════════════════════ */
    const exportarPDF = () => {
        if (!datos) return;
        const doc = pdfBase(
            tipo === 'tesoreria'    ? 'REPORTE DE TESORERIA - INGRESOS' :
            tipo === 'intenciones'  ? 'REPORTE DE INTENCIONES DE MISA'  :
                                     'REPORTE DE CERTIFICADOS EMITIDOS',
            desde, hasta
        );

        let y = 36;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);

        if (tipo === 'tesoreria') {
            doc.text(
                `Total ingresos: Q${parseFloat(datos.resumen.total_ingresos).toFixed(2)}   |   Total cobros: ${datos.resumen.total_transacciones}`,
                14, y
            );
            y += 6;

            if (datos.por_concepto?.length) {
                autoTable(doc, {
                    startY: y,
                    head: [['Concepto', 'Cantidad', 'Total (Q)']],
                    body: datos.por_concepto.map(c => [
                        ETIQUETAS_CONCEPTO[c.concepto] || c.concepto || 'Sin concepto',
                        c.cantidad,
                        `Q${parseFloat(c.total).toFixed(2)}`,
                    ]),
                    theme: 'grid',
                    headStyles: { fillColor: [201, 151, 58], textColor: 255, fontStyle: 'bold' },
                    styles: { fontSize: 8 },
                    margin: { left: 14, right: 14 },
                    tableWidth: 120,
                });
                y = doc.lastAutoTable.finalY + 8;
            }

            doc.setFont('helvetica', 'bold');
            doc.text('Detalle de cobros:', 14, y); y += 2;
            autoTable(doc, {
                startY: y,
                head: [['Correlativo','Fecha','Hora','Tipo pago','Concepto','Monto (Q)','Emitido por']],
                body: datos.transacciones.map(t => [
                    t.correlativo, t.fecha, t.hora,
                    t.tipo === 'efectivo' ? 'Efectivo' : 'Transferencia',
                    ETIQUETAS_CONCEPTO[t.concepto] || t.concepto || '-',
                    `Q${parseFloat(t.monto).toFixed(2)}`,
                    `${t.nombre_usuario || ''} ${t.apellido_usuario || ''}`.trim() || '-',
                ]),
                theme: 'striped',
                headStyles: { fillColor: [44, 26, 14], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 7.5 },
                margin: { left: 14, right: 14 },
            });
            doc.save(`reporte_tesoreria_${desde}_${hasta}.pdf`);

        } else if (tipo === 'intenciones') {
            doc.text(`Total intenciones: ${datos.resumen.total}`, 14, y); y += 4;
            autoTable(doc, {
                startY: y,
                head: [['Fecha misa','Familia','Intencion','Lectura','Registrado por']],
                body: datos.intenciones.map(i => [
                    i.fecha_misa,
                    i.nombre_familia || '-',
                    i.intencion || '-',
                    i.texto_lectura || '-',
                    `${i.nombre_usuario || ''} ${i.apellido_usuario || ''}`.trim() || '-',
                ]),
                theme: 'striped',
                headStyles: { fillColor: [44, 26, 14], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 8 },
                margin: { left: 14, right: 14 },
            });
            doc.save(`reporte_intenciones_${desde}_${hasta}.pdf`);

        } else if (tipo === 'certificados') {
            const totalCert  = datos.resumen.reduce((s, r) => s + parseInt(r.cantidad), 0);
            const totalMonto = datos.resumen.reduce((s, r) => s + parseFloat(r.total), 0);
            doc.text(`Total certificados: ${totalCert}   |   Ingresos: Q${totalMonto.toFixed(2)}`, 14, y); y += 4;

            autoTable(doc, {
                startY: y,
                head: [['Tipo','Cantidad','Total (Q)']],
                body: datos.resumen.map(r => [
                    ETIQUETAS_CERT[r.tipo_certificado] || r.tipo_certificado || '-',
                    r.cantidad,
                    `Q${parseFloat(r.total).toFixed(2)}`,
                ]),
                theme: 'grid',
                headStyles: { fillColor: [201, 151, 58], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 8 },
                margin: { left: 14, right: 14 },
                tableWidth: 100,
            });
            y = doc.lastAutoTable.finalY + 8;

            autoTable(doc, {
                startY: y,
                head: [['Correlativo','Fecha','Tipo certificado','Monto (Q)','Emitido por']],
                body: datos.certificados.map(c => [
                    c.correlativo, c.fecha,
                    ETIQUETAS_CERT[c.tipo_certificado] || c.tipo_certificado || '-',
                    `Q${parseFloat(c.monto).toFixed(2)}`,
                    `${c.nombre_usuario || ''} ${c.apellido_usuario || ''}`.trim() || '-',
                ]),
                theme: 'striped',
                headStyles: { fillColor: [44, 26, 14], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 8 },
                margin: { left: 14, right: 14 },
            });
            doc.save(`reporte_certificados_${desde}_${hasta}.pdf`);
        }
    };

    /* ══════════════════════════════════════════════════════════════
       EXPORTAR EXCEL
    ══════════════════════════════════════════════════════════════ */
    const exportarExcel = () => {
        if (!datos) return;
        const wb = XLSX.utils.book_new();

        if (tipo === 'tesoreria') {
            // Hoja resumen por concepto
            const resumenRows = [
                ['Concepto', 'Cantidad', 'Total (Q)'],
                ...datos.por_concepto.map(c => [
                    ETIQUETAS_CONCEPTO[c.concepto] || c.concepto || 'Sin concepto',
                    parseInt(c.cantidad),
                    parseFloat(c.total),
                ]),
                [],
                ['TOTAL INGRESOS', datos.resumen.total_transacciones, parseFloat(datos.resumen.total_ingresos)],
            ];
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumenRows), 'Resumen');

            // Hoja detalle
            const detalleRows = [
                ['Correlativo','Fecha','Hora','Tipo pago','Concepto','Monto','Emitido por'],
                ...datos.transacciones.map(t => [
                    t.correlativo, t.fecha, t.hora,
                    t.tipo === 'efectivo' ? 'Efectivo' : 'Transferencia',
                    ETIQUETAS_CONCEPTO[t.concepto] || t.concepto || '-',
                    parseFloat(t.monto),
                    `${t.nombre_usuario || ''} ${t.apellido_usuario || ''}`.trim() || '-',
                ]),
            ];
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detalleRows), 'Detalle cobros');
            XLSX.writeFile(wb, `tesoreria_${desde}_${hasta}.xlsx`);

        } else if (tipo === 'intenciones') {
            const rows = [
                ['Fecha misa','Familia','Intencion','Lectura','Registrado por'],
                ...datos.intenciones.map(i => [
                    i.fecha_misa,
                    i.nombre_familia || '-',
                    i.intencion || '-',
                    i.texto_lectura || '-',
                    `${i.nombre_usuario || ''} ${i.apellido_usuario || ''}`.trim() || '-',
                ]),
            ];
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Intenciones');
            XLSX.writeFile(wb, `intenciones_${desde}_${hasta}.xlsx`);

        } else if (tipo === 'certificados') {
            const resumenRows = [
                ['Tipo','Cantidad','Total (Q)'],
                ...datos.resumen.map(r => [
                    ETIQUETAS_CERT[r.tipo_certificado] || r.tipo_certificado || '-',
                    parseInt(r.cantidad),
                    parseFloat(r.total),
                ]),
            ];
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumenRows), 'Resumen');

            const detalleRows = [
                ['Correlativo','Fecha','Tipo certificado','Monto','Emitido por'],
                ...datos.certificados.map(c => [
                    c.correlativo, c.fecha,
                    ETIQUETAS_CERT[c.tipo_certificado] || c.tipo_certificado || '-',
                    parseFloat(c.monto),
                    `${c.nombre_usuario || ''} ${c.apellido_usuario || ''}`.trim() || '-',
                ]),
            ];
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detalleRows), 'Detalle');
            XLSX.writeFile(wb, `certificados_${desde}_${hasta}.xlsx`);
        }
    };

    /* ══════════════════════════════════════════════════════════════
       RENDER
    ══════════════════════════════════════════════════════════════ */
    return (
        <div className={styles.contenedor}>
            <Navbar />
            <div className={styles.contenido}>
                <h1 className={styles.titulo}>Generacion de Reportes</h1>

                {/* Selector tipo */}
                <div className={styles.tipoGrid}>
                    {[
                        { valor: 'tesoreria',    etiqueta: 'Tesoreria' },
                        { valor: 'intenciones',  etiqueta: 'Intenciones de Misa' },
                        { valor: 'certificados', etiqueta: 'Certificados' },
                    ].map(t => (
                        <button
                            key={t.valor}
                            className={`${styles.tipoBtn} ${tipo === t.valor ? styles.tipoBtnActivo : ''}`}
                            onClick={() => { setTipo(t.valor); setDatos(null); }}>
                            {t.etiqueta}
                        </button>
                    ))}
                </div>

                {/* Filtros */}
                <div className={styles.filtrosPanel}>
                    <div className={styles.periodoRapido}>
                        {PERIODOS_RAPIDOS.map(p => (
                            <button key={p.etiqueta} className={styles.periodoBtn}
                                onClick={() => aplicarPeriodo(p)}>
                                {p.etiqueta}
                            </button>
                        ))}
                    </div>
                    <div className={styles.fechasCustom}>
                        <div className={styles.campo}>
                            <label className={styles.etiqueta}>Desde</label>
                            <input type="date" value={desde}
                                onChange={e => { setDesde(e.target.value); setDatos(null); }}
                                className={styles.inputFecha} />
                        </div>
                        <div className={styles.campo}>
                            <label className={styles.etiqueta}>Hasta</label>
                            <input type="date" value={hasta}
                                onChange={e => { setHasta(e.target.value); setDatos(null); }}
                                className={styles.inputFecha} />
                        </div>
                        <button className={styles.botonGenerar} onClick={generarReporte} disabled={cargando}>
                            {cargando ? 'Generando...' : 'Generar reporte'}
                        </button>
                    </div>
                </div>

                {error && <div className={styles.errorDiv}>❌ {error}</div>}

                {/* Resultados */}
                {datos && (
                    <div className={styles.resultados}>
                        <div className={styles.exportBar}>
                            <span className={styles.exportLabel}>Exportar:</span>
                            <button className={styles.botonPDF}   onClick={exportarPDF}>Descargar PDF</button>
                            <button className={styles.botonExcel} onClick={exportarExcel}>Descargar Excel</button>
                        </div>

                        {/* Tesoreria */}
                        {tipo === 'tesoreria' && (
                            <>
                                <div className={styles.resumenGrid}>
                                    <div className={styles.resumenCard}>
                                        <p className={styles.resumenLabel}>Total ingresos</p>
                                        <p className={styles.resumenValorOro}>Q{parseFloat(datos.resumen.total_ingresos).toFixed(2)}</p>
                                    </div>
                                    <div className={styles.resumenCard}>
                                        <p className={styles.resumenLabel}>Total cobros</p>
                                        <p className={styles.resumenValor}>{datos.resumen.total_transacciones}</p>
                                    </div>
                                    {datos.por_concepto.map(c => (
                                        <div key={c.concepto} className={styles.resumenCard}>
                                            <p className={styles.resumenLabel}>{ETIQUETAS_CONCEPTO[c.concepto] || 'Sin concepto'}</p>
                                            <p className={styles.resumenValorOro}>Q{parseFloat(c.total).toFixed(2)}</p>
                                            <p className={styles.resumenSub}>{c.cantidad} cobro{parseInt(c.cantidad) !== 1 ? 's' : ''}</p>
                                        </div>
                                    ))}
                                </div>
                                <TablaReporte
                                    cabeceras={['Correlativo','Fecha','Hora','Tipo pago','Concepto','Monto','Emitido por']}
                                    filas={datos.transacciones.map(t => [
                                        <code key="c">{t.correlativo}</code>,
                                        t.fecha, t.hora,
                                        t.tipo === 'efectivo' ? 'Efectivo' : 'Transferencia',
                                        ETIQUETAS_CONCEPTO[t.concepto] || t.concepto || '-',
                                        <strong key="m">Q{parseFloat(t.monto).toFixed(2)}</strong>,
                                        `${t.nombre_usuario || ''} ${t.apellido_usuario || ''}`.trim() || '-',
                                    ])}
                                />
                            </>
                        )}

                        {/* Intenciones */}
                        {tipo === 'intenciones' && (
                            <>
                                <div className={styles.resumenGrid}>
                                    <div className={styles.resumenCard}>
                                        <p className={styles.resumenLabel}>Total intenciones</p>
                                        <p className={styles.resumenValor}>{datos.resumen.total}</p>
                                    </div>
                                </div>
                                <TablaReporte
                                    cabeceras={['Fecha misa','Familia','Intencion','Lectura','Registrado por']}
                                    filas={datos.intenciones.map(i => [
                                        i.fecha_misa,
                                        i.nombre_familia || '-',
                                        i.intencion || '-',
                                        i.texto_lectura || '-',
                                        `${i.nombre_usuario || ''} ${i.apellido_usuario || ''}`.trim() || '-',
                                    ])}
                                />
                            </>
                        )}

                        {/* Certificados */}
                        {tipo === 'certificados' && (
                            <>
                                <div className={styles.resumenGrid}>
                                    {datos.resumen.map(r => (
                                        <div key={r.tipo_certificado} className={styles.resumenCard}>
                                            <p className={styles.resumenLabel}>{ETIQUETAS_CERT[r.tipo_certificado] || r.tipo_certificado}</p>
                                            <p className={styles.resumenValorOro}>Q{parseFloat(r.total).toFixed(2)}</p>
                                            <p className={styles.resumenSub}>{r.cantidad} emitido{parseInt(r.cantidad) !== 1 ? 's' : ''}</p>
                                        </div>
                                    ))}
                                </div>
                                <TablaReporte
                                    cabeceras={['Correlativo','Fecha','Tipo certificado','Monto','Emitido por']}
                                    filas={datos.certificados.map(c => [
                                        <code key="c">{c.correlativo}</code>,
                                        c.fecha,
                                        ETIQUETAS_CERT[c.tipo_certificado] || c.tipo_certificado || '-',
                                        <strong key="m">Q{parseFloat(c.monto).toFixed(2)}</strong>,
                                        `${c.nombre_usuario || ''} ${c.apellido_usuario || ''}`.trim() || '-',
                                    ])}
                                />
                            </>
                        )}

                        {((tipo === 'tesoreria'    && datos.transacciones.length === 0) ||
                          (tipo === 'intenciones'  && datos.intenciones.length === 0)   ||
                          (tipo === 'certificados' && datos.certificados.length === 0)) && (
                            <p className={styles.sinDatos}>No hay registros en el periodo seleccionado.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function TablaReporte({ cabeceras, filas }) {
    return (
        <div className={styles.tablaContenedor}>
            <table className={styles.tabla}>
                <thead>
                    <tr>{cabeceras.map(c => <th key={c} className={styles.th}>{c}</th>)}</tr>
                </thead>
                <tbody>
                    {filas.map((fila, i) => (
                        <tr key={i}>{fila.map((celda, j) => <td key={j} className={styles.td}>{celda}</td>)}</tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}