import { useState } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import styles from './Sacramentos.module.css';

export default function Sacramentos() {
    const [busqueda, setBusqueda] = useState('');
    const [resultados, setResultados] = useState([]);
    const [feligresSeleccionado, setFeligresSeleccionado] = useState(null);
    const [sacramentos, setSacramentos] = useState([]);
    const [vista, setVista] = useState('buscar');
    const [formFeligres, setFormFeligres] = useState({
        nombres: '', apellidos: '', fecha_nacimiento: '', es_catecumeno: false
    });
    const [formSacramento, setFormSacramento] = useState({
        tipo: 'bautismo', fecha: '', libro: '',
        folio: '', partida: '', ministro: '',
        padrino_1: '', padrino_2: ''
    });
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);

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

    const seleccionarFeligres = async (feligres) => {
        setFeligresSeleccionado(feligres);
        try {
            const { data } = await api.get(`/sacramentos/feligres/${feligres.id}`);
            setSacramentos(data.sacramentos);
        } catch {
            setSacramentos([]);
        }
        setVista('detalle');
    };

    const registrarFeligres = async (e) => {
        e.preventDefault();
        setCargando(true);
        setError('');
        try {
            const { data } = await api.post('/sacramentos/feligres', formFeligres);
            setMensaje('Feligrés registrado exitosamente');
            setFeligresSeleccionado(data.feligres);
            setSacramentos([]);
            setVista('detalle');
            setFormFeligres({ nombres: '', apellidos: '', fecha_nacimiento: '', es_catecumeno: false });
        } catch (err) {
            setError(err.response?.data?.error || 'Error al registrar');
        } finally {
            setCargando(false);
        }
    };

    const registrarSacramento = async (e) => {
        e.preventDefault();
        if (!feligresSeleccionado) return;
        setCargando(true);
        setError('');
        try {
            const { data } = await api.post('/sacramentos', {
                ...formSacramento,
                feligres_id: feligresSeleccionado.id
            });
            setMensaje('Sacramento registrado exitosamente');
            setSacramentos([data.sacramento, ...sacramentos]);
            setFormSacramento({
                tipo: 'bautismo', fecha: '', libro: '',
                folio: '', partida: '', ministro: '',
                padrino_1: '', padrino_2: ''
            });
        } catch (err) {
            setError(err.response?.data?.error || 'Error al registrar sacramento');
        } finally {
            setCargando(false);
        }
    };

    const tipoColor = {
        bautismo: '#ebf8ff',
        confirmacion: '#faf5ff',
        matrimonio: '#fff5f0'
    };

    return (
        <div className={styles.contenedor}>
            <Navbar />
            <div className={styles.contenido}>
                <div className={styles.encabezado}>
                    <h1 className={styles.titulo}>Registro de Sacramentos</h1>
                    <div className={styles.tabs}>
                        {['buscar', 'nuevo', 'sacramento'].map(t => (
                            <button key={t}
                                onClick={() => setVista(t)}
                                className={`${styles.tab} ${vista === t ? styles.tabActivo : ''}`}>
                                {t === 'buscar' ? 'Buscar' :
                                 t === 'nuevo' ? 'Nuevo Feligrés' : 'Sacramento'}
                            </button>
                        ))}
                    </div>
                </div>

                {mensaje && <div className={styles.exito} onClick={() => setMensaje('')}>✅ {mensaje}</div>}
                {error && <div className={styles.errorDiv} onClick={() => setError('')}>❌ {error}</div>}

                {vista === 'buscar' && (
                    <div className={styles.panel}>
                        <h2 className={styles.panelTitulo}>Búsqueda por nombre</h2>
                        <div className={styles.busquedaFila}>
                            <input type="text" value={busqueda}
                                onChange={e => setBusqueda(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && buscarFeligres()}
                                className={styles.input}
                                style={{ flex: 1 }}
                                placeholder="Nombre o apellido..." />
                            <button onClick={buscarFeligres}
                                className={styles.botonPrimario}
                                style={{ width: 'auto', padding: '10px 20px' }}
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
                                        <span className={styles.verBtn}>Ver →</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {vista === 'detalle' && feligresSeleccionado && (
                    <div>
                        <div className={styles.panel}>
                            <h2 className={styles.panelTitulo}>
                                {feligresSeleccionado.nombres} {feligresSeleccionado.apellidos}
                            </h2>
                            <p className={styles.textoGris}>Estado: {feligresSeleccionado.estado}</p>
                        </div>
                        <div className={styles.panel}>
                            <h2 className={styles.panelTitulo}>Sacramentos registrados</h2>
                            {sacramentos.length === 0 ? (
                                <p className={styles.textoGris}>No hay sacramentos registrados</p>
                            ) : (
                                sacramentos.map(s => (
                                    <div key={s.id}
                                        className={styles.sacramentoItem}
                                        style={{ backgroundColor: tipoColor[s.tipo] }}>
                                        <strong style={{ textTransform: 'capitalize' }}>{s.tipo}</strong>
                                        <p className={styles.textoGris}>
                                            {new Date(s.fecha).toLocaleDateString('es-GT')}
                                            {s.libro && ` — Libro: ${s.libro}`}
                                            {s.folio && `, Folio: ${s.folio}`}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {vista === 'nuevo' && (
                    <div className={styles.panel}>
                        <h2 className={styles.panelTitulo}>Registrar nuevo feligrés</h2>
                        <form onSubmit={registrarFeligres} className={styles.formulario}>
                            <div className={styles.grid2}>
                                <div className={styles.campo}>
                                    <label className={styles.etiqueta}>Nombres</label>
                                    <input type="text" value={formFeligres.nombres}
                                        onChange={e => setFormFeligres({ ...formFeligres, nombres: e.target.value })}
                                        className={styles.input} required />
                                </div>
                                <div className={styles.campo}>
                                    <label className={styles.etiqueta}>Apellidos</label>
                                    <input type="text" value={formFeligres.apellidos}
                                        onChange={e => setFormFeligres({ ...formFeligres, apellidos: e.target.value })}
                                        className={styles.input} required />
                                </div>
                            </div>
                            <div className={styles.campo}>
                                <label className={styles.etiqueta}>Fecha de nacimiento</label>
                                <input type="date" value={formFeligres.fecha_nacimiento}
                                    onChange={e => setFormFeligres({ ...formFeligres, fecha_nacimiento: e.target.value })}
                                    className={styles.input} />
                            </div>
                            <div className={styles.checkboxFila}>
                                <input type="checkbox" checked={formFeligres.es_catecumeno}
                                    onChange={e => setFormFeligres({ ...formFeligres, es_catecumeno: e.target.checked })}
                                    id="catecumeno" />
                                <label htmlFor="catecumeno" className={styles.etiqueta}>Es catecúmeno</label>
                            </div>
                            <button type="submit" className={styles.botonPrimario} disabled={cargando}>
                                {cargando ? 'Registrando...' : 'Registrar Feligrés'}
                            </button>
                        </form>
                    </div>
                )}

                {vista === 'sacramento' && (
                    <div className={styles.panel}>
                        <h2 className={styles.panelTitulo}>Registrar Sacramento</h2>
                        {!feligresSeleccionado ? (
                            <p className={styles.textoGris}>
                                Primero busque y seleccione un feligrés en la pestaña Buscar
                            </p>
                        ) : (
                            <>
                                <div className={styles.feligresTag}>
                                    👤 {feligresSeleccionado.nombres} {feligresSeleccionado.apellidos}
                                </div>
                                <form onSubmit={registrarSacramento} className={styles.formulario}>
                                    <div className={styles.grid2}>
                                        <div className={styles.campo}>
                                            <label className={styles.etiqueta}>Tipo</label>
                                            <select value={formSacramento.tipo}
                                                onChange={e => setFormSacramento({ ...formSacramento, tipo: e.target.value })}
                                                className={styles.input}>
                                                <option value="bautismo">Bautismo</option>
                                                <option value="confirmacion">Confirmación</option>
                                                <option value="matrimonio">Matrimonio</option>
                                            </select>
                                        </div>
                                        <div className={styles.campo}>
                                            <label className={styles.etiqueta}>Fecha</label>
                                            <input type="date" value={formSacramento.fecha}
                                                onChange={e => setFormSacramento({ ...formSacramento, fecha: e.target.value })}
                                                className={styles.input} required />
                                        </div>
                                    </div>
                                    <div className={styles.grid3}>
                                        <div className={styles.campo}>
                                            <label className={styles.etiqueta}>Libro</label>
                                            <input type="text" value={formSacramento.libro}
                                                onChange={e => setFormSacramento({ ...formSacramento, libro: e.target.value })}
                                                className={styles.input} placeholder="Libro 5" />
                                        </div>
                                        <div className={styles.campo}>
                                            <label className={styles.etiqueta}>Folio</label>
                                            <input type="text" value={formSacramento.folio}
                                                onChange={e => setFormSacramento({ ...formSacramento, folio: e.target.value })}
                                                className={styles.input} placeholder="45" />
                                        </div>
                                        <div className={styles.campo}>
                                            <label className={styles.etiqueta}>Partida</label>
                                            <input type="text" value={formSacramento.partida}
                                                onChange={e => setFormSacramento({ ...formSacramento, partida: e.target.value })}
                                                className={styles.input} placeholder="120" />
                                        </div>
                                    </div>
                                    <div className={styles.campo}>
                                        <label className={styles.etiqueta}>Ministro</label>
                                        <input type="text" value={formSacramento.ministro}
                                            onChange={e => setFormSacramento({ ...formSacramento, ministro: e.target.value })}
                                            className={styles.input} />
                                    </div>
                                    <div className={styles.grid2}>
                                        <div className={styles.campo}>
                                            <label className={styles.etiqueta}>Padrino 1</label>
                                            <input type="text" value={formSacramento.padrino_1}
                                                onChange={e => setFormSacramento({ ...formSacramento, padrino_1: e.target.value })}
                                                className={styles.input} />
                                        </div>
                                        <div className={styles.campo}>
                                            <label className={styles.etiqueta}>Padrino 2</label>
                                            <input type="text" value={formSacramento.padrino_2}
                                                onChange={e => setFormSacramento({ ...formSacramento, padrino_2: e.target.value })}
                                                className={styles.input} />
                                        </div>
                                    </div>
                                    <button type="submit" className={styles.botonPrimario} disabled={cargando}>
                                        {cargando ? 'Registrando...' : 'Registrar Sacramento'}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}