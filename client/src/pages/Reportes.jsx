import { useState } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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
    { etiqueta: 'Hoy',        desde: () => hoy(),    hasta: () => hoy()    },
    { etiqueta: 'Esta semana', desde: () => hace(6),  hasta: () => hoy()    },
    { etiqueta: 'Este mes',    desde: () => hace(29), hasta: () => hoy()    },
    { etiqueta: 'Este año',    desde: () => hace(364),hasta: () => hoy()    },
];

const ETIQUETAS_CONCEPTO = {
    intencion_misa:           '🕯️ Intención de Misa',
    certificado_bautismo:     '💧 Certificado Bautismo',
    certificado_confirmacion: '✝️ Certificado Confirmación',
    certificado_matrimonio:   '💍 Certificado Matrimonio',
};

const ETIQUETAS_CERT = {
    bautismo:     '💧 Bautismo',
    confirmacion: '✝️ Confirmación',
    matrimonio:   '💍 Matrimonio',
};

/* ─── CSV helper ────────────────────────────────────────────────── */
function descargarCSV(filas, cabeceras, nombreArchivo) {
    const escape = (v) => {
        const s = v === null || v === undefined ? '' : String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [cabeceras, ...filas.map(f => f.map(escape))].map(r => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = nombreArchivo; a.click();
    URL.revokeObjectURL(url);
}

/* ─── PDF helper ─────────────────────────────────────────────────── */
function pdfBase(titulo, desde, hasta) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('PARROQUIA SAN AGUSTÍN DE SUMPANGO, SACATEPÉQUEZ', 148, 14, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(titulo, 148, 21, { align: 'center' });
    doc.text(`Período: ${desde}  al  ${hasta}`, 148, 27, { align: 'center' });
    doc.setLineWidth(0.4);
    doc.line(14, 30, 283, 30);
    return doc;
}

/* ════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════════════════ */
export default function Reportes() {
    const [tipo,    setTipo]    = useState('tesoreria');  // tesoreria | intenciones | certificados
    const [desde,   setDesde]   = useState(hace(29));
    const [hasta,   setHasta]   = useState(hoy());
    const [datos,   setDatos]   = useState(null);
    const [cargando,setCargando]= useState(false);
    const [error,   setError]   = useState('');

    /* ── Generar reporte ────────────────────────────────────────── */
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

        if (tipo === 'tesoreria') {
            const doc = pdfBase('REPORTE DE TESORERÍA — INGRESOS', desde, hasta);
            // Resumen
            let y = 36;
            doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
            doc.text(`Total ingresos: Q${parseFloat(datos.resumen.total_ingresos).toFixed(2)}`, 14, y);
            doc.text(`Total cobros: ${datos.resumen.total_transacciones}`, 100, y);
            y += 6;

            // Desglose por concepto
            if (datos.por_concepto?.length) {
                doc.text('Desglose por concepto:', 14, y); y += 2;
                doc.autoTable({
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

            // Detalle transacciones
            doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
            doc.text('Detalle de cobros:', 14, y); y += 2;
            doc.autoTable({
                startY: y,
                head: [['Correlativo','Fecha','Hora','Tipo pago','Concepto','Monto (Q)','Emitido por']],
                body: datos.transacciones.map(t => [
                    t.correlativo,
                    t.fecha,
                    t.hora,
                    t.tipo === 'efectivo' ? 'Efectivo' : 'Transferencia',
                    ETIQUETAS_CONCEPTO[t.concepto] || t.concepto || '—',
                    `Q${parseFloat(t.monto).toFixed(2)}`,
                    `${t.nombre_usuario || ''} ${t.apellido_usuario || ''}`.trim() || '—',
                ]),
                theme: 'striped',
                headStyles: { fillColor: [44, 26, 14], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 7.5 },
                margin: { left: 14, right: 14 },
            });
            doc.save(`reporte_tesoreria_${desde}_${hasta}.pdf`);

        } else if (tipo === 'intenciones') {
            const doc = pdfBase('REPORTE DE INTENCIONES DE MISA', desde, hasta);
            let y = 36;
            const r = datos.resumen;
            doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
            doc.text(`Total: ${r.total}  |  Pendientes: ${r.pendientes}  |  Celebradas: ${r.celebradas}  |  Canceladas: ${r.canceladas}`, 14, y);
            y += 6;
            doc.autoTable({
                startY: y,
                head: [['Fecha misa','Feligrés','Misa','Estado','Registrado por']],
                body: datos.intenciones.map(i => [
                    i.fecha_misa,
                    `${i.nombre_feligres || ''} ${i.apellido_feligres || ''}`.trim() || '—',
                    i.misa || '—',
                    i.estado,
                    `${i.nombre_usuario || ''} ${i.apellido_usuario || ''}`.trim() || '—',
                ]),
                theme: 'striped',
                headStyles: { fillColor: [44, 26, 14], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 8 },
                margin: { left: 14, right: 14 },
            });
            doc.save(`reporte_intenciones_${desde}_${hasta}.pdf`);

        } else if (tipo === 'certificados') {
            const doc = pdfBase('REPORTE DE CERTIFICADOS EMITIDOS', desde, hasta);
            let y = 36;
            doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
            const totalCert = datos.resumen.reduce((s, r) => s + parseInt(r.cantidad), 0);
            const totalMonto = datos.resumen.reduce((s, r) => s + parseFloat(r.total), 0);
            doc.text(`Total certificados: ${totalCert}  |  Ingresos: Q${totalMonto.toFixed(2)}`, 14, y); y += 4;
            doc.autoTable({
                startY: y,
                head: [['Tipo','Cantidad','Total (Q)']],
                body: datos.resumen.map(r => [
                    ETIQUETAS_CERT[r.tipo_certificado] || r.tipo_certificado || '—',
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
            doc.autoTable({
                startY: y,
                head: [['Correlativo','Fecha','Tipo certificado','Monto (Q)','Emitido por']],
                body: datos.certificados.map(c => [
                    c.correlativo,
                    c.fecha,
                    ETIQUETAS_CERT[c.tipo_certificado] || c.tipo_certificado || '—',
                    `Q${parseFloat(c.monto).toFixed(2)}`,
                    `${c.nombre_usuario || ''} ${c.apellido_usuario || ''}`.trim() || '—',
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
       EXPORTAR CSV
    ══════════════════════════════════════════════════════════════ */
    const exportarCSV = () => {
        if (!datos) return;

        if (tipo === 'tesoreria') {
            descargarCSV(
                datos.transacciones.map(t => [
                    t.correlativo, t.fecha, t.hora,
                    t.tipo, ETIQUETAS_CONCEPTO[t.concepto] || t.concepto || '',
                    t.monto,
                    `${t.nombre_usuario || ''} ${t.apellido_usuario || ''}`.trim(),
                ]),
                ['Correlativo','Fecha','Hora','Tipo pago','Concepto','Monto','Emitido por'],
                `tesoreria_${desde}_${hasta}.csv`
            );
        } else if (tipo === 'intenciones') {
            descargarCSV(
                datos.intenciones.map(i => [
                    i.fecha_misa,
                    `${i.nombre_feligres || ''} ${i.apellido_feligres || ''}`.trim(),
                    i.misa || '',
                    i.estado,
                    `${i.nombre_usuario || ''} ${i.apellido_usuario || ''}`.trim(),
                ]),
                ['Fecha misa','Feligrés','Misa','Estado','Registrado por'],
                `intenciones_${desde}_${hasta}.csv`
            );
        } else if (tipo === 'certificados') {
            descargarCSV(
                datos.certificados.map(c => [
                    c.correlativo, c.fecha,
                    ETIQUETAS_CERT[c.tipo_certificado] || c.tipo_certificado || '',
                    c.monto,
                    `${c.nombre_usuario || ''} ${c.apellido_usuario || ''}`.trim(),
                ]),
                ['Correlativo','Fecha','Tipo certificado','Monto','Emitido por'],
                `certificados_${desde}_${hasta}.csv`
            );
        }
    };

    /* ══════════════════════════════════════════════════════════════
       RENDER
    ══════════════════════════════════════════════════════════════ */
    return (
        <div className={styles.contenedor}>
            <Navbar />
            <div className={styles.contenido}>
                <h1 className={styles.titulo}>Generación de Reportes</h1>

                {/* ── Selector de tipo ── */}
                <div className={styles.tipoGrid}>
                    {[
                        { valor: 'tesoreria',    icono: '💰', etiqueta: 'Tesorería' },
                        { valor: 'intenciones',  icono: '🕯️', etiqueta: 'Intenciones de Misa' },
                        { valor: 'certificados', icono: '📜', etiqueta: 'Certificados' },
                    ].map(t => (
                        <button
                            key={t.valor}
                            className={`${styles.tipoBtn} ${tipo === t.valor ? styles.tipoBtnActivo : ''}`}
                            onClick={() => { setTipo(t.valor); setDatos(null); }}>
                            <span className={styles.tipoIcono}>{t.icono}</span>
                            <span>{t.etiqueta}</span>
                        </button>
                    ))}
                </div>

                {/* ── Filtros de fecha ── */}
                <div className={styles.filtrosPanel}>
                    <div className={styles.periodoRapido}>
                        {PERIODOS_RAPIDOS.map(p => (
                            <button key={p.etiqueta}
                                className={styles.periodoBtn}
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
                        <button
                            className={styles.botonGenerar}
                            onClick={generarReporte}
                            disabled={cargando}>
                            {cargando ? '⏳ Generando...' : '🔍 Generar reporte'}
                        </button>
                    </div>
                </div>

                {error && <div className={styles.errorDiv}>❌ {error}</div>}

                {/* ── Resultados ── */}
                {datos && (
                    <div className={styles.resultados}>
                        {/* Botones de exportación */}
                        <div className={styles.exportBar}>
                            <span className={styles.exportLabel}>Exportar:</span>
                            <button className={styles.botonPDF} onClick={exportarPDF}>
                                📄 Descargar PDF
                            </button>
                            <button className={styles.botonCSV} onClick={exportarCSV}>
                                📊 Descargar CSV
                            </button>
                        </div>

                        {/* ── Tesorería ── */}
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
                                        t.tipo === 'efectivo' ? '💵 Efectivo' : '📲 Transferencia',
                                        ETIQUETAS_CONCEPTO[t.concepto] || t.concepto || '—',
                                        <strong key="m">Q{parseFloat(t.monto).toFixed(2)}</strong>,
                                        `${t.nombre_usuario || ''} ${t.apellido_usuario || ''}`.trim() || '—',
                                    ])}
                                />
                            </>
                        )}

                        {/* ── Intenciones ── */}
                        {tipo === 'intenciones' && (
                            <>
                                <div className={styles.resumenGrid}>
                                    {[
                                        { label: 'Total',       valor: datos.resumen.total },
                                        { label: 'Pendientes',  valor: datos.resumen.pendientes },
                                        { label: 'Celebradas',  valor: datos.resumen.celebradas },
                                        { label: 'Canceladas',  valor: datos.resumen.canceladas },
                                    ].map(r => (
                                        <div key={r.label} className={styles.resumenCard}>
                                            <p className={styles.resumenLabel}>{r.label}</p>
                                            <p className={styles.resumenValor}>{r.valor}</p>
                                        </div>
                                    ))}
                                </div>
                                <TablaReporte
                                    cabeceras={['Fecha misa','Feligrés','Misa','Estado','Registrado por']}
                                    filas={datos.intenciones.map(i => [
                                        i.fecha_misa,
                                        `${i.nombre_feligres || ''} ${i.apellido_feligres || ''}`.trim() || '—',
                                        i.misa || '—',
                                        <span key="e" className={`${styles.badge} ${
                                            i.estado === 'celebrada' ? styles.badgeVerde :
                                            i.estado === 'cancelada' ? styles.badgeRojo :
                                            styles.badgeAmarillo}`}>{i.estado}</span>,
                                        `${i.nombre_usuario || ''} ${i.apellido_usuario || ''}`.trim() || '—',
                                    ])}
                                />
                            </>
                        )}

                        {/* ── Certificados ── */}
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
                                        ETIQUETAS_CERT[c.tipo_certificado] || c.tipo_certificado || '—',
                                        <strong key="m">Q{parseFloat(c.monto).toFixed(2)}</strong>,
                                        `${c.nombre_usuario || ''} ${c.apellido_usuario || ''}`.trim() || '—',
                                    ])}
                                />
                            </>
                        )}

                        {/* Sin datos */}
                        {((tipo === 'tesoreria'    && datos.transacciones.length === 0) ||
                          (tipo === 'intenciones'  && datos.intenciones.length === 0)   ||
                          (tipo === 'certificados' && datos.certificados.length === 0)) && (
                            <p className={styles.sinDatos}>
                                No hay registros en el período seleccionado.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Sub-componente tabla ─────────────────────────────────────────── */
function TablaReporte({ cabeceras, filas }) {
    return (
        <div className={styles.tablaContenedor}>
            <table className={styles.tabla}>
                <thead>
                    <tr>{cabeceras.map(c => <th key={c} className={styles.th}>{c}</th>)}</tr>
                </thead>
                <tbody>
                    {filas.map((fila, i) => (
                        <tr key={i}>
                            {fila.map((celda, j) => <td key={j} className={styles.td}>{celda}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}