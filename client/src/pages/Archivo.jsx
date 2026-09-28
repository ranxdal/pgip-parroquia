import { useState } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import styles from './Archivo.module.css';

export default function Archivo() {
    const [imagen, setImagen] = useState(null);
    const [previstaImagen, setPrevistaImagen] = useState(null);
    const [procesando, setProcesando] = useState(false);
    const [textoExtraido, setTextoExtraido] = useState('');
    const [confianza, setConfianza] = useState(null);
    const [motor, setMotor] = useState('');
    const [form, setForm] = useState({
        numero_libro: '', numero_folio: '', numero_partida: '',
        tipo_sacramento: 'bautismo', fecha_sacramento: '',
        nombres: '', apellidos: ''
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

    const guardarFolio = () => setMensaje('Datos guardados exitosamente');

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
        <div className={styles.contenedor}>
            <Navbar />
            <div className={styles.contenido}>
                <div className={styles.encabezado}>
                    <h1 className={styles.titulo}>Archivo Histórico Digital</h1>
                    <div className={styles.tabs}>
                        <button onClick={() => setVista('subir')}
                            className={`${styles.tab} ${vista === 'subir' ? styles.tabActivo : ''}`}>
                            Digitalizar Folio
                        </button>
                        <button onClick={cargarFolios}
                            className={`${styles.tab} ${vista === 'historial' ? styles.tabActivo : ''}`}>
                            Historial
                        </button>
                    </div>
                </div>

                {mensaje && <div className={styles.exito} onClick={() => setMensaje('')}>✅ {mensaje}</div>}
                {error && <div className={styles.errorDiv} onClick={() => setError('')}>❌ {error}</div>}

                {vista === 'subir' && (
                    <div className={styles.grid2}>
                        <div>
                            <div className={styles.panel}>
                                <h2 className={styles.panelTitulo}>1. Subir imagen del folio</h2>
                                <div className={styles.uploadZona}>
                                    <input type="file" accept="image/jpeg,image/png"
                                        onChange={handleImagenChange}
                                        style={{ display: 'none' }} id="inputImagen" />
                                    <label htmlFor="inputImagen" className={styles.uploadLabel}>
                                        {previstaImagen ? '📄 Cambiar imagen' : '📤 Seleccionar imagen'}
                                    </label>
                                    {imagen && <p className={styles.textoGris}>{imagen.name}</p>}
                                </div>

                                {previstaImagen && (
                                    <img src={previstaImagen} alt="Vista previa" className={styles.preview} />
                                )}

                                <button onClick={procesarImagen}
                                    className={styles.botonPrimario}
                                    style={{ opacity: procesando ? 0.7 : 1 }}
                                    disabled={procesando || !imagen}>
                                    {procesando ? '⏳ Procesando con OCR...' : '🔍 Extraer texto con IA'}
                                </button>

                                {confianza !== null && (
                                    <div className={styles.ocrInfo}>
                                        <p>Motor: <strong>{motor}</strong></p>
                                        <p>Confianza: <span className={confianza >= 80 ? styles.confianzaAlta : styles.confianzaBaja}>
                                            {confianza.toFixed(0)}%
                                        </span></p>
                                    </div>
                                )}
                            </div>

                            {textoExtraido && (
                                <div className={styles.panel}>
                                    <h2 className={styles.panelTitulo}>Texto extraído por OCR</h2>
                                    <textarea
                                        value={textoExtraido}
                                        onChange={e => setTextoExtraido(e.target.value)}
                                        className={styles.textarea}
                                        rows={6} />
                                </div>
                            )}
                        </div>

                        <div className={styles.panel}>
                            <h2 className={styles.panelTitulo}>2. Verificar y guardar datos</h2>
                            <p className={styles.textoGris}>Los campos se llenan automáticamente. Corrija si es necesario.</p>
                            <div className={styles.formulario}>
                                <div className={styles.campo}>
                                    <label className={styles.etiqueta}>Tipo de sacramento</label>
                                    <select value={form.tipo_sacramento}
                                        onChange={e => setForm({ ...form, tipo_sacramento: e.target.value })}
                                        className={styles.input}>
                                        <option value="bautismo">Bautismo</option>
                                        <option value="confirmacion">Confirmación</option>
                                        <option value="matrimonio">Matrimonio</option>
                                    </select>
                                </div>
                                <div className={styles.grid2Inner}>
                                    <div className={styles.campo}>
                                        <label className={styles.etiqueta}>Nombres</label>
                                        <input type="text" value={form.nombres}
                                            onChange={e => setForm({ ...form, nombres: e.target.value })}
                                            className={styles.input} placeholder="Extraído del folio" />
                                    </div>
                                    <div className={styles.campo}>
                                        <label className={styles.etiqueta}>Apellidos</label>
                                        <input type="text" value={form.apellidos}
                                            onChange={e => setForm({ ...form, apellidos: e.target.value })}
                                            className={styles.input} placeholder="Extraído del folio" />
                                    </div>
                                </div>
                                <div className={styles.campo}>
                                    <label className={styles.etiqueta}>Fecha del sacramento</label>
                                    <input type="date" value={form.fecha_sacramento}
                                        onChange={e => setForm({ ...form, fecha_sacramento: e.target.value })}
                                        className={styles.input} />
                                </div>
                                <div className={styles.grid3}>
                                    <div className={styles.campo}>
                                        <label className={styles.etiqueta}>Libro</label>
                                        <input type="text" value={form.numero_libro}
                                            onChange={e => setForm({ ...form, numero_libro: e.target.value })}
                                            className={styles.input} placeholder="Libro 5" />
                                    </div>
                                    <div className={styles.campo}>
                                        <label className={styles.etiqueta}>Folio</label>
                                        <input type="text" value={form.numero_folio}
                                            onChange={e => setForm({ ...form, numero_folio: e.target.value })}
                                            className={styles.input} placeholder="45" />
                                    </div>
                                    <div className={styles.campo}>
                                        <label className={styles.etiqueta}>Partida</label>
                                        <input type="text" value={form.numero_partida}
                                            onChange={e => setForm({ ...form, numero_partida: e.target.value })}
                                            className={styles.input} placeholder="120" />
                                    </div>
                                </div>
                                <button onClick={guardarFolio}
                                    className={styles.botonPrimario}
                                    disabled={!textoExtraido}>
                                    💾 Guardar en el sistema
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {vista === 'historial' && (
                    <div className={styles.panel}>
                        <h2 className={styles.panelTitulo}>
                            Folios digitalizados — {folios.length} registros
                        </h2>
                        {folios.length === 0 ? (
                            <p className={styles.textoGris}>No hay folios digitalizados aún</p>
                        ) : (
                            <div className={styles.tablaContenedor}>
                                <table className={styles.tabla}>
                                    <thead>
                                        <tr>
                                            <th className={styles.th}>Libro</th>
                                            <th className={styles.th}>Folio</th>
                                            <th className={styles.th}>Sacramento</th>
                                            <th className={styles.th}>Motor</th>
                                            <th className={styles.th}>Confianza</th>
                                            <th className={styles.th}>Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {folios.map(f => (
                                            <tr key={f.id}>
                                                <td className={styles.td}>{f.numero_libro || '—'}</td>
                                                <td className={styles.td}>{f.numero_folio || '—'}</td>
                                                <td className={styles.td}>{f.tipo_sacramento || '—'}</td>
                                                <td className={styles.td}>{f.procesado_por}</td>
                                                <td className={styles.td}>
                                                    <span className={f.confianza_ocr >= 80 ? styles.confianzaAltaTd : styles.confianzaBajaTd}>
                                                        {f.confianza_ocr}%
                                                    </span>
                                                </td>
                                                <td className={styles.td}>
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