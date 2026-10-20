import { useState } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import styles from './Certificados.module.css';
import jsPDF from 'jspdf';

const TIPO_COLOR = {
    bautismo:     { bg: '#ebf8ff', color: '#2b6cb0' },
    confirmacion: { bg: '#f0fff4', color: '#276749' },
    matrimonio:   { bg: '#fff8f0', color: '#c05621' }
};

const CAMPOS_EDITABLES = ['fecha', 'libro', 'folio', 'partida', 'ministro', 'padrino_1', 'padrino_2'];

export default function Certificados() {
    const [busqueda, setBusqueda] = useState('');
    const [resultados, setResultados] = useState([]);
    const [feligres, setFeligres] = useState(null);
    const [sacramentos, setSacramentos] = useState([]);
    const [sacramentoSeleccionado, setSacramentoSeleccionado] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');

    // Modal editar
    const [modalEditar, setModalEditar] = useState(false);
    const [sacramentoEditando, setSacramentoEditando] = useState(null);
    const [formEditar, setFormEditar] = useState({});
    const [guardando, setGuardando] = useState(false);

    // Modal confirmar eliminar
    const [modalEliminar, setModalEliminar] = useState(false);
    const [sacramentoEliminar, setSacramentoEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);

    const mostrarError = (msg) => { setError(msg); setTimeout(() => setError(''), 4000); };
    const mostrarExito = (msg) => { setExito(msg); setTimeout(() => setExito(''), 3000); };

    // ──────────────────────────────────────────────
    // BÚSQUEDA
    // ──────────────────────────────────────────────
    const buscarFeligres = async () => {
        if (!busqueda.trim()) return;
        setCargando(true);
        try {
            const { data } = await api.get(`/sacramentos/feligres/buscar?termino=${busqueda}`);
            setResultados(data.resultados);
        } catch {
            mostrarError('Error en la búsqueda');
        } finally {
            setCargando(false);
        }
    };

    const seleccionarFeligres = async (f) => {
        setFeligres(f);
        setResultados([]);
        setSacramentoSeleccionado(null);
        try {
            const { data } = await api.get(`/sacramentos/feligres/${f.id}`);
            setSacramentos(data.sacramentos);
        } catch {
            setSacramentos([]);
        }
    };

    const recargarSacramentos = async () => {
        if (!feligres) return;
        try {
            const { data } = await api.get(`/sacramentos/feligres/${feligres.id}`);
            setSacramentos(data.sacramentos);
        } catch { /* silencioso */ }
    };

    // ──────────────────────────────────────────────
    // EDITAR
    // ──────────────────────────────────────────────
    const abrirEditar = (s) => {
        setSacramentoEditando(s);
        setFormEditar({
            fecha:     s.fecha ? s.fecha.slice(0, 10) : '',
            libro:     s.libro     || '',
            folio:     s.folio     || '',
            partida:   s.partida   || '',
            ministro:  s.ministro  || '',
            padrino_1: s.padrino_1 || '',
            padrino_2: s.padrino_2 || '',
        });
        setModalEditar(true);
    };

    const guardarEdicion = async () => {
        setGuardando(true);
        try {
            await api.put(`/sacramentos/${sacramentoEditando.id}`, formEditar);
            mostrarExito('Sacramento actualizado correctamente');
            setModalEditar(false);
            await recargarSacramentos();
            if (sacramentoSeleccionado?.id === sacramentoEditando.id) {
                setSacramentoSeleccionado(null);
            }
        } catch (e) {
            mostrarError(e.response?.data?.error || 'Error al actualizar el sacramento');
        } finally {
            setGuardando(false);
        }
    };

    // ──────────────────────────────────────────────
    // ELIMINAR
    // ──────────────────────────────────────────────
    const abrirEliminar = (s) => {
        setSacramentoEliminar(s);
        setModalEliminar(true);
    };

    const confirmarEliminar = async () => {
        setEliminando(true);
        try {
            await api.delete(`/sacramentos/${sacramentoEliminar.id}`);
            mostrarExito('Sacramento eliminado correctamente');
            setModalEliminar(false);
            if (sacramentoSeleccionado?.id === sacramentoEliminar.id) {
                setSacramentoSeleccionado(null);
            }
            await recargarSacramentos();
        } catch (e) {
            mostrarError(e.response?.data?.error || 'Error al eliminar el sacramento');
        } finally {
            setEliminando(false);
        }
    };

    // ──────────────────────────────────────────────
    // GENERAR CERTIFICADO PDF
    // ──────────────────────────────────────────────
    const generarCertificado = async (sacramento) => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

        const fechaEmision = new Date().toLocaleDateString('es-GT', {
            day: 'numeric', month: 'long', year: 'numeric'
        });

        const partesFecha = sacramento.fecha
            ? sacramento.fecha.slice(0, 10).split('-')
            : ['', '', ''];
        const anioSacramento = partesFecha[0];
        const mesSacramento  = new Date(
            parseInt(partesFecha[0]),
            parseInt(partesFecha[1]) - 1,
            parseInt(partesFecha[2])
        ).toLocaleDateString('es-GT', { month: 'long' });
        const diaSacramento  = parseInt(partesFecha[2]);

        const hoy = new Date();
        const diaEmision  = hoy.getDate();
        const mesEmision  = hoy.toLocaleDateString('es-GT', { month: 'long' });
        const anioEmision = hoy.getFullYear();

        const colores = {
            bautismo:     { r: 26,  g: 54,  b: 93  },
            confirmacion: { r: 20,  g: 83,  b: 45  },
            matrimonio:   { r: 120, g: 53,  b: 15  }
        };
        const color = colores[sacramento.tipo] || colores.bautismo;

        // Borde doble
        doc.setDrawColor(color.r, color.g, color.b);
        doc.setLineWidth(1.5);
        doc.rect(8, 8, 196, 271);
        doc.setLineWidth(0.4);
        doc.rect(11, 11, 190, 265);

        // Logo
        try {
            const logoUrl = new URL('../assets/logo-parroquia.jpg', import.meta.url).href;
            const response = await fetch(logoUrl);
            const blob = await response.blob();
            const reader = new FileReader();
            await new Promise((resolve) => {
                reader.onload = () => {
                    doc.addImage(reader.result, 'JPEG', 14, 14, 32, 26);
                    resolve();
                };
                reader.readAsDataURL(blob);
            });
        } catch { /* logo no disponible */ }

        // Encabezado
        doc.setTextColor(color.r, color.g, color.b);
        doc.setFontSize(15);
        doc.setFont('helvetica', 'bold');
        doc.text('PARROQUIA SAN AGUSTÍN', 125, 21, { align: 'center' });
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text('Vicaría Episcopal de Sacatepéquez', 125, 27, { align: 'center' });
        doc.text('"Santo Hermano Pedro"', 125, 32, { align: 'center' });
        doc.text('Arquidiócesis de Santiago de Guatemala.', 125, 37, { align: 'center' });

        doc.setDrawColor(color.r, color.g, color.b);
        doc.setLineWidth(0.8);
        doc.line(14, 43, 204, 43);
        doc.setLineWidth(0.3);
        doc.line(14, 45, 204, 45);

        // Título
        const titulos = {
            bautismo:     'CONSTANCIA DE BAUTISMO',
            confirmacion: 'CONSTANCIA DE CONFIRMACIÓN',
            matrimonio:   'CONSTANCIA DE MATRIMONIO RELIGIOSO'
        };
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(color.r, color.g, color.b);
        doc.text(titulos[sacramento.tipo], 109, 55, { align: 'center' });

        const xL = 17;
        const xR = 201;

        const campo = (etiqueta, valor, y, xIni = xL, xFin = xR) => {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            doc.text(etiqueta, xIni, y);
            const w = doc.getTextWidth(etiqueta);
            doc.setDrawColor(color.r, color.g, color.b);
            doc.setLineWidth(0.3);
            doc.line(xIni + w + 1, y + 1, xFin, y + 1);
            if (valor) {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(color.r, color.g, color.b);
                doc.text(valor, xIni + w + 3, y);
            }
        };

        const linea = (y, xIni = xL, xFin = xR) => {
            doc.setDrawColor(color.r, color.g, color.b);
            doc.setLineWidth(0.3);
            doc.line(xIni, y + 1, xFin, y + 1);
        };

        const txt = (texto, x, y) => {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            doc.text(texto, x, y);
        };

        const bold = (texto, x, y) => {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(color.r, color.g, color.b);
            doc.text(texto, x, y);
        };

        doc.setFontSize(10);
        let y = 66;
        const lh  = 9;
        const lhS = 5;

        // ── BAUTISMO ──
        if (sacramento.tipo === 'bautismo') {
            campo('Nombre:', `${feligres.nombres} ${feligres.apellidos}`, y); y += lh;
            campo('Nombre de los padres:', sacramento.padre || '', y); y += lhS;
            linea(y); y += lh;
            y += 3;
            campo('Nombre de los padrinos:', sacramento.padrino_1 || '', y); y += lhS;
            if (sacramento.padrino_2) bold(sacramento.padrino_2, xL, y);
            linea(y); y += lh;
            y += 3;
            campo('Fecha de nacimiento:',
                feligres.fecha_nacimiento
                    ? (() => {
                        const [a, m, d] = feligres.fecha_nacimiento.slice(0, 10).split('-');
                        return `${parseInt(d)} de ${new Date(parseInt(a), parseInt(m)-1, parseInt(d)).toLocaleDateString('es-GT', { month: 'long' })} de ${a}`;
                      })()
                    : '', y);
            y += lh;
            campo('Fecha de bautismo:', `${diaSacramento} de ${mesSacramento} de ${anioSacramento}`, y); y += lh;
            campo('Libro de bautismos:', sacramento.libro || '', y); y += lh;
            txt('No.', xL, y);
            doc.setDrawColor(color.r, color.g, color.b); doc.setLineWidth(0.3);
            doc.line(xL + 7, y + 1, xL + 45, y + 1);
            if (sacramento.libro) bold(sacramento.libro, xL + 9, y);
            txt('Folio:', xL + 48, y);
            doc.line(xL + 62, y + 1, xL + 100, y + 1);
            if (sacramento.folio) bold(String(sacramento.folio), xL + 64, y);
            txt('Partida:', xL + 103, y);
            doc.line(xL + 120, y + 1, xR, y + 1);
            if (sacramento.partida) bold(String(sacramento.partida), xL + 122, y);
            y += lh + 2;
            campo('Anotación marginal:', '', y); y += lhS;
            linea(y); y += lh + 3;

        // ── CONFIRMACIÓN ──
        } else if (sacramento.tipo === 'confirmacion') {
            txt('En el libro de Confirmaciones', xL, y); y += lh;
            txt('No.', xL, y);
            doc.setDrawColor(color.r, color.g, color.b); doc.setLineWidth(0.3);
            doc.line(xL + 7, y + 1, xL + 40, y + 1);
            if (sacramento.libro) bold(sacramento.libro, xL + 9, y);
            txt('Folio:', xL + 43, y);
            doc.line(xL + 56, y + 1, xL + 90, y + 1);
            if (sacramento.folio) bold(String(sacramento.folio), xL + 58, y);
            txt('Partida:', xL + 93, y);
            doc.line(xL + 108, y + 1, xL + 138, y + 1);
            if (sacramento.partida) bold(String(sacramento.partida), xL + 110, y);
            txt('De esta', xL + 141, y);
            y += lh;
            txt('Parroquia, consta que el', xL, y);
            const xDia = xL + doc.getTextWidth('Parroquia, consta que el') + 2;
            bold(String(diaSacramento), xDia, y);
            const xDe1 = xDia + doc.getTextWidth(String(diaSacramento)) + 2;
            txt('de', xDe1, y);
            const xMes = xDe1 + doc.getTextWidth('de') + 2;
            bold(mesSacramento, xMes, y);
            const xDelAnio = xMes + doc.getTextWidth(mesSacramento) + 2;
            txt('del año', xDelAnio, y);
            const xAnio = xDelAnio + doc.getTextWidth('del año') + 2;
            bold(String(anioSacramento), xAnio, y);
            y += lh;
            campo('Su excelencia Mons.', sacramento.ministro || '', y); y += lhS;
            linea(y); y += lh + 2;
            campo('Confirió el Sacramento de la Confirmación a:', `${feligres.nombres} ${feligres.apellidos}`, y);
            y += lhS; linea(y); y += lh;
            if (feligres.fecha_nacimiento) {
                const [a] = feligres.fecha_nacimiento.slice(0, 10).split('-');
                const edad = new Date().getFullYear() - parseInt(a);
                txt('de:', xL, y);
                bold(String(edad), xL + 10, y);
                txt('años de edad,', xL + 10 + doc.getTextWidth(String(edad)) + 2, y);
                y += lh;
            } else {
                campo('de:', '', y); y += lh;
            }
            campo('bautizado en la Parroquia de', '', y); y += lh;
            campo('Hijo (a) de:', '', y); y += lhS; linea(y); y += lh;
            campo('y de:', '', y); y += lhS; linea(y); y += lh + 2;
            campo('Padrinos:', sacramento.padrino_1 || '', y); y += lhS;
            if (sacramento.padrino_2) bold(sacramento.padrino_2, xL, y);
            linea(y); y += lh;
            campo('Anotación marginal:', '', y); y += lhS;
            linea(y); y += lh + 3;

        // ── MATRIMONIO ──
        } else if (sacramento.tipo === 'matrimonio') {
            txt('El infrascrito Párroco, hace constar:', xL, y); y += lh;
            txt('Que en fecha:', xL, y);
            const xD = xL + doc.getTextWidth('Que en fecha:') + 2;
            doc.setDrawColor(color.r, color.g, color.b); doc.setLineWidth(0.3);
            doc.line(xD, y + 1, xD + 18, y + 1);
            bold(String(diaSacramento), xD + 1, y);
            const xDe2 = xD + 20;
            txt('de', xDe2, y);
            const xM2 = xDe2 + doc.getTextWidth('de') + 2;
            doc.line(xM2, y + 1, xM2 + 38, y + 1);
            bold(mesSacramento, xM2 + 1, y);
            const xDe3 = xM2 + 40;
            txt('de', xDe3, y);
            const xA2 = xDe3 + doc.getTextWidth('de') + 2;
            doc.line(xA2, y + 1, xA2 + 18, y + 1);
            bold(String(anioSacramento), xA2 + 1, y);
            y += lh;
            txt('Contrajeron Matrimonio Religioso:', xL, y); y += lh;
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(color.r, color.g, color.b);
            doc.text(`${feligres.nombres} ${feligres.apellidos}`, xL, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            linea(y); y += lh;
            if (sacramento.conyugue) bold(sacramento.conyugue, xL, y);
            linea(y); y += lh + 2;
            txt('Según consta el Libro:', xL, y); y += lh;
            txt('No.', xL, y);
            doc.setDrawColor(color.r, color.g, color.b); doc.setLineWidth(0.3);
            doc.line(xL + 7, y + 1, xL + 45, y + 1);
            if (sacramento.libro) bold(sacramento.libro, xL + 9, y);
            txt('Folio:', xL + 48, y);
            doc.line(xL + 62, y + 1, xL + 100, y + 1);
            if (sacramento.folio) bold(String(sacramento.folio), xL + 64, y);
            txt('Partida:', xL + 103, y);
            doc.line(xL + 120, y + 1, xR, y + 1);
            if (sacramento.partida) bold(String(sacramento.partida), xL + 122, y);
            y += lh + 2;
            campo('Anotación marginal:', '', y); y += lhS;
            linea(y); y += lhS;
            linea(y + lh); y += lh * 2 + 2;
        }

        // Fecha de emisión
        doc.setFontSize(10);
        txt('Guatemala', xL, y);
        const xGuate = xL + doc.getTextWidth('Guatemala') + 2;
        doc.setDrawColor(color.r, color.g, color.b); doc.setLineWidth(0.3);
        doc.line(xGuate, y + 1, xGuate + 22, y + 1);
        bold(String(diaEmision), xGuate + 1, y);
        const xDe4 = xGuate + 24;
        txt('de', xDe4, y);
        const xME = xDe4 + doc.getTextWidth('de') + 2;
        doc.line(xME, y + 1, xME + 38, y + 1);
        bold(mesEmision, xME + 1, y);
        const xDA = xME + 40;
        txt('del año', xDA, y);
        const xAE = xDA + doc.getTextWidth('del año') + 2;
        doc.line(xAE, y + 1, xAE + 20, y + 1);
        bold(String(anioEmision), xAE + 1, y);
        y += lh * 3.5;

        // Firma
        doc.setDrawColor(color.r, color.g, color.b);
        doc.setLineWidth(0.5);
        doc.line(76, y, 148, y);
        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(color.r, color.g, color.b);
        doc.setFontSize(10);
        doc.text('Párroco', 112, y, { align: 'center' });

        // Pie de página
        doc.setLineWidth(0.8);
        doc.setDrawColor(color.r, color.g, color.b);
        doc.line(14, 258, 204, 258);
        doc.setLineWidth(0.3);
        doc.line(14, 260, 204, 260);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(color.r, color.g, color.b);
        doc.text('0 Calle 0-14 Zona 4, Sumpango Sacatepéquez. Guatemala C.A.', 109, 264, { align: 'center' });
        doc.text('Teléfono: 7833-1366  •  E-mail: sanagustinparroquiasumpangosac@gmail.com', 109, 269, { align: 'center' });

        // Marca de agua
        doc.setTextColor(color.r, color.g, color.b);
        doc.setFontSize(50);
        doc.setFont('helvetica', 'bold');
        doc.setGState(new doc.GState({ opacity: 0.04 }));
        doc.text('PARROQUIA', 109, 150, { align: 'center', angle: 45 });
        doc.setGState(new doc.GState({ opacity: 1 }));

        // Número de serie
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        const serie = `PGIP-${sacramento.tipo.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-8)}`;
        doc.text(`Serie: ${serie}`, 14, 273);
        doc.text(`Emitido: ${fechaEmision}`, 204, 273, { align: 'right' });

        doc.save(`constancia_${sacramento.tipo}_${feligres.apellidos.replace(/\s/g, '_')}.pdf`);
    };

    // ──────────────────────────────────────────────
    // RENDER
    // ──────────────────────────────────────────────
    return (
        <div className={styles.contenedor}>
            <Navbar />
            <div className={styles.contenido}>
                <h1 className={styles.titulo}>Emisión de Certificados Sacramentales</h1>

                {error  && <div className={styles.errorDiv}  onClick={() => setError('')}>❌ {error}</div>}
                {exito  && <div className={styles.exitoDiv}  onClick={() => setExito('')}>✅ {exito}</div>}

                {/* ── Búsqueda ── */}
                <div className={styles.panel}>
                    <h2 className={styles.panelTitulo}>Buscar feligrés</h2>
                    <div className={styles.busquedaFila}>
                        <input
                            type="text"
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && buscarFeligres()}
                            className={styles.input}
                            style={{ flex: 1 }}
                            placeholder="Nombre o apellido..."
                        />
                        <button onClick={buscarFeligres} className={styles.botonPrimario} disabled={cargando}>
                            {cargando ? '...' : 'Buscar'}
                        </button>
                    </div>

                    {resultados.length > 0 && (
                        <div style={{ marginTop: '16px' }}>
                            {resultados.map(f => (
                                <div key={f.id} onClick={() => seleccionarFeligres(f)} className={styles.resultadoItem}>
                                    <div>
                                        <strong>{f.nombres} {f.apellidos}</strong>
                                        <p className={styles.textoGris}>Estado: {f.estado}</p>
                                    </div>
                                    <span className={styles.verBtn}>Seleccionar →</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Panel de sacramentos ── */}
                {feligres && (
                    <div className={styles.panel}>
                        <h2 className={styles.panelTitulo}>
                            {feligres.nombres} {feligres.apellidos}
                        </h2>
                        <p className={styles.textoGris}>
                            Seleccione un sacramento para generar el certificado
                        </p>

                        {sacramentos.length === 0 ? (
                            <p className={styles.textoGris}>No hay sacramentos registrados</p>
                        ) : (
                            <div className={styles.sacramentosGrid}>
                                {sacramentos.map(s => (
                                    <div
                                        key={s.id}
                                        className={styles.sacramentoCard}
                                        style={{
                                            backgroundColor: TIPO_COLOR[s.tipo]?.bg,
                                            border: sacramentoSeleccionado?.id === s.id
                                                ? `2px solid ${TIPO_COLOR[s.tipo]?.color}`
                                                : '2px solid transparent',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => setSacramentoSeleccionado(s)}
                                    >
                                        <p className={styles.sacramentoTipo}
                                            style={{ color: TIPO_COLOR[s.tipo]?.color }}>
                                            {s.tipo.charAt(0).toUpperCase() + s.tipo.slice(1)}
                                        </p>
                                        <p className={styles.textoGris}>
                                            {s.fecha
                                                ? (() => {
                                                    const [a, m, d] = s.fecha.slice(0, 10).split('-');
                                                    return `${parseInt(d)}/${parseInt(m)}/${a}`;
                                                  })()
                                                : '—'}
                                        </p>
                                        {s.libro && (
                                            <p className={styles.textoGris}>
                                                Libro {s.libro} · Folio {s.folio}
                                            </p>
                                        )}

                                        {/* Botones editar / eliminar */}
                                        <div className={styles.cardAcciones} onClick={e => e.stopPropagation()}>
                                            <button
                                                className={styles.botonEditar}
                                                title="Editar sacramento"
                                                onClick={() => abrirEditar(s)}>
                                                ✏️ Editar
                                            </button>
                                            <button
                                                className={styles.botonEliminar}
                                                title="Eliminar sacramento"
                                                onClick={() => abrirEliminar(s)}>
                                                🗑️ Eliminar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {sacramentoSeleccionado && (
                            <button
                                onClick={() => generarCertificado(sacramentoSeleccionado)}
                                className={styles.botonVerde}>
                                🖨️ Generar Certificado de {sacramentoSeleccionado.tipo}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════
                MODAL EDITAR SACRAMENTO
            ══════════════════════════════════════ */}
            {modalEditar && sacramentoEditando && (
                <div className={styles.modalOverlay} onClick={() => setModalEditar(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h2 className={styles.modalTitulo}>
                            Editar sacramento de{' '}
                            <span style={{ color: TIPO_COLOR[sacramentoEditando.tipo]?.color }}>
                                {sacramentoEditando.tipo}
                            </span>
                        </h2>

                        <div className={styles.formGrid}>
                            <label className={styles.label}>
                                Fecha
                                <input
                                    type="date"
                                    className={styles.input}
                                    value={formEditar.fecha}
                                    onChange={e => setFormEditar(p => ({ ...p, fecha: e.target.value }))}
                                />
                            </label>

                            <label className={styles.label}>
                                Libro
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={formEditar.libro}
                                    onChange={e => setFormEditar(p => ({ ...p, libro: e.target.value }))}
                                />
                            </label>

                            <label className={styles.label}>
                                Folio
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={formEditar.folio}
                                    onChange={e => setFormEditar(p => ({ ...p, folio: e.target.value }))}
                                />
                            </label>

                            <label className={styles.label}>
                                Partida
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={formEditar.partida}
                                    onChange={e => setFormEditar(p => ({ ...p, partida: e.target.value }))}
                                />
                            </label>

                            <label className={styles.label}>
                                Ministro / Obispo
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={formEditar.ministro}
                                    onChange={e => setFormEditar(p => ({ ...p, ministro: e.target.value }))}
                                />
                            </label>

                            <label className={styles.label}>
                                Padrino / Madrina 1
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={formEditar.padrino_1}
                                    onChange={e => setFormEditar(p => ({ ...p, padrino_1: e.target.value }))}
                                />
                            </label>

                            <label className={styles.label}>
                                Padrino / Madrina 2
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={formEditar.padrino_2}
                                    onChange={e => setFormEditar(p => ({ ...p, padrino_2: e.target.value }))}
                                />
                            </label>
                        </div>

                        <div className={styles.modalAcciones}>
                            <button
                                className={styles.botonSecundario}
                                onClick={() => setModalEditar(false)}
                                disabled={guardando}>
                                Cancelar
                            </button>
                            <button
                                className={styles.botonPrimario}
                                onClick={guardarEdicion}
                                disabled={guardando}>
                                {guardando ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════
                MODAL CONFIRMAR ELIMINAR
            ══════════════════════════════════════ */}
            {modalEliminar && sacramentoEliminar && (
                <div className={styles.modalOverlay} onClick={() => setModalEliminar(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h2 className={styles.modalTitulo}>⚠️ Confirmar eliminación</h2>
                        <p style={{ color: '#4a5568', marginBottom: '8px' }}>
                            ¿Está seguro que desea eliminar el sacramento de{' '}
                            <strong style={{ color: TIPO_COLOR[sacramentoEliminar.tipo]?.color }}>
                                {sacramentoEliminar.tipo}
                            </strong>{' '}
                            de <strong>{feligres?.nombres} {feligres?.apellidos}</strong>?
                        </p>
                        <p style={{ color: '#e53e3e', fontSize: '14px', marginBottom: '24px' }}>
                            Esta acción no se puede deshacer.
                        </p>

                        <div className={styles.modalAcciones}>
                            <button
                                className={styles.botonSecundario}
                                onClick={() => setModalEliminar(false)}
                                disabled={eliminando}>
                                Cancelar
                            </button>
                            <button
                                className={styles.botonRojo}
                                onClick={confirmarEliminar}
                                disabled={eliminando}>
                                {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}