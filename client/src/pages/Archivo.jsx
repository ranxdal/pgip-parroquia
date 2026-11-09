import { useState } from 'react';
import api from '../services/api';
import { extraerCampos } from '../services/extraerCampos';
import Navbar from '../components/Navbar';
import styles from './Archivo.module.css';

const FORM_INICIAL = {
    tipo_sacramento:  'bautismo',
    fecha_sacramento: '',
    numero_libro:     '',
    numero_folio:     '',
    numero_partida:   '',
    // Feligrés
    nombres:          '',
    apellidos:        '',
    fecha_nacimiento: '',
    // Padres
    nombre_padre:     '',
    nombre_madre:     '',
    // Padrinos / testigos
    padrino_1:        '',
    padrino_2:        '',
    // Ministro / obispo
    ministro:         '',
    // Matrimonio
    conyuge:          '',
};

export default function Archivo() {
    const [imagen, setImagen] = useState(null);
    const [previstaImagen, setPrevistaImagen] = useState(null);
    const [procesando, setProcesando] = useState(false);
    const [textoExtraido, setTextoExtraido] = useState('');
    const [confianza, setConfianza] = useState(null);
    const [motor, setMotor] = useState('');
    const [form, setForm] = useState(FORM_INICIAL);
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');
    const [vista, setVista] = useState('subir');
    const [folios, setFolios] = useState([]);
    const [guardando, setGuardando] = useState(false);
    const [folioId, setFolioId] = useState(null);

    const set = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));

    // ── Imagen ──────────────────────────────────────────────
    const handleImagenChange = (e) => {
        const archivo = e.target.files[0];
        if (!archivo) return;
        setImagen(archivo);
        setPrevistaImagen(URL.createObjectURL(archivo));
        setTextoExtraido('');
        setConfianza(null);
        setFolioId(null);
    };

    // ── OCR ─────────────────────────────────────────────────
    const procesarImagen = async () => {
        if (!imagen) return setError('Seleccione una imagen primero');
        setProcesando(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('imagen', imagen);
            formData.append('numero_libro',    form.numero_libro);
            formData.append('numero_folio',    form.numero_folio);
            formData.append('numero_partida',  form.numero_partida);
            formData.append('tipo_sacramento', form.tipo_sacramento);

            const { data } = await api.post('/archivo/subir', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setTextoExtraido(data.folio.texto_extraido);
            setConfianza(data.ocr.confianza);
            setMotor(data.ocr.motor);
            setFolioId(data.folio.id);
            const n = extraerDatosDelTexto(data.folio.texto_extraido);
            setMensaje(n > 0
                ? `Imagen procesada — se detectaron ${n} campos. Verifique y corrija los datos`
                : 'Imagen procesada — no se detectaron campos automáticamente, complételos manualmente');
        } catch (err) {
            setError(err.response?.data?.error || 'Error al procesar la imagen');
        } finally {
            setProcesando(false);
        }
    };

    // ── Extracción automática de campos a partir del texto OCR ──
    // La lógica está en services/extraerCampos.js. Devuelve cuántos campos detectó.
    // Libro / folio / partida escritos a mano antes de procesar no se pisan.
    const extraerDatosDelTexto = (texto) => {
        const encontrados = extraerCampos(texto);
        setForm(prev => {
            const nuevo = { ...prev };
            for (const [campo, valor] of Object.entries(encontrados)) {
                const conservar = ['numero_libro', 'numero_folio', 'numero_partida'].includes(campo);
                if (conservar && prev[campo]) continue;
                nuevo[campo] = valor;
            }
            return nuevo;
        });
        return Object.keys(encontrados).length;
    };

    // ── Guardar ──────────────────────────────────────────────
    const guardarFolio = async () => {
        setGuardando(true);
        setError('');
        try {
            await api.post('/archivo/guardar', { ...form, id: folioId });
            setMensaje('Datos guardados exitosamente');
            setForm(FORM_INICIAL);
            setImagen(null);
            setPrevistaImagen(null);
            setTextoExtraido('');
            setConfianza(null);
            setFolioId(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al guardar');
        } finally {
            setGuardando(false);
        }
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

    const esMatrimonio   = form.tipo_sacramento === 'matrimonio';
    const esConfirmacion = form.tipo_sacramento === 'confirmacion';
    const esBautismo     = form.tipo_sacramento === 'bautismo';

    return (
        <div className={styles.contenedor}>
            <Navbar />
            <div className={styles.contenido}>
                {/* ── Hero encabezado ── */}
                <div className={styles.hero}>
                    <div className={styles.heroTexto}>
                        <div className={styles.heroTituloFila}>
                            <span className={styles.heroIcono}>📁</span>
                            <h1 className={styles.heroTitulo}>Archivo Histórico</h1>
                        </div>
                        <p className={styles.heroSub}>Digitalización y consulta del acervo documental · Parroquia San Agustín</p>
                    </div>
                </div>
                <div className={styles.encabezado}>
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

                {mensaje && <div className={styles.exito}    onClick={() => setMensaje('')}>✅ {mensaje}</div>}
                {error   && <div className={styles.errorDiv} onClick={() => setError('')}>❌ {error}</div>}

                {/* ══════════════════════════════════════════
                    VISTA: DIGITALIZAR
                ══════════════════════════════════════════ */}
                {vista === 'subir' && (
                    <div className={styles.grid2}>

                        {/* Columna izquierda — imagen + OCR */}
                        <div>
                            {/* Panel 1: seleccionar imagen */}
                            <div className={styles.panel}>
                                <h2 className={styles.panelTitulo}>1. Subir imagen del folio</h2>

                                <div className={styles.uploadZona}>
                                    <input type="file" accept="image/jpeg,image/png"
                                        onChange={handleImagenChange}
                                        style={{ display: 'none' }} id="inputImagen" />
                                    <label htmlFor="inputImagen" className={styles.uploadLabel}>
                                        {previstaImagen ? '📄 Cambiar imagen' : '📤 Seleccionar imagen'}
                                    </label>
                                    {imagen && (
                                        <p className={styles.textoGris} style={{ marginTop: 8, marginBottom: 0 }}>
                                            📎 {imagen.name}
                                        </p>
                                    )}
                                </div>

                                {/* Vista previa — separada del upload */}
                                {previstaImagen && (
                                    <>
                                        <div className={styles.dividerIA} />
                                        <img src={previstaImagen} alt="Vista previa" className={styles.preview} />
                                    </>
                                )}

                                {/* Botón IA — solo cuando hay imagen, con separación clara */}
                                {imagen && (
                                    <>
                                        <div className={styles.dividerIA} />
                                        <button onClick={procesarImagen}
                                            className={styles.botonPrimario}
                                            disabled={procesando}>
                                            {procesando ? '⏳ Procesando con OCR...' : '🔍 Extraer texto con IA'}
                                        </button>
                                    </>
                                )}

                                {/* Resultado OCR */}
                                {confianza !== null && (
                                    <div className={styles.ocrInfo}>
                                        <p>Motor: <strong>{motor}</strong></p>
                                        <p>Confianza: <span className={confianza >= 80 ? styles.confianzaAlta : styles.confianzaBaja}>
                                            {confianza.toFixed(0)}%
                                        </span></p>
                                    </div>
                                )}
                            </div>

                            {/* Panel 2: texto crudo OCR — solo si hay resultado */}
                            {textoExtraido && (
                                <div className={styles.panel}>
                                    <h2 className={styles.panelTitulo}>Texto extraído por OCR</h2>
                                    <textarea
                                        value={textoExtraido}
                                        onChange={e => setTextoExtraido(e.target.value)}
                                        className={styles.textarea}
                                        rows={6} />
                                    <button onClick={() => {
                                            const n = extraerDatosDelTexto(textoExtraido);
                                            setMensaje(`Se detectaron ${n} campos del texto`);
                                        }}
                                        className={styles.botonPrimario}>
                                        🔄 Volver a extraer datos del texto
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Columna derecha — formulario completo */}
                        <div className={styles.panel}>
                            <h2 className={styles.panelTitulo}>2. Verificar y guardar datos</h2>
                            <p className={styles.textoGris}>Los campos se llenan automáticamente. Corrija si es necesario.</p>

                            <div className={styles.formulario}>

                                {/* Tipo de sacramento */}
                                <div className={styles.campo}>
                                    <label className={styles.etiqueta}>Tipo de sacramento</label>
                                    <select value={form.tipo_sacramento}
                                        onChange={e => set('tipo_sacramento', e.target.value)}
                                        className={styles.input}>
                                        <option value="bautismo">Bautismo</option>
                                        <option value="confirmacion">Confirmación</option>
                                        <option value="matrimonio">Matrimonio</option>
                                    </select>
                                </div>

                                {/* ── Datos del feligrés ── */}
                                <div className={styles.separador}>
                                    <span className={styles.separadorTexto}>Datos del feligrés</span>
                                </div>
                                <div className={styles.grid2Inner}>
                                    <div className={styles.campo}>
                                        <label className={styles.etiqueta}>Nombres</label>
                                        <input type="text" value={form.nombres}
                                            onChange={e => set('nombres', e.target.value)}
                                            className={styles.input} placeholder="Extraído del folio" />
                                    </div>
                                    <div className={styles.campo}>
                                        <label className={styles.etiqueta}>Apellidos</label>
                                        <input type="text" value={form.apellidos}
                                            onChange={e => set('apellidos', e.target.value)}
                                            className={styles.input} placeholder="Extraído del folio" />
                                    </div>
                                </div>

                                {/* Fecha de nacimiento — bautismo y confirmación */}
                                {!esMatrimonio && (
                                    <div className={styles.campo}>
                                        <label className={styles.etiqueta}>Fecha de nacimiento</label>
                                        <input type="date" value={form.fecha_nacimiento}
                                            onChange={e => set('fecha_nacimiento', e.target.value)}
                                            className={styles.input} />
                                    </div>
                                )}

                                {/* Fecha del sacramento */}
                                <div className={styles.campo}>
                                    <label className={styles.etiqueta}>Fecha del sacramento</label>
                                    <input type="date" value={form.fecha_sacramento}
                                        onChange={e => set('fecha_sacramento', e.target.value)}
                                        className={styles.input} />
                                </div>

                                {/* ── Libro / Folio / Partida ── */}
                                <div className={styles.separador}>
                                    <span className={styles.separadorTexto}>Referencia de archivo</span>
                                </div>
                                <div className={styles.grid3}>
                                    <div className={styles.campo}>
                                        <label className={styles.etiqueta}>Libro</label>
                                        <input type="text" value={form.numero_libro}
                                            onChange={e => set('numero_libro', e.target.value)}
                                            className={styles.input} placeholder="14" />
                                    </div>
                                    <div className={styles.campo}>
                                        <label className={styles.etiqueta}>Folio</label>
                                        <input type="text" value={form.numero_folio}
                                            onChange={e => set('numero_folio', e.target.value)}
                                            className={styles.input} placeholder="54" />
                                    </div>
                                    <div className={styles.campo}>
                                        <label className={styles.etiqueta}>Partida</label>
                                        <input type="text" value={form.numero_partida}
                                            onChange={e => set('numero_partida', e.target.value)}
                                            className={styles.input} placeholder="115" />
                                    </div>
                                </div>

                                {/* ── Padres — bautismo y confirmación ── */}
                                {!esMatrimonio && (
                                    <>
                                        <div className={styles.separador}>
                                            <span className={styles.separadorTexto}>Datos de los padres</span>
                                        </div>
                                        <div className={styles.grid2Inner}>
                                            <div className={styles.campo}>
                                                <label className={styles.etiqueta}>Nombre del padre</label>
                                                <input type="text" value={form.nombre_padre}
                                                    onChange={e => set('nombre_padre', e.target.value)}
                                                    className={styles.input} placeholder="Nombre completo" />
                                            </div>
                                            <div className={styles.campo}>
                                                <label className={styles.etiqueta}>Nombre de la madre</label>
                                                <input type="text" value={form.nombre_madre}
                                                    onChange={e => set('nombre_madre', e.target.value)}
                                                    className={styles.input} placeholder="Nombre completo" />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* ── Cónyuge + padrinos — solo matrimonio ── */}
                                {esMatrimonio && (
                                    <>
                                        <div className={styles.separador}>
                                            <span className={styles.separadorTexto}>Cónyuge</span>
                                        </div>
                                        <div className={styles.campo}>
                                            <label className={styles.etiqueta}>Nombre del cónyuge</label>
                                            <input type="text" value={form.conyuge}
                                                onChange={e => set('conyuge', e.target.value)}
                                                className={styles.input} placeholder="Nombre completo del cónyuge" />
                                        </div>
                                        <div className={styles.separador}>
                                            <span className={styles.separadorTexto}>Padrinos de boda</span>
                                        </div>
                                        <div className={styles.grid2Inner}>
                                            <div className={styles.campo}>
                                                <label className={styles.etiqueta}>Padrino / Madrina 1</label>
                                                <input type="text" value={form.padrino_1}
                                                    onChange={e => set('padrino_1', e.target.value)}
                                                    className={styles.input} placeholder="Nombre completo" />
                                            </div>
                                            <div className={styles.campo}>
                                                <label className={styles.etiqueta}>Padrino / Madrina 2</label>
                                                <input type="text" value={form.padrino_2}
                                                    onChange={e => set('padrino_2', e.target.value)}
                                                    className={styles.input} placeholder="Nombre completo" />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* ── Padrinos — bautismo y confirmación ── */}
                                {!esMatrimonio && (
                                    <>
                                        <div className={styles.separador}>
                                            <span className={styles.separadorTexto}>
                                                {esBautismo ? 'Padrinos de bautismo' : 'Padrinos de confirmación'}
                                            </span>
                                        </div>
                                        <div className={styles.grid2Inner}>
                                            <div className={styles.campo}>
                                                <label className={styles.etiqueta}>Padrino / Madrina 1</label>
                                                <input type="text" value={form.padrino_1}
                                                    onChange={e => set('padrino_1', e.target.value)}
                                                    className={styles.input} placeholder="Nombre completo" />
                                            </div>
                                            <div className={styles.campo}>
                                                <label className={styles.etiqueta}>Padrino / Madrina 2</label>
                                                <input type="text" value={form.padrino_2}
                                                    onChange={e => set('padrino_2', e.target.value)}
                                                    className={styles.input} placeholder="Nombre completo" />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* ── Ministro ── */}
                                <div className={styles.separador}>
                                    <span className={styles.separadorTexto}>
                                        {esConfirmacion ? 'Obispo confirmante' : 'Ministro celebrante'}
                                    </span>
                                </div>
                                <div className={styles.campo}>
                                    <label className={styles.etiqueta}>
                                        {esConfirmacion ? 'Nombre del obispo' : 'Nombre del ministro / párroco'}
                                    </label>
                                    <input type="text" value={form.ministro}
                                        onChange={e => set('ministro', e.target.value)}
                                        className={styles.input} placeholder="Nombre completo" />
                                </div>

                                <button onClick={guardarFolio}
                                    className={styles.botonPrimario}
                                    disabled={guardando}>
                                    {guardando ? '⏳ Guardando...' : '💾 Guardar en el sistema'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════
                    VISTA: HISTORIAL
                ══════════════════════════════════════════ */}
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
                                            <th className={styles.th}>Feligrés</th>
                                            <th className={styles.th}>Motor</th>
                                            <th className={styles.th}>Confianza</th>
                                            <th className={styles.th}>Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {folios.map(f => (
                                            <tr key={f.id}>
                                                <td className={styles.td}>{f.numero_libro  || '—'}</td>
                                                <td className={styles.td}>{f.numero_folio  || '—'}</td>
                                                <td className={styles.td} style={{ textTransform: 'capitalize' }}>
                                                    {f.tipo_sacramento || '—'}
                                                </td>
                                                <td className={styles.td}>
                                                    {f.nombres ? `${f.nombres} ${f.apellidos}` : '—'}
                                                </td>
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