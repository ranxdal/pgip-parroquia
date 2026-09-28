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

        const fechaEmision = new Date().toLocaleDateString('es-GT', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
        const fechaSacramento = new Date(sacramento.fecha).toLocaleDateString('es-GT', {
            day: 'numeric', month: 'long', year: 'numeric'
        });

        const anioSacramento = new Date(sacramento.fecha).getFullYear();
        const diaSacramento = new Date(sacramento.fecha).getDate();
        const mesSacramento = new Date(sacramento.fecha).toLocaleDateString('es-GT', { month: 'long' });

        // Colores según tipo de sacramento
        const colores = {
            bautismo: { r: 26, g: 54, b: 93 },        // Azul oscuro
            confirmacion: { r: 20, g: 83, b: 45 },     // Verde oscuro
            matrimonio: { r: 120, g: 53, b: 15 }       // Café oscuro
        };

        const color = colores[sacramento.tipo] || colores.bautismo;

        // ── BORDE DECORATIVO EXTERIOR ──
        doc.setDrawColor(color.r, color.g, color.b);
        doc.setLineWidth(1.5);
        doc.rect(8, 8, 196, 271);

        // Borde interior
        doc.setLineWidth(0.4);
        doc.rect(11, 11, 190, 265);

        // ── CARGAR LOGO ──
        try {
            const logoUrl = new URL('../assets/logo-parroquia.jpg', import.meta.url).href;
            const response = await fetch(logoUrl);
            const blob = await response.blob();
            const reader = new FileReader();

            await new Promise((resolve) => {
                reader.onload = () => {
                    doc.addImage(reader.result, 'JPEG', 14, 14, 35, 28);
                    resolve();
                };
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.log('Logo no disponible');
        }

        // ── ENCABEZADO ──
        doc.setTextColor(color.r, color.g, color.b);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('PARROQUIA SAN AGUSTÍN', 130, 22, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Vicaría Episcopal de Sacatepéquez', 130, 28, { align: 'center' });
        doc.text('"Santo Hermano Pedro"', 130, 33, { align: 'center' });
        doc.text('Arquidiócesis de Santiago de Guatemala', 130, 38, { align: 'center' });

        // Línea separadora encabezado
        doc.setDrawColor(color.r, color.g, color.b);
        doc.setLineWidth(0.8);
        doc.line(14, 45, 204, 45);
        doc.setLineWidth(0.3);
        doc.line(14, 47, 204, 47);

        // ── TÍTULO DEL CERTIFICADO ──
        const titulos = {
            bautismo: 'CONSTANCIA DE BAUTISMO',
            confirmacion: 'CONSTANCIA DE CONFIRMACIÓN',
            matrimonio: 'CONSTANCIA DE MATRIMONIO RELIGIOSO'
        };

        doc.setFontSize(15);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(color.r, color.g, color.b);
        doc.text(titulos[sacramento.tipo], 106, 57, { align: 'center' });

        // Línea bajo el título
        doc.setLineWidth(0.3);
        doc.line(40, 60, 172, 60);

        // ── CUERPO DEL CERTIFICADO ──
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(10.5);
        doc.setFont('helvetica', 'normal');

        let y = 72;
        const lineH = 9;
        const lineColor = [color.r, color.g, color.b];

        // Función auxiliar para línea con etiqueta y valor
        const campoLinea = (etiqueta, valor, yPos, xInicio = 14, ancho = 190) => {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            doc.text(etiqueta, xInicio, yPos);
            const anchoEtiqueta = doc.getTextWidth(etiqueta);
            doc.setDrawColor(color.r, color.g, color.b);
            doc.setLineWidth(0.3);
            doc.line(xInicio + anchoEtiqueta + 1, yPos + 1, xInicio + ancho, yPos + 1);
            if (valor) {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(color.r, color.g, color.b);
                doc.text(valor, xInicio + anchoEtiqueta + 3, yPos);
            }
        };

        if (sacramento.tipo === 'bautismo') {
            doc.setFont('helvetica', 'normal');
            doc.text('En el libro de Bautismos', 14, y); y += lineH;

            // No. Folio Partida en una línea
            doc.text('No.', 14, y);
            doc.line(22, y + 1, 65, y + 1);
            doc.text('Folio:', 68, y);
            doc.line(83, y + 1, 130, y + 1);
            doc.text('Partida:', 133, y);
            doc.line(152, y + 1, 204, y + 1);

            if (sacramento.folio || sacramento.partida || sacramento.libro) {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(color.r, color.g, color.b);
                if (sacramento.libro) doc.text(sacramento.libro, 24, y);
                if (sacramento.folio) doc.text(sacramento.folio, 85, y);
                if (sacramento.partida) doc.text(sacramento.partida, 154, y);
            }
            y += lineH;

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            doc.text('De esta Parroquia, consta que el día', 14, y);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(color.r, color.g, color.b);
            doc.text(`${diaSacramento}`, 90, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            doc.text('de', 98, y);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(color.r, color.g, color.b);
            doc.text(`${mesSacramento}`, 104, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            doc.text('del año', 138, y);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(color.r, color.g, color.b);
            doc.text(`${anioSacramento}`, 158, y);
            y += lineH;

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            campoLinea('Nombre:', `${feligres.nombres} ${feligres.apellidos}`, y);
            y += lineH;

            campoLinea('Nombre de los padres:', '', y); y += lineH;
            doc.line(14, y + 1, 204, y + 1); y += lineH;

            campoLinea('Nombre de los padrinos:', '', y); y += lineH;

            if (sacramento.padrino_1 || sacramento.padrino_2) {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(color.r, color.g, color.b);
                const padrinos = [sacramento.padrino_1, sacramento.padrino_2].filter(Boolean).join(' y ');
                doc.text(padrinos, 14, y);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(30, 30, 30);
            }
            doc.line(14, y + 1, 204, y + 1);
            y += lineH;

            if (feligres.fecha_nacimiento) {
                campoLinea('Fecha de nacimiento:',
                    new Date(feligres.fecha_nacimiento).toLocaleDateString('es-GT'), y);
                y += lineH;
            }

            campoLinea('Fecha de bautismo:', fechaSacramento, y); y += lineH;
            campoLinea('Libro de bautismos:', sacramento.libro || '', y); y += lineH * 1.5;

            campoLinea('Anotación marginal:', '', y); y += lineH;
            doc.line(14, y + 1, 204, y + 1); y += lineH * 2;

        } else if (sacramento.tipo === 'confirmacion') {
            doc.text('En el libro de Confirmaciones', 14, y); y += lineH;

            doc.text('No.', 14, y);
            doc.line(22, y + 1, 65, y + 1);
            doc.text('Folio:', 68, y);
            doc.line(83, y + 1, 130, y + 1);
            doc.text('Partida:', 133, y);
            doc.line(152, y + 1, 204, y + 1);

            if (sacramento.folio || sacramento.partida || sacramento.libro) {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(color.r, color.g, color.b);
                if (sacramento.libro) doc.text(sacramento.libro, 24, y);
                if (sacramento.folio) doc.text(sacramento.folio, 85, y);
                if (sacramento.partida) doc.text(sacramento.partida, 154, y);
            }
            y += lineH;

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            doc.text('De esta Parroquia, consta que el día', 14, y);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(color.r, color.g, color.b);
            doc.text(`${diaSacramento}`, 90, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            doc.text('de', 98, y);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(color.r, color.g, color.b);
            doc.text(`${mesSacramento}`, 104, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            doc.text('del año', 138, y);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(color.r, color.g, color.b);
            doc.text(`${anioSacramento}`, 158, y);
            y += lineH;

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            if (sacramento.ministro) {
                campoLinea('Su excelencia Mons.:', sacramento.ministro, y);
                y += lineH;
            } else {
                campoLinea('Su excelencia Mons.:', '', y); y += lineH;
                doc.line(14, y + 1, 204, y + 1); y += lineH;
            }

            campoLinea('Confirió el Sacramento de la Confirmación a:',
                `${feligres.nombres} ${feligres.apellidos}`, y);
            y += lineH;
            doc.line(14, y + 1, 204, y + 1); y += lineH;

            if (feligres.fecha_nacimiento) {
                const edad = new Date().getFullYear() - new Date(feligres.fecha_nacimiento).getFullYear();
                doc.text(`de: `, 14, y);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(color.r, color.g, color.b);
                doc.text(`${edad}`, 25, y);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(30, 30, 30);
                doc.text('años de edad,', 35, y);
                y += lineH;
            }

            campoLinea('bautizado en la Parroquia de:', '', y); y += lineH;
            campoLinea('Hijo (a) de:', '', y); y += lineH;
            doc.line(14, y + 1, 204, y + 1); y += lineH;
            campoLinea('y de:', '', y); y += lineH;
            doc.line(14, y + 1, 204, y + 1); y += lineH;

            campoLinea('Padrinos:', '', y); y += lineH;
            if (sacramento.padrino_1 || sacramento.padrino_2) {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(color.r, color.g, color.b);
                const padrinos = [sacramento.padrino_1, sacramento.padrino_2].filter(Boolean).join(' y ');
                doc.text(padrinos, 14, y);
            }
            doc.line(14, y + 1, 204, y + 1); y += lineH;
            doc.line(14, y + 1, 204, y + 1); y += lineH * 1.5;

            campoLinea('Anotación marginal:', '', y); y += lineH;
            doc.line(14, y + 1, 204, y + 1); y += lineH * 2;

        } else if (sacramento.tipo === 'matrimonio') {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            doc.text('El infrascrito Párroco, hace constar:', 14, y); y += lineH;

            doc.text('Que en fecha:', 14, y);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(color.r, color.g, color.b);
            doc.text(`${diaSacramento}`, 52, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            doc.text('de', 62, y);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(color.r, color.g, color.b);
            doc.text(`${mesSacramento}`, 68, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            doc.text('de', 110, y);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(color.r, color.g, color.b);
            doc.text(`${anioSacramento}`, 116, y);
            y += lineH;

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            doc.text('Contrajeron Matrimonio Religioso:', 14, y); y += lineH;

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(color.r, color.g, color.b);
            doc.text(`${feligres.nombres} ${feligres.apellidos}`, 14, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            doc.line(14, y + 1, 204, y + 1); y += lineH;
            doc.line(14, y + 1, 204, y + 1); y += lineH * 1.5;

            doc.text('Según consta el Libro:', 14, y); y += lineH;

            doc.text('No.', 14, y);
            doc.line(22, y + 1, 75, y + 1);
            doc.text('Folio:', 78, y);
            doc.line(93, y + 1, 145, y + 1);
            doc.text('Partida:', 148, y);
            doc.line(167, y + 1, 204, y + 1);

            if (sacramento.folio || sacramento.partida || sacramento.libro) {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(color.r, color.g, color.b);
                if (sacramento.libro) doc.text(sacramento.libro, 24, y);
                if (sacramento.folio) doc.text(sacramento.folio, 95, y);
                if (sacramento.partida) doc.text(sacramento.partida, 169, y);
            }
            y += lineH * 1.5;

            campoLinea('Anotación marginal:', '', y); y += lineH;
            doc.line(14, y + 1, 204, y + 1); y += lineH;
            doc.line(14, y + 1, 204, y + 1); y += lineH * 2;
        }

        // ── FECHA DE EMISIÓN ──
        const [dia, mes, anio] = fechaEmision.split(' de ');
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 30, 30);
        doc.text('Guatemala', 14, y);
        doc.line(38, y + 1, 80, y + 1);
        doc.text('de', 83, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(color.r, color.g, color.b);
        doc.text(mesSacramento, 90, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 30, 30);
        doc.text('del año', 138, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(color.r, color.g, color.b);
        doc.text(String(new Date().getFullYear()), 158, y);
        y += lineH * 3;

        // ── FIRMA ──
        doc.setDrawColor(color.r, color.g, color.b);
        doc.setLineWidth(0.5);
        doc.line(74, y, 148, y);
        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(color.r, color.g, color.b);
        doc.setFontSize(11);
        doc.text('Párroco', 106, y, { align: 'center' });

        // ── PIE DE PÁGINA ──
        doc.setLineWidth(0.8);
        doc.setDrawColor(color.r, color.g, color.b);
        doc.line(14, 258, 204, 258);
        doc.setLineWidth(0.3);
        doc.line(14, 260, 204, 260);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(color.r, color.g, color.b);
        doc.text('0 Calle 0-14 Zona 4, Sumpango Sacatepéquez, Guatemala C.A.', 106, 264, { align: 'center' });
        doc.text('Teléfono: 7833-1366  •  E-mail: sanagustinparroquiasumpangosac@gmail.com', 106, 269, { align: 'center' });

        // ── MARCA DE AGUA SUTIL ──
        doc.setTextColor(color.r, color.g, color.b);
        doc.setFontSize(48);
        doc.setFont('helvetica', 'bold');
        doc.setGState(new doc.GState({ opacity: 0.04 }));
        doc.text('PARROQUIA', 106, 150, { align: 'center', angle: 45 });
        doc.setGState(new doc.GState({ opacity: 1 }));

        // ── NÚMERO DE SERIE ──
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        const serie = `PGIP-${sacramento.tipo.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-8)}`;
        doc.text(`Serie: ${serie}`, 14, 273);
        doc.text(`Emitido: ${fechaEmision}`, 204, 273, { align: 'right' });

        doc.save(`constancia_${sacramento.tipo}_${feligres.apellidos.replace(/\s/g, '_')}.pdf`);
    };

    const tipoColor = {
        bautismo: { bg: '#ebf8ff', color: '#2b6cb0' },
        confirmacion: { bg: '#faf5ff', color: '#6b46c1' },
        matrimonio: { bg: '#fff5f0', color: '#c05621' }
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