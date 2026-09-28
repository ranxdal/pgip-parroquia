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

    const generarCertificado = (sacramento) => {
        const doc = new jsPDF();
        const fechaEmision = new Date().toLocaleDateString('es-GT');
        const fechaSacramento = new Date(sacramento.fecha).toLocaleDateString('es-GT');

        const tipoTitulo = {
            bautismo: 'CONSTANCIA DE BAUTISMO',
            confirmacion: 'CONSTANCIA DE CONFIRMACIÓN',
            matrimonio: 'CONSTANCIA DE MATRIMONIO'
        };

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('PARROQUIA SAN AGUSTÍN DE SUMPANGO', 105, 20, { align: 'center' });
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('Sumpango, Sacatepéquez, Guatemala', 105, 28, { align: 'center' });
        doc.setLineWidth(0.5);
        doc.line(20, 33, 190, 33);

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(tipoTitulo[sacramento.tipo] || 'CONSTANCIA SACRAMENTAL', 105, 45, { align: 'center' });
        doc.line(20, 50, 190, 50);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        let y = 65;
        const lineHeight = 10;

        doc.text('El infrascrito Párroco de la Parroquia San Agustín de Sumpango,', 20, y);
        y += lineHeight;
        doc.text('Sacatepéquez, certifica que en los libros parroquiales consta:', 20, y);
        y += lineHeight * 1.5;

        doc.setFont('helvetica', 'bold');
        doc.text('NOMBRE:', 20, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${feligres.nombres} ${feligres.apellidos}`, 60, y);
        y += lineHeight;

        if (feligres.fecha_nacimiento) {
            doc.setFont('helvetica', 'bold');
            doc.text('FECHA DE NACIMIENTO:', 20, y);
            doc.setFont('helvetica', 'normal');
            doc.text(new Date(feligres.fecha_nacimiento).toLocaleDateString('es-GT'), 80, y);
            y += lineHeight;
        }

        doc.setFont('helvetica', 'bold');
        doc.text(`FECHA DE ${sacramento.tipo.toUpperCase()}:`, 20, y);
        doc.setFont('helvetica', 'normal');
        doc.text(fechaSacramento, 90, y);
        y += lineHeight;

        if (sacramento.ministro) {
            doc.setFont('helvetica', 'bold');
            doc.text('MINISTRO:', 20, y);
            doc.setFont('helvetica', 'normal');
            doc.text(sacramento.ministro, 60, y);
            y += lineHeight;
        }

        if (sacramento.padrino_1) {
            doc.setFont('helvetica', 'bold');
            doc.text('PADRINO/A 1:', 20, y);
            doc.setFont('helvetica', 'normal');
            doc.text(sacramento.padrino_1, 65, y);
            y += lineHeight;
        }

        if (sacramento.padrino_2) {
            doc.setFont('helvetica', 'bold');
            doc.text('PADRINO/A 2:', 20, y);
            doc.setFont('helvetica', 'normal');
            doc.text(sacramento.padrino_2, 65, y);
            y += lineHeight;
        }

        y += lineHeight * 0.5;
        if (sacramento.libro || sacramento.folio) {
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(
                `Libro: ${sacramento.libro || '—'} | Folio: ${sacramento.folio || '—'} | Partida: ${sacramento.partida || '—'}`,
                20, y
            );
            doc.setTextColor(0);
            y += lineHeight * 1.5;
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('La presente constancia se expide a solicitud del interesado para los', 20, y);
        y += 7;
        doc.text('fines que estime conveniente.', 20, y);
        y += lineHeight * 2;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(`Sumpango, Sacatepéquez, ${fechaEmision}`, 20, y);
        y += lineHeight * 3;

        doc.line(60, y, 150, y);
        y += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('Párroco', 105, y, { align: 'center' });
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.text('Parroquia San Agustín de Sumpango', 105, y, { align: 'center' });

        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generado por PGIP — Sistema de Gestión Parroquial | ${fechaEmision}`, 105, 280, { align: 'center' });

        doc.save(`certificado_${sacramento.tipo}_${feligres.apellidos.replace(/\s/g, '_')}.pdf`);
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