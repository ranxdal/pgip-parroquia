import { useState } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
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
            const { data } = await api.get(
                `/sacramentos/feligres/buscar?termino=${busqueda}`
            );
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
        <div style={estilos.contenedor}>
            <Navbar />

            <div style={estilos.contenido}>
                <h1 style={estilos.titulo}>Emisión de Certificados Sacramentales</h1>

                {error && (
                    <div style={estilos.errorDiv} onClick={() => setError('')}>❌ {error}</div>
                )}

                <div style={estilos.panel}>
                    <h2 style={estilos.panelTitulo}>Buscar feligrés</h2>
                    <div style={estilos.busquedaFila}>
                        <input
                            type="text"
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && buscarFeligres()}
                            style={{ ...estilos.input, flex: 1 }}
                            placeholder="Nombre o apellido..."
                        />
                        <button onClick={buscarFeligres}
                            style={estilos.botonPrimario}
                            disabled={cargando}>
                            {cargando ? '...' : 'Buscar'}
                        </button>
                    </div>

                    {resultados.length > 0 && (
                        <div style={{ marginTop: '16px' }}>
                            {resultados.map(f => (
                                <div key={f.id}
                                    onClick={() => seleccionarFeligres(f)}
                                    style={estilos.resultadoItem}>
                                    <div>
                                        <strong>{f.nombres} {f.apellidos}</strong>
                                        <p style={estilos.textoGris}>Estado: {f.estado}</p>
                                    </div>
                                    <span style={estilos.verBtn}>Seleccionar →</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {feligres && (
                    <div style={estilos.panel}>
                        <h2 style={estilos.panelTitulo}>
                            {feligres.nombres} {feligres.apellidos}
                        </h2>
                        <p style={estilos.textoGris}>
                            Seleccione el sacramento para generar el certificado
                        </p>

                        {sacramentos.length === 0 ? (
                            <p style={estilos.textoGris}>No hay sacramentos registrados</p>
                        ) : (
                            <div style={estilos.sacramentosGrid}>
                                {sacramentos.map(s => (
                                    <div key={s.id} style={{
                                        ...estilos.sacramentoCard,
                                        backgroundColor: tipoColor[s.tipo]?.bg,
                                        border: sacramentoSeleccionado?.id === s.id
                                            ? `2px solid ${tipoColor[s.tipo]?.color}`
                                            : '2px solid transparent'
                                    }}
                                        onClick={() => setSacramentoSeleccionado(s)}>
                                        <p style={{
                                            fontWeight: 'bold',
                                            color: tipoColor[s.tipo]?.color,
                                            textTransform: 'capitalize',
                                            marginBottom: '4px'
                                        }}>
                                            {s.tipo}
                                        </p>
                                        <p style={estilos.textoGris}>
                                            {new Date(s.fecha).toLocaleDateString('es-GT')}
                                        </p>
                                        {s.libro && (
                                            <p style={estilos.textoGris}>
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
                                style={{ ...estilos.botonVerde, marginTop: '16px' }}>
                                🖨️ Generar Certificado de {sacramentoSeleccionado.tipo}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

const estilos = {
    contenedor: { minHeight: '100vh', backgroundColor: '#f0f4f8' },
    contenido: { padding: '16px', maxWidth: '1200px', margin: '0 auto' },
    titulo: { fontSize: '1.3rem', color: '#1a365d', marginBottom: '16px' },
    panel: { backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '16px' },
    panelTitulo: { fontSize: '1rem', color: '#2d3748', marginBottom: '16px' },
    busquedaFila: { display: 'flex', gap: '12px' },
    input: { padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box' },
    botonPrimario: { backgroundColor: '#1a365d', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' },
    botonVerde: { backgroundColor: '#2f855a', color: '#fff', padding: '12px 24px', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', width: '100%' },
    errorDiv: { backgroundColor: '#fff5f5', border: '1px solid #fc8181', color: '#c53030', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', cursor: 'pointer' },
    textoGris: { color: '#718096', fontSize: '0.875rem', margin: '2px 0' },
    resultadoItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer' },
    verBtn: { color: '#1a365d', fontWeight: '600' },
    sacramentosGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginTop: '16px' },
    sacramentoCard: { padding: '16px', borderRadius: '8px', cursor: 'pointer', transition: 'border 0.2s' }
};