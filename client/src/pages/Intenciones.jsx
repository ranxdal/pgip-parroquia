import { useState, useEffect } from 'react';
import styles from './Intenciones.module.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const getToken = () => localStorage.getItem('token');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const apiFetch = async (path, options = {}) => {
    const res = await fetch(`${API}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
            ...(options.headers || {})
        }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
    }
    return res;
};

const hoy = () => new Date().toISOString().slice(0, 10);

const formatearFecha = (fechaISO) => {
    if (!fechaISO) return '';
    const [a, m, d] = fechaISO.slice(0, 10).split('-');
    const meses = ['enero','febrero','marzo','abril','mayo','junio',
                   'julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return `${parseInt(d)} de ${meses[parseInt(m)-1]} de ${a}`;
};

// ─── Formulario de nueva intención ───────────────────────────────────────────
const FormIntencion = ({ onGuardado, onCancelar, editar }) => {
    const [form, setForm] = useState({
        fecha_misa:     editar?.fecha_misa?.slice(0, 10) || hoy(),
        nombre_familia: editar?.nombre_familia || '',
        intencion:      editar?.intencion || '',
        texto_lectura:  editar?.texto_lectura || ''
    });
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const guardar = async (e) => {
        e.preventDefault();
        if (!form.fecha_misa || !form.nombre_familia.trim() || !form.intencion.trim()) {
            setError('Fecha, familia e intención son obligatorios.');
            return;
        }
        setGuardando(true);
        setError('');
        try {
            if (editar) {
                await apiFetch(`/api/intenciones/${editar.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(form)
                });
            } else {
                await apiFetch('/api/intenciones', {
                    method: 'POST',
                    body: JSON.stringify(form)
                });
            }
            onGuardado();
        } catch (err) {
            setError(err.message);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h3>{editar ? 'Editar Intención' : 'Nueva Intención de Misa'}</h3>
                    <button className={styles.btnCerrar} onClick={onCancelar}>✕</button>
                </div>

                <form onSubmit={guardar} className={styles.form}>
                    <div className={styles.fila2}>
                        <div className={styles.campo}>
                            <label>Fecha de la misa *</label>
                            <input type="date" name="fecha_misa" value={form.fecha_misa} onChange={cambiar} />
                        </div>
                        <div className={styles.campo}>
                            <label>Nombre de la familia *</label>
                            <input
                                type="text"
                                name="nombre_familia"
                                value={form.nombre_familia}
                                onChange={cambiar}
                                placeholder="Ej: Familia García López"
                            />
                        </div>
                    </div>

                    <div className={styles.campo}>
                        <label>Intención *</label>
                        <input
                            type="text"
                            name="intencion"
                            value={form.intencion}
                            onChange={cambiar}
                            placeholder="Ej: Por el eterno descanso de Juan García"
                        />
                    </div>

                    <div className={styles.campo}>
                        <label>
                            Texto para leer en misa
                            <span className={styles.opcional}> (opcional)</span>
                        </label>
                        <textarea
                            name="texto_lectura"
                            value={form.texto_lectura}
                            onChange={cambiar}
                            rows={5}
                            placeholder="Escriba aquí el texto completo que se leerá durante la celebración de la misa para esta intención..."
                        />
                        <small className={styles.hint}>
                            Este texto se incluirá en el documento Word que se imprime para el celebrante.
                        </small>
                    </div>

                    {error && <p className={styles.error}>{error}</p>}

                    <div className={styles.acciones}>
                        <button type="button" className={styles.btnSecundario} onClick={onCancelar}>
                            Cancelar
                        </button>
                        <button type="submit" className={styles.btnPrimario} disabled={guardando}>
                            {guardando ? 'Guardando...' : editar ? 'Actualizar' : 'Registrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Intenciones() {
    const [intenciones, setIntenciones]   = useState([]);
    const [cargando, setCargando]         = useState(true);
    const [fechaFiltro, setFechaFiltro]   = useState(hoy());
    const [mostrarForm, setMostrarForm]   = useState(false);
    const [editando, setEditando]         = useState(null);
    const [exportando, setExportando]     = useState(false);
    const [mensaje, setMensaje]           = useState('');
    const [error, setError]               = useState('');

    const cargar = async () => {
        setCargando(true);
        setError('');
        try {
            const res = await apiFetch(`/api/intenciones/fecha/${fechaFiltro}`);
            const data = await res.json();
            setIntenciones(data.intenciones || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { cargar(); }, [fechaFiltro]);

    const alGuardar = () => {
        setMostrarForm(false);
        setEditando(null);
        setMensaje('Intención guardada correctamente.');
        setTimeout(() => setMensaje(''), 3500);
        cargar();
    };

    const eliminar = async (id) => {
        if (!window.confirm('¿Eliminar esta intención?')) return;
        try {
            await apiFetch(`/api/intenciones/${id}`, { method: 'DELETE' });
            setMensaje('Intención eliminada.');
            setTimeout(() => setMensaje(''), 3000);
            cargar();
        } catch (err) {
            setError(err.message);
        }
    };

    const exportarWord = async () => {
        setExportando(true);
        try {
            const res = await fetch(`${API}/api/intenciones/exportar/${fechaFiltro}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (!res.ok) throw new Error('Error al generar el documento');
            const blob = await res.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `intenciones_misa_${fechaFiltro}.docx`;
            a.click();
            URL.revokeObjectURL(url);
            setMensaje('Documento Word descargado.');
            setTimeout(() => setMensaje(''), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setExportando(false);
        }
    };

    return (
        <div className={styles.contenedor}>
            {/* Encabezado */}
            <div className={styles.encabezado}>
                <div>
                    <h1 className={styles.titulo}>Intenciones de Misa</h1>
                    <p className={styles.subtitulo}>Gestión y exportación de intenciones para el celebrante</p>
                </div>
                <button className={styles.btnPrimario} onClick={() => { setEditando(null); setMostrarForm(true); }}>
                    + Nueva Intención
                </button>
            </div>

            {/* Barra de herramientas */}
            <div className={styles.toolbar}>
                <div className={styles.filtroFecha}>
                    <label>Fecha de misa:</label>
                    <input
                        type="date"
                        value={fechaFiltro}
                        onChange={(e) => setFechaFiltro(e.target.value)}
                    />
                </div>
                <div className={styles.toolbarDerecha}>
                    <span className={styles.conteo}>
                        {intenciones.length} intención{intenciones.length !== 1 ? 'es' : ''}
                        {' '}para el {formatearFecha(fechaFiltro)}
                    </span>
                    <button
                        className={styles.btnExportar}
                        onClick={exportarWord}
                        disabled={exportando || intenciones.length === 0}
                        title={intenciones.length === 0 ? 'No hay intenciones para esta fecha' : 'Descargar documento Word'}
                    >
                        {exportando ? '⏳ Generando...' : '📄 Exportar a Word'}
                    </button>
                </div>
            </div>

            {/* Alertas */}
            {mensaje && <div className={styles.alertaOk}>{mensaje}</div>}
            {error   && <div className={styles.alertaError}>{error}</div>}

            {/* Lista de intenciones */}
            {cargando ? (
                <div className={styles.cargando}>Cargando intenciones...</div>
            ) : intenciones.length === 0 ? (
                <div className={styles.vacio}>
                    <span className={styles.iconoVacio}>📋</span>
                    <p>No hay intenciones registradas para esta fecha.</p>
                    <button className={styles.btnPrimario} onClick={() => setMostrarForm(true)}>
                        Registrar primera intención
                    </button>
                </div>
            ) : (
                <div className={styles.lista}>
                    {intenciones.map((item, idx) => (
                        <div key={item.id} className={styles.tarjeta}>
                            <div className={styles.tarjetaHeader}>
                                <span className={styles.numero}>{idx + 1}</span>
                                <div className={styles.tarjetaInfo}>
                                    <strong className={styles.familia}>{item.nombre_familia}</strong>
                                    <span className={styles.intencionTexto}>{item.intencion}</span>
                                </div>
                                <div className={styles.tarjetaAcciones}>
                                    <button
                                        className={styles.btnEditar}
                                        onClick={() => { setEditando(item); setMostrarForm(true); }}
                                        title="Editar"
                                    >✏️</button>
                                    <button
                                        className={styles.btnEliminar}
                                        onClick={() => eliminar(item.id)}
                                        title="Eliminar"
                                    >🗑️</button>
                                </div>
                            </div>

                            {item.texto_lectura && (
                                <div className={styles.textoLectura}>
                                    <span className={styles.etiquetaTexto}>Texto para la misa:</span>
                                    <p className={styles.textoLecturaContenido}>{item.texto_lectura}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Modal formulario */}
            {mostrarForm && (
                <FormIntencion
                    editar={editando}
                    onGuardado={alGuardar}
                    onCancelar={() => { setMostrarForm(false); setEditando(null); }}
                />
            )}
        </div>
    );
}