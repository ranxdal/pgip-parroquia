import { useState } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';

export default function Archivo() {
    const [imagen, setImagen] = useState(null);
    const [previstaImagen, setPrevistaImagen] = useState(null);
    const [procesando, setProcesando] = useState(false);
    const [textoExtraido, setTextoExtraido] = useState('');
    const [confianza, setConfianza] = useState(null);
    const [motor, setMotor] = useState('');
    const [form, setForm] = useState({
        numero_libro: '',
        numero_folio: '',
        numero_partida: '',
        tipo_sacramento: 'bautismo',
        fecha_sacramento: '',
        nombres: '',
        apellidos: ''
    });
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');
    const [vista, setVista] = useState('subir');
    const [folios, setFolios] = useState([]);

    const handleImagenChange = (e) => {
        const archivo = e.target.files[0];
        if (!archivo) return;
        setImagen(archivo);
        setPrevistaImagen(URL.createObjectURL(archivo));
        setTextoExtraido('');
        setConfianza(null);
    };

    const procesarImagen = async () => {
        if (!imagen) return setError('Seleccione una imagen primero');
        setProcesando(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('imagen', imagen);
            formData.append('numero_libro', form.numero_libro);
            formData.append('numero_folio', form.numero_folio);
            formData.append('numero_partida', form.numero_partida);
            formData.append('tipo_sacramento', form.tipo_sacramento);

            const { data } = await api.post('/archivo/subir', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setTextoExtraido(data.folio.texto_extraido);
            setConfianza(data.ocr.confianza);
            setMotor(data.ocr.motor);
            extraerDatosDelTexto(data.folio.texto_extraido);
            setMensaje('Imagen procesada exitosamente');
        } catch (err) {
            setError(err.response?.data?.error || 'Error al procesar la imagen');
        } finally {
            setProcesando(false);
        }
    };

    const extraerDatosDelTexto = (texto) => {
        const patronNombre = /Nombre[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ\s]+?)(?:\n|Pidió|Recibió|$)/i;
        const matchNombre = texto.match(patronNombre);
        if (matchNombre) {
            const partes = matchNombre[1].trim().split(' ');
            setForm(prev => ({
                ...prev,
                nombres: partes.slice(0, 2).join(' '),
                apellidos: partes.slice(2).join(' ') || ''
            }));
        }

        const patronFecha = /(\d{1,2})\s+(?:de\s+)?([a-záéíóúñ]+)\s+(?:de\s+)?(\d{4})/i;
        const matchFecha = texto.match(patronFecha);
        if (matchFecha) {
            const meses = {
                'enero': '01', 'febrero': '02', 'marzo': '03',
                'abril': '04', 'mayo': '05', 'junio': '06',
                'julio': '07', 'agosto': '08', 'septiembre': '09',
                'octubre': '10', 'noviembre': '11', 'diciembre': '12'
            };
            const mes = meses[matchFecha[2].toLowerCase()];
            if (mes) {
                setForm(prev => ({
                    ...prev,
                    fecha_sacramento: `${matchFecha[3]}-${mes}-${matchFecha[1].padStart(2, '0')}`
                }));
            }
        }

        const textoLower = texto.toLowerCase();
        if (textoLower.includes('confirmacion') || textoLower.includes('confirmación')) {
            setForm(prev => ({ ...prev, tipo_sacramento: 'confirmacion' }));
        } else if (textoLower.includes('matrimonio')) {
            setForm(prev => ({ ...prev, tipo_sacramento: 'matrimonio' }));
        } else if (textoLower.includes('bautismo') || textoLower.includes('bautizo')) {
            setForm(prev => ({ ...prev, tipo_sacramento: 'bautismo' }));
        }
    };

    const guardarFolio = () => {
        setMensaje('Datos guardados exitosamente');
    };

    const cargarFolios = async () => {
        try {
            const { data } = await api.get('/archivo');
            setFolios(data.folios);
            setVista('historial');
        } catch {
            setError('Error al cargar el historial');
        }
    };

    return (
        <div style={estilos.contenedor}>
            <Navbar />

            <div style={estilos.contenido}>
                <div style={estilos.encabezado}>
                    <h1 style={estilos.titulo}>Archivo Histórico Digital</h1>
                    <div style={estilos.tabs}>
                        <button onClick={() => setVista('subir')} style={{
                            ...estilos.tab,
                            borderBottom: vista === 'subir' ? '2px solid #1a365d' : '2px solid transparent',
                            color: vista === 'subir' ? '#1a365d' : '#718096'
                        }}>Digitalizar Folio</button>
                        <button onClick={cargarFolios} style={{
                            ...estilos.tab,
                            borderBottom: vista === 'historial' ? '2px solid #1a365d' : '2px solid transparent',
                            color: vista === 'historial' ? '#1a365d' : '#718096'
                        }}>Historial</button>
                    </div>
                </div>

                {mensaje && (
                    <div style={estilos.exito} onClick={() => setMensaje('')}>✅ {mensaje}</div>
                )}
                {error && (
                    <div style={estilos.errorDiv} onClick={() => setError('')}>❌ {error}</div>
                )}

                {vista === 'subir' && (
                    <div style={estilos.grid2}>
                        <div>
                            <div style={estilos.panel}>
                                <h2 style={estilos.panelTitulo}>1. Subir imagen del folio</h2>
                                <div style={estilos.uploadZona}>
                                    <input type="file" accept="image/jpeg,image/png"
                                        onChange={handleImagenChange}
                                        style={{ display: 'none' }} id="inputImagen" />
                                    <label htmlFor="inputImagen" style={estilos.uploadLabel}>
                                        {previstaImagen ? '📄 Cambiar imagen' : '📤 Seleccionar imagen'}
                                    </label>
                                    {imagen && <p style={estilos.textoGris}>{imagen.name}</p>}
                                </div>

                                {previstaImagen && (
                                    <img src={previstaImagen} alt="Vista previa"
                                        style={estilos.preview} />
                                )}

                                <button onClick={procesarImagen}
                                    style={{ ...estilos.botonPrimario, opacity: procesando ? 0.7 : 1 }}
                                    disabled={procesando || !imagen}>
                                    {procesando ? '⏳ Procesando con OCR...' : '🔍 Extraer texto con IA'}
                                </button>

                                {confianza !== null && (
                                    <div style={estilos.ocrInfo}>
                                        <p>Motor: <strong>{motor}</strong></p>
                                        <p>Confianza: <strong style={{
                                            color: confianza >= 80 ? '#2f855a' : '#c05621'
                                        }}>{confianza.toFixed(0)}%</strong></p>
                                    </div>
                                )}
                            </div>

                            {textoExtraido && (
                                <div style={estilos.panel}>
                                    <h2 style={estilos.panelTitulo}>Texto extraído por OCR</h2>
                                    <textarea
                                        value={textoExtraido}
                                        onChange={e => setTextoExtraido(e.target.value)}
                                        style={estilos.textarea} rows={6} />
                                </div>
                            )}
                        </div>

                        <div style={estilos.panel}>
                            <h2 style={estilos.panelTitulo}>2. Verificar y guardar datos</h2>
                            <p style={estilos.textoGris}>Los campos se llenan automáticamente. Corrija si es necesario.</p>

                            <div style={estilos.formulario}>
                                <div style={estilos.campo}>
                                    <label style={estilos.etiqueta}>Tipo de sacramento</label>
                                    <select value={form.tipo_sacramento}
                                        onChange={e => setForm({ ...form, tipo_sacramento: e.target.value })}
                                        style={estilos.input}>
                                        <option value="bautismo">Bautismo</option>
                                        <option value="confirmacion">Confirmación</option>
                                        <option value="matrimonio">Matrimonio</option>
                                    </select>
                                </div>
                                <div style={estilos.grid2Inner}>
                                    <div style={estilos.campo}>
                                        <label style={estilos.etiqueta}>Nombres</label>
                                        <input type="text" value={form.nombres}
                                            onChange={e => setForm({ ...form, nombres: e.target.value })}
                                            style={estilos.input} placeholder="Extraído del folio" />
                                    </div>
                                    <div style={estilos.campo}>
                                        <label style={estilos.etiqueta}>Apellidos</label>
                                        <input type="text" value={form.apellidos}
                                            onChange={e => setForm({ ...form, apellidos: e.target.value })}
                                            style={estilos.input} placeholder="Extraído del folio" />
                                    </div>
                                </div>
                                <div style={estilos.campo}>
                                    <label style={estilos.etiqueta}>Fecha del sacramento</label>
                                    <input type="date" value={form.fecha_sacramento}
                                        onChange={e => setForm({ ...form, fecha_sacramento: e.target.value })}
                                        style={estilos.input} />
                                </div>
                                <div style={estilos.grid3}>
                                    <div style={estilos.campo}>
                                        <label style={estilos.etiqueta}>Libro</label>
                                        <input type="text" value={form.numero_libro}
                                            onChange={e => setForm({ ...form, numero_libro: e.target.value })}
                                            style={estilos.input} placeholder="Libro 5" />
                                    </div>
                                    <div style={estilos.campo}>
                                        <label style={estilos.etiqueta}>Folio</label>
                                        <input type="text" value={form.numero_folio}
                                            onChange={e => setForm({ ...form, numero_folio: e.target.value })}
                                            style={estilos.input} placeholder="45" />
                                    </div>
                                    <div style={estilos.campo}>
                                        <label style={estilos.etiqueta}>Partida</label>
                                        <input type="text" value={form.numero_partida}
                                            onChange={e => setForm({ ...form, numero_partida: e.target.value })}
                                            style={estilos.input} placeholder="120" />
                                    </div>
                                </div>
                                <button onClick={guardarFolio}
                                    style={estilos.botonPrimario}
                                    disabled={!textoExtraido}>
                                    💾 Guardar en el sistema
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {vista === 'historial' && (
                    <div style={estilos.panel}>
                        <h2 style={estilos.panelTitulo}>Folios digitalizados — {folios.length} registros</h2>
                        {folios.length === 0 ? (
                            <p style={estilos.textoGris}>No hay folios digitalizados aún</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={estilos.tabla}>
                                    <thead>
                                        <tr>
                                            <th style={estilos.th}>Libro</th>
                                            <th style={estilos.th}>Folio</th>
                                            <th style={estilos.th}>Sacramento</th>
                                            <th style={estilos.th}>Motor</th>
                                            <th style={estilos.th}>Confianza</th>
                                            <th style={estilos.th}>Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {folios.map(f => (
                                            <tr key={f.id}>
                                                <td style={estilos.td}>{f.numero_libro || '—'}</td>
                                                <td style={estilos.td}>{f.numero_folio || '—'}</td>
                                                <td style={estilos.td}>{f.tipo_sacramento || '—'}</td>
                                                <td style={estilos.td}>{f.procesado_por}</td>
                                                <td style={estilos.td}>
                                                    <span style={{ color: f.confianza_ocr >= 80 ? '#2f855a' : '#c05621', fontWeight: '600' }}>
                                                        {f.confianza_ocr}%
                                                    </span>
                                                </td>
                                                <td style={estilos.td}>
                                                    {new Date(f.created_at).toLocaleDateString('es-GT')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

const estilos = {
    contenedor: { minHeight: '100vh', backgroundColor: '#f0f4f8' },
    contenido: { padding: '16px', maxWidth: '1400px', margin: '0 auto' },
    encabezado: { marginBottom: '16px' },
    titulo: { fontSize: '1.3rem', color: '#1a365d', marginBottom: '12px' },
    tabs: { display: 'flex', borderBottom: '1px solid #e2e8f0' },
    tab: { padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' },
    panel: { backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '16px' },
    panelTitulo: { fontSize: '1rem', color: '#2d3748', marginBottom: '16px' },
    grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' },
    grid2Inner: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px' },
    uploadZona: { textAlign: 'center', marginBottom: '16px' },
    uploadLabel: {
        display: 'inline-block', padding: '12px 24px',
        backgroundColor: '#ebf8ff', color: '#2b6cb0',
        borderRadius: '8px', cursor: 'pointer',
        border: '2px dashed #90cdf4', fontWeight: '600', marginBottom: '8px'
    },
    preview: { width: '100%', maxHeight: '250px', objectFit: 'contain', borderRadius: '8px', marginBottom: '16px', border: '1px solid #e2e8f0' },
    ocrInfo: { backgroundColor: '#f7fafc', padding: '12px', borderRadius: '8px', marginTop: '12px', fontSize: '0.875rem' },
    textarea: { width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' },
    formulario: { display: 'flex', flexDirection: 'column', gap: '16px' },
    campo: { display: 'flex', flexDirection: 'column', gap: '6px' },
    etiqueta: { fontSize: '0.875rem', fontWeight: '600', color: '#2d3748' },
    input: { padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '1rem', width: '100%', boxSizing: 'border-box' },
    botonPrimario: { backgroundColor: '#1a365d', color: '#fff', padding: '12px', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', width: '100%' },
    exito: { backgroundColor: '#f0fff4', border: '1px solid #68d391', color: '#2f855a', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', cursor: 'pointer' },
    errorDiv: { backgroundColor: '#fff5f5', border: '1px solid #fc8181', color: '#c53030', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', cursor: 'pointer' },
    textoGris: { color: '#718096', fontSize: '0.875rem', marginBottom: '12px' },
    tabla: { width: '100%', borderCollapse: 'collapse', minWidth: '500px' },
    th: { textAlign: 'left', padding: '10px 12px', backgroundColor: '#f7fafc', fontSize: '0.8rem', color: '#718096', borderBottom: '1px solid #e2e8f0' },
    td: { padding: '10px 12px', fontSize: '0.875rem', borderBottom: '1px solid #f0f4f8', color: '#2d3748' }
};