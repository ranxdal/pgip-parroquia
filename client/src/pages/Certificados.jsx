import { useState } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import styles from './Certificados.module.css';
import jsPDF from 'jspdf';

export default function Certificados() {
    const [busqueda, setBusqueda] = useState('');
    const [resultados, setResultados] = useState([]);
    const [feligres, setFeligres] = useState(null);
    const [sacramentos, setSacramentos] = useState([]);
    const [sacramentoSeleccionado, setSacramentoSeleccionado] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');

    const buscarFeligres = async () => {
        if (!busqueda.trim()) return;
        setCargando(true);
        try {
            const { data } = await api.get(`/sacramentos/feligres/buscar?termino=${busqueda}`);
            setResultados(data.resultados);
        } catch {
            setError('Error en la búsqueda');
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

    const generarCertificado = async (sacramento) => {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'letter'
        });

        // ── Fechas ──
        const fechaEmision = new Date().toLocaleDateString('es-GT', {
            day: 'numeric', month: 'long', year: 'numeric'
        });

        // Usar fecha ajustada para evitar desfase de zona horaria
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

        const fechaSacramento = `${diaSacramento} de ${mesSacramento} de ${anioSacramento}`;

        // Fecha de emisión descompuesta
        const hoy = new Date();
        const diaEmision = hoy.getDate();
        const mesEmision = hoy.toLocaleDateString('es-GT', { month: 'long' });
        const anioEmision = hoy.getFullYear();

        // ── Colores según tipo ──
        const colores = {
            bautismo:     { r: 26,  g: 54,  b: 93  },  // Azul oscuro
            confirmacion: { r: 20,  g: 83,  b: 45  },  // Verde oscuro
            matrimonio:   { r: 120, g: 53,  b: 15  }   // Café oscuro
        };
        const color = colores[sacramento.tipo] || colores.bautismo;
        const C = (fn) => { fn(); };  // helper para claridad

        // ─────────────────────────────────────────────────
        // BORDE DOBLE
        // ─────────────────────────────────────────────────
        doc.setDrawColor(color.r, color.g, color.b);
        doc.setLineWidth(1.5);
        doc.rect(8, 8, 196, 271);
        doc.setLineWidth(0.4);
        doc.rect(11, 11, 190, 265);

        // ─────────────────────────────────────────────────
        // LOGO
        // ─────────────────────────────────────────────────
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
        } catch {
            console.log('Logo no disponible');
        }

        // ─────────────────────────────────────────────────
        // ENCABEZADO  (logo a la izquierda, texto a la derecha)
        // ─────────────────────────────────────────────────
        doc.setTextColor(color.r, color.g, color.b);
        doc.setFontSize(15);
        doc.setFont('helvetica', 'bold');
        doc.text('PARROQUIA SAN AGUSTÍN', 125, 21, { align: 'center' });

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text('Vicaría Episcopal de Sacatepéquez', 125, 27, { align: 'center' });
        doc.text('"Santo Hermano Pedro"', 125, 32, { align: 'center' });
        doc.text('Arquidiócesis de Santiago de Guatemala.', 125, 37, { align: 'center' });

        // Separador doble
        doc.setDrawColor(color.r, color.g, color.b);
        doc.setLineWidth(0.8);
        doc.line(14, 43, 204, 43);
        doc.setLineWidth(0.3);
        doc.line(14, 45, 204, 45);

        // ─────────────────────────────────────────────────
        // TÍTULO
        // ─────────────────────────────────────────────────
        const titulos = {
            bautismo:     'CONSTANCIA DE BAUTISMO',
            confirmacion: 'CONSTANCIA DE CONFIRMACIÓN',
            matrimonio:   'CONSTANCIA DE MATRIMONIO RELIGIOSO'
        };

        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(color.r, color.g, color.b);
        doc.text(titulos[sacramento.tipo], 109, 55, { align: 'center' });

        // ─────────────────────────────────────────────────
        // HELPERS INTERNOS
        // ─────────────────────────────────────────────────
        const xL = 17;   // margen izquierdo del cuerpo
        const xR = 201;  // margen derecho del cuerpo

        // Dibuja etiqueta + línea + valor opcional
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

        // Solo línea horizontal (campo vacío de continuación)
        const linea = (y, xIni = xL, xFin = xR) => {
            doc.setDrawColor(color.r, color.g, color.b);
            doc.setLineWidth(0.3);
            doc.line(xIni, y + 1, xFin, y + 1);
        };

        // Texto normal (sin negrita, color oscuro)
        const txt = (texto, x, y) => {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            doc.text(texto, x, y);
        };

        // Texto en negrita con color del sacramento
        const bold = (texto, x, y) => {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(color.r, color.g, color.b);
            doc.text(texto, x, y);
        };

        doc.setFontSize(10);
        let y = 66;
        const lh = 9;   // interlineado estándar
        const lhS = 5;  // interlineado corto (espacio extra dentro de un campo)

        // ═════════════════════════════════════════════════
        // BAUTISMO
        // ═════════════════════════════════════════════════
        if (sacramento.tipo === 'bautismo') {

            // ── Nombre ──
            campo('Nombre:', `${feligres.nombres} ${feligres.apellidos}`, y); y += lh;

            // ── Nombre de los padres (dos líneas) ──
            campo('Nombre de los padres:', sacramento.padre || '', y); y += lhS;
            linea(y); y += lh;

            y += 3; // espacio extra entre bloques

            // ── Nombre de los padrinos (dos líneas) ──
            campo('Nombre de los padrinos:', sacramento.padrino_1 || '', y); y += lhS;
            // segunda línea padrinos
            if (sacramento.padrino_2) {
                bold(sacramento.padrino_2, xL, y);
            }
            linea(y); y += lh;

            y += 3;

            // ── Fecha de nacimiento ──
            campo('Fecha de nacimiento:',
                feligres.fecha_nacimiento
                    ? (() => {
                        const [a, m, d] = feligres.fecha_nacimiento.slice(0, 10).split('-');
                        return `${parseInt(d)} de ${new Date(parseInt(a), parseInt(m)-1, parseInt(d)).toLocaleDateString('es-GT', { month: 'long' })} de ${a}`;
                      })()
                    : '',
                y);
            y += lh;

            // ── Fecha de bautismo ──
            campo('Fecha de bautismo:', fechaSacramento, y); y += lh;

            // ── Libro de bautismos ──
            campo('Libro de bautismos:', sacramento.libro || '', y); y += lh;

            // ── No. / Folio / Partida ──
            txt('No.', xL, y);
            doc.setDrawColor(color.r, color.g, color.b);
            doc.setLineWidth(0.3);
            doc.line(xL + 7, y + 1, xL + 45, y + 1);
            if (sacramento.libro) bold(sacramento.libro, xL + 9, y);

            txt('Folio:', xL + 48, y);
            doc.line(xL + 62, y + 1, xL + 100, y + 1);
            if (sacramento.folio) bold(String(sacramento.folio), xL + 64, y);

            txt('Partida:', xL + 103, y);
            doc.line(xL + 120, y + 1, xR, y + 1);
            if (sacramento.partida) bold(String(sacramento.partida), xL + 122, y);
            y += lh + 2;

            // ── Anotación marginal ──
            campo('Anotación marginal:', '', y); y += lhS;
            linea(y); y += lh + 3;

        // ═════════════════════════════════════════════════
        // CONFIRMACIÓN
        // ═════════════════════════════════════════════════
        } else if (sacramento.tipo === 'confirmacion') {

            // ── "En el libro de Confirmaciones" ──
            txt('En el libro de Confirmaciones', xL, y); y += lh;

            // ── No. / Folio / Partida / De esta — todo en una línea ──
            txt('No.', xL, y);
            doc.setDrawColor(color.r, color.g, color.b);
            doc.setLineWidth(0.3);
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

            // ── Parroquia, consta que el ___ de ___ del año ___ ──
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

            // ── Su excelencia Mons. ──
            campo('Su excelencia Mons.', sacramento.ministro || '', y); y += lhS;
            linea(y); y += lh + 2;

            // ── Confirió el Sacramento... a: ──
            campo('Confirió el Sacramento de la Confirmación a:', `${feligres.nombres} ${feligres.apellidos}`, y);
            y += lhS;
            linea(y); y += lh;

            // ── de: ___ años de edad ──
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

            // ── bautizado en la Parroquia de ──
            campo('bautizado en la Parroquia de', '', y); y += lh;

            // ── Hijo (a) de: ──
            campo('Hijo (a) de:', '', y); y += lhS;
            linea(y); y += lh;

            // ── y de: ──
            campo('y de:', '', y); y += lhS;
            linea(y); y += lh + 2;

            // ── Padrinos ──
            campo('Padrinos:', sacramento.padrino_1 || '', y); y += lhS;
            if (sacramento.padrino_2) {
                bold(sacramento.padrino_2, xL, y);
            }
            linea(y); y += lh;

            // ── Anotación marginal ──
            campo('Anotación marginal:', '', y); y += lhS;
            linea(y); y += lh + 3;

        // ═════════════════════════════════════════════════
        // MATRIMONIO
        // ═════════════════════════════════════════════════
        } else if (sacramento.tipo === 'matrimonio') {

            txt('El infrascrito Párroco, hace constar:', xL, y); y += lh;

            // ── Que en fecha: ___ de ___ de ___ ──
            txt('Que en fecha:', xL, y);
            const xD = xL + doc.getTextWidth('Que en fecha:') + 2;
            doc.setDrawColor(color.r, color.g, color.b);
            doc.setLineWidth(0.3);
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

            // Línea 1 contrayentes — nombre del feligrés registrado
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(color.r, color.g, color.b);
            doc.text(`${feligres.nombres} ${feligres.apellidos}`, xL, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            linea(y); y += lh;

            // Línea 2 contrayentes — cónyuge (guardado en sacramento.conyugue o dejar en blanco)
            if (sacramento.conyugue) {
                bold(sacramento.conyugue, xL, y);
            }
            linea(y); y += lh + 2;

            txt('Según consta el Libro:', xL, y); y += lh;

            // ── No. / Folio / Partida ──
            txt('No.', xL, y);
            doc.setDrawColor(color.r, color.g, color.b);
            doc.setLineWidth(0.3);
            doc.line(xL + 7, y + 1, xL + 45, y + 1);
            if (sacramento.libro) bold(sacramento.libro, xL + 9, y);

            txt('Folio:', xL + 48, y);
            doc.line(xL + 62, y + 1, xL + 100, y + 1);
            if (sacramento.folio) bold(String(sacramento.folio), xL + 64, y);

            txt('Partida:', xL + 103, y);
            doc.line(xL + 120, y + 1, xR, y + 1);
            if (sacramento.partida) bold(String(sacramento.partida), xL + 122, y);
            y += lh + 2;

            // ── Anotación marginal ──
            campo('Anotación marginal:', '', y); y += lhS;
            linea(y); y += lhS;
            linea(y + lh); y += lh * 2 + 2;
        }

        // ─────────────────────────────────────────────────
        // FECHA DE EMISIÓN  — Guatemala ___ de ___ del año ___
        // ─────────────────────────────────────────────────
        doc.setFontSize(10);
        txt('Guatemala', xL, y);
        const xGuate = xL + doc.getTextWidth('Guatemala') + 2;
        doc.setDrawColor(color.r, color.g, color.b);
        doc.setLineWidth(0.3);
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

        // ─────────────────────────────────────────────────
        // FIRMA
        // ─────────────────────────────────────────────────
        doc.setDrawColor(color.r, color.g, color.b);
        doc.setLineWidth(0.5);
        doc.line(76, y, 148, y);
        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(color.r, color.g, color.b);
        doc.setFontSize(10);
        doc.text('Párroco', 112, y, { align: 'center' });

        // ─────────────────────────────────────────────────
        // PIE DE PÁGINA
        // ─────────────────────────────────────────────────
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

        // ─────────────────────────────────────────────────
        // MARCA DE AGUA SUTIL
        // ─────────────────────────────────────────────────
        doc.setTextColor(color.r, color.g, color.b);
        doc.setFontSize(50);
        doc.setFont('helvetica', 'bold');
        doc.setGState(new doc.GState({ opacity: 0.04 }));
        doc.text('PARROQUIA', 109, 150, { align: 'center', angle: 45 });
        doc.setGState(new doc.GState({ opacity: 1 }));

        // ─────────────────────────────────────────────────
        // NÚMERO DE SERIE
        // ─────────────────────────────────────────────────
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        const serie = `PGIP-${sacramento.tipo.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-8)}`;
        doc.text(`Serie: ${serie}`, 14, 273);
        doc.text(`Emitido: ${fechaEmision}`, 204, 273, { align: 'right' });

        doc.save(`constancia_${sacramento.tipo}_${feligres.apellidos.replace(/\s/g, '_')}.pdf`);
    };

    const tipoColor = {
        bautismo:     { bg: '#ebf8ff', color: '#2b6cb0' },
        confirmacion: { bg: '#f0fff4', color: '#276749' },
        matrimonio:   { bg: '#fff8f0', color: '#c05621' }
    };

    return (
        <div className={styles.contenedor}>
            <Navbar />
            <div className={styles.contenido}>
                <h1 className={styles.titulo}>Emisión de Certificados Sacramentales</h1>

                {error && (
                    <div className={styles.errorDiv} onClick={() => setError('')}>❌ {error}</div>
                )}

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
                        <button onClick={buscarFeligres}
                            className={styles.botonPrimario}
                            disabled={cargando}>
                            {cargando ? '...' : 'Buscar'}
                        </button>
                    </div>

                    {resultados.length > 0 && (
                        <div style={{ marginTop: '16px' }}>
                            {resultados.map(f => (
                                <div key={f.id}
                                    onClick={() => seleccionarFeligres(f)}
                                    className={styles.resultadoItem}>
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

                {feligres && (
                    <div className={styles.panel}>
                        <h2 className={styles.panelTitulo}>
                            {feligres.nombres} {feligres.apellidos}
                        </h2>
                        <p className={styles.textoGris}>
                            Seleccione el sacramento para generar el certificado
                        </p>

                        {sacramentos.length === 0 ? (
                            <p className={styles.textoGris}>No hay sacramentos registrados</p>
                        ) : (
                            <div className={styles.sacramentosGrid}>
                                {sacramentos.map(s => (
                                    <div key={s.id}
                                        className={styles.sacramentoCard}
                                        style={{
                                            backgroundColor: tipoColor[s.tipo]?.bg,
                                            border: sacramentoSeleccionado?.id === s.id
                                                ? `2px solid ${tipoColor[s.tipo]?.color}`
                                                : '2px solid transparent'
                                        }}
                                        onClick={() => setSacramentoSeleccionado(s)}>
                                        <p className={styles.sacramentoTipo}
                                            style={{ color: tipoColor[s.tipo]?.color }}>
                                            {s.tipo}
                                        </p>
                                        <p className={styles.textoGris}>
                                            {new Date(s.fecha).toLocaleDateString('es-GT')}
                                        </p>
                                        {s.libro && (
                                            <p className={styles.textoGris}>
                                                {s.libro} — Folio {s.folio}
                                            </p>
                                        )}
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
        </div>
    );
}