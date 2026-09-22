import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Sacramentos() {
    const { usuario, logout } = useAuth();
    const navigate = useNavigate();
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
            const { data } = await api.get(
                `/sacramentos/feligres/buscar?termino=${busqueda}`
            );
            setResultados(data.resultados);
        } catch (err) {
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
            setFormFeligres({
                nombres: '', apellidos: '',
                fecha_nacimiento: '', es_catecumeno: false
            });
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

    const handleLogout = () => { logout(); navigate('/login'); };

    const tipoColor = {
        bautismo: '#ebf8ff',
        confirmacion: '#faf5ff',
        matrimonio: '#fff5f0'
    };

    return (
        <div style={estilos.contenedor}>
            <nav style={estilos.navbar}>
                <div style={estilos.navLogo}>
                    <strong>PGIP</strong>
                    <span style={estilos.navSub}>Parroquia San Agustín</span>
                </div>
                <div style={estilos.navLinks}>
                    {usuario?.rol === 'admin' && (
                        <button onClick={() => navigate('/dashboard')}
                            style={estilos.navBtn}>Dashboard</button>
                    )}
                    <button onClick={() => navigate('/tesoreria')}
                        style={estilos.navBtn}>Tesorería</button>
                    <button onClick={() => navigate('/archivo')}
                        style={estilos.navBtn}>Archivo</button>
                    <span style={estilos.navUsuario}>
                        {usuario?.nombre} ({usuario?.rol})
                    </span>
                    <button onClick={handleLogout}
                        style={estilos.navBtnRojo}>Cerrar Sesión</button>
                </div>
            </nav>

            <div style={estilos.contenido}>
                <div style={estilos.encabezado}>
                    <h1 style={estilos.titulo}>Registro de Sacramentos</h1>
                    <div style={estilos.tabs}>
                        {['buscar', 'nuevo', 'sacramento'].map(t => (
                            <button key={t} onClick={() => setVista(t)}
                                style={{
                                    ...estilos.tab,
                                    borderBottom: vista === t
                                        ? '2px solid #1a365d' : '2px solid transparent',
                                    color: vista === t ? '#1a365d' : '#718096'
                                }}>
                                {t === 'buscar' ? 'Buscar Feligrés' :
                                    t === 'nuevo' ? 'Nuevo Feligrés' :
                                        'Registrar Sacramento'}
                            </button>
                        ))}
                    </div>
                </div>

                {mensaje && (
                    <div style={estilos.exito} onClick={() => setMensaje('')}>
                        ✅ {mensaje}
                    </div>
                )}
                {error && (
                    <div style={estilos.errorDiv} onClick={() => setError('')}>
                        ❌ {error}
                    </div>
                )}

                {/* Vista: Buscar */}
                {vista === 'buscar' && (
                    <div style={estilos.panel}>
                        <h2 style={estilos.panelTitulo}>Búsqueda por nombre</h2>
                        <div style={estilos.busquedaFila}>
                            <input
                                type="text"
                                value={busqueda}
                                onChange={e => setBusqueda(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && buscarFeligres()}
                                style={{ ...estilos.input, flex: 1 }}
                                placeholder="Escriba el nombre o apellido..."
                            />
                            <button onClick={buscarFeligres}
                                style={estilos.botonPrimario}
                                disabled={cargando}>
                                {cargando ? 'Buscando...' : 'Buscar'}
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
                                            <p style={estilos.textoGris}>
                                                Estado: {f.estado} —
                                                Similitud: {(f.similitud * 100).toFixed(0)}%
                                            </p>
                                        </div>
                                        <span style={estilos.verBtn}>Ver →</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Vista: Detalle del feligrés */}
                {vista === 'detalle' && feligresSeleccionado && (
                    <div>
                        <div style={estilos.panel}>
                            <h2 style={estilos.panelTitulo}>
                                {feligresSeleccionado.nombres} {feligresSeleccionado.apellidos}
                            </h2>
                            <p style={estilos.textoGris}>
                                Estado: {feligresSeleccionado.estado}
                                {feligresSeleccionado.fecha_nacimiento &&
                                    ` — Fecha de nacimiento: ${new Date(feligresSeleccionado.fecha_nacimiento).toLocaleDateString('es-GT')}`}
                            </p>
                        </div>

                        <div style={estilos.panel}>
                            <h2 style={estilos.panelTitulo}>Sacramentos registrados</h2>
                            {sacramentos.length === 0 ? (
                                <p style={estilos.textoGris}>
                                    No hay sacramentos registrados
                                </p>
                            ) : (
                                sacramentos.map(s => (
                                    <div key={s.id} style={{
                                        ...estilos.sacramentoItem,
                                        backgroundColor: tipoColor[s.tipo]
                                    }}>
                                        <strong style={{ textTransform: 'capitalize' }}>
                                            {s.tipo}
                                        </strong>
                                        <p style={estilos.textoGris}>
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

                {/* Vista: Nuevo feligrés */}
                {vista === 'nuevo' && (
                    <div style={estilos.panel}>
                        <h2 style={estilos.panelTitulo}>Registrar nuevo feligrés</h2>
                        <form onSubmit={registrarFeligres} style={estilos.formulario}>
                            <div style={estilos.grid2}>
                                <div style={estilos.campo}>
                                    <label style={estilos.etiqueta}>Nombres</label>
                                    <input
                                        type="text"
                                        value={formFeligres.nombres}
                                        onChange={e => setFormFeligres({
                                            ...formFeligres, nombres: e.target.value
                                        })}
                                        style={estilos.input}
                                        required
                                    />
                                </div>
                                <div style={estilos.campo}>
                                    <label style={estilos.etiqueta}>Apellidos</label>
                                    <input
                                        type="text"
                                        value={formFeligres.apellidos}
                                        onChange={e => setFormFeligres({
                                            ...formFeligres, apellidos: e.target.value
                                        })}
                                        style={estilos.input}
                                        required
                                    />
                                </div>
                            </div>
                            <div style={estilos.campo}>
                                <label style={estilos.etiqueta}>
                                    Fecha de nacimiento
                                </label>
                                <input
                                    type="date"
                                    value={formFeligres.fecha_nacimiento}
                                    onChange={e => setFormFeligres({
                                        ...formFeligres,
                                        fecha_nacimiento: e.target.value
                                    })}
                                    style={estilos.input}
                                />
                            </div>
                            <div style={estilos.checkboxFila}>
                                <input
                                    type="checkbox"
                                    checked={formFeligres.es_catecumeno}
                                    onChange={e => setFormFeligres({
                                        ...formFeligres,
                                        es_catecumeno: e.target.checked
                                    })}
                                    id="catecumeno"
                                />
                                <label htmlFor="catecumeno" style={estilos.etiqueta}>
                                    Es catecúmeno
                                </label>
                            </div>
                            <button type="submit" style={estilos.botonPrimario}
                                disabled={cargando}>
                                {cargando ? 'Registrando...' : 'Registrar Feligrés'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Vista: Registrar sacramento */}
                {vista === 'sacramento' && (
                    <div style={estilos.panel}>
                        <h2 style={estilos.panelTitulo}>Registrar Sacramento</h2>
                        {!feligresSeleccionado ? (
                            <p style={estilos.textoGris}>
                                Primero busque y seleccione un feligrés
                            </p>
                        ) : (
                            <>
                                <div style={estilos.feligresTag}>
                                    👤 {feligresSeleccionado.nombres} {feligresSeleccionado.apellidos}
                                </div>
                                <form onSubmit={registrarSacramento}
                                    style={estilos.formulario}>
                                    <div style={estilos.grid2}>
                                        <div style={estilos.campo}>
                                            <label style={estilos.etiqueta}>
                                                Tipo de sacramento
                                            </label>
                                            <select
                                                value={formSacramento.tipo}
                                                onChange={e => setFormSacramento({
                                                    ...formSacramento,
                                                    tipo: e.target.value
                                                })}
                                                style={estilos.input}>
                                                <option value="bautismo">Bautismo</option>
                                                <option value="confirmacion">
                                                    Confirmación
                                                </option>
                                                <option value="matrimonio">Matrimonio</option>
                                            </select>
                                        </div>
                                        <div style={estilos.campo}>
                                            <label style={estilos.etiqueta}>
                                                Fecha del sacramento
                                            </label>
                                            <input type="date"
                                                value={formSacramento.fecha}
                                                onChange={e => setFormSacramento({
                                                    ...formSacramento,
                                                    fecha: e.target.value
                                                })}
                                                style={estilos.input}
                                                required />
                                        </div>
                                    </div>
                                    <div style={estilos.grid3}>
                                        <div style={estilos.campo}>
                                            <label style={estilos.etiqueta}>Libro</label>
                                            <input type="text"
                                                value={formSacramento.libro}
                                                onChange={e => setFormSacramento({
                                                    ...formSacramento,
                                                    libro: e.target.value
                                                })}
                                                style={estilos.input}
                                                placeholder="Libro 5" />
                                        </div>
                                        <div style={estilos.campo}>
                                            <label style={estilos.etiqueta}>Folio</label>
                                            <input type="text"
                                                value={formSacramento.folio}
                                                onChange={e => setFormSacramento({
                                                    ...formSacramento,
                                                    folio: e.target.value
                                                })}
                                                style={estilos.input}
                                                placeholder="45" />
                                        </div>
                                        <div style={estilos.campo}>
                                            <label style={estilos.etiqueta}>Partida</label>
                                            <input type="text"
                                                value={formSacramento.partida}
                                                onChange={e => setFormSacramento({
                                                    ...formSacramento,
                                                    partida: e.target.value
                                                })}
                                                style={estilos.input}
                                                placeholder="120" />
                                        </div>
                                    </div>
                                    <div style={estilos.campo}>
                                        <label style={estilos.etiqueta}>Ministro</label>
                                        <input type="text"
                                            value={formSacramento.ministro}
                                            onChange={e => setFormSacramento({
                                                ...formSacramento,
                                                ministro: e.target.value
                                            })}
                                            style={estilos.input}
                                            placeholder="Nombre del sacerdote" />
                                    </div>
                                    <div style={estilos.grid2}>
                                        <div style={estilos.campo}>
                                            <label style={estilos.etiqueta}>Padrino 1</label>
                                            <input type="text"
                                                value={formSacramento.padrino_1}
                                                onChange={e => setFormSacramento({
                                                    ...formSacramento,
                                                    padrino_1: e.target.value
                                                })}
                                                style={estilos.input} />
                                        </div>
                                        <div style={estilos.campo}>
                                            <label style={estilos.etiqueta}>Padrino 2</label>
                                            <input type="text"
                                                value={formSacramento.padrino_2}
                                                onChange={e => setFormSacramento({
                                                    ...formSacramento,
                                                    padrino_2: e.target.value
                                                })}
                                                style={estilos.input} />
                                        </div>
                                    </div>
                                    <button type="submit" style={estilos.botonPrimario}
                                        disabled={cargando}>
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

const estilos = {
    contenedor: { minHeight: '100vh', backgroundColor: '#f0f4f8' },
    navbar: {
        backgroundColor: '#1a365d', color: '#fff',
        padding: '0 24px', height: '60px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between'
    },
    navLogo: { display: 'flex', flexDirection: 'column' },
    navSub: { fontSize: '0.7rem', color: '#a0aec0' },
    navLinks: { display: 'flex', alignItems: 'center', gap: '12px' },
    navBtn: {
        backgroundColor: 'transparent', color: '#fff',
        border: '1px solid #4a6fa5', padding: '6px 12px',
        borderRadius: '6px', fontSize: '0.875rem'
    },
    navBtnRojo: {
        backgroundColor: '#c53030', color: '#fff',
        border: 'none', padding: '6px 12px',
        borderRadius: '6px', fontSize: '0.875rem'
    },
    navUsuario: { fontSize: '0.875rem', color: '#a0aec0' },
    contenido: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
    encabezado: { marginBottom: '24px' },
    titulo: { fontSize: '1.5rem', color: '#1a365d', marginBottom: '16px' },
    tabs: { display: 'flex', gap: '4px', borderBottom: '1px solid #e2e8f0' },
    tab: {
        padding: '10px 16px', background: 'none',
        border: 'none', cursor: 'pointer',
        fontSize: '0.875rem', fontWeight: '600'
    },
    panel: {
        backgroundColor: '#fff', padding: '24px',
        borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '16px'
    },
    panelTitulo: { fontSize: '1rem', color: '#2d3748', marginBottom: '16px' },
    busquedaFila: { display: 'flex', gap: '12px' },
    formulario: { display: 'flex', flexDirection: 'column', gap: '16px' },
    campo: { display: 'flex', flexDirection: 'column', gap: '6px' },
    etiqueta: { fontSize: '0.875rem', fontWeight: '600', color: '#2d3748' },
    input: {
        padding: '10px 14px', border: '1px solid #e2e8f0',
        borderRadius: '8px', fontSize: '1rem'
    },
    botonPrimario: {
        backgroundColor: '#1a365d', color: '#fff',
        padding: '12px', border: 'none',
        borderRadius: '8px', fontSize: '1rem',
        fontWeight: '600', cursor: 'pointer'
    },
    exito: {
        backgroundColor: '#f0fff4', border: '1px solid #68d391',
        color: '#2f855a', padding: '12px 16px',
        borderRadius: '8px', marginBottom: '16px', cursor: 'pointer'
    },
    errorDiv: {
        backgroundColor: '#fff5f5', border: '1px solid #fc8181',
        color: '#c53030', padding: '12px 16px',
        borderRadius: '8px', marginBottom: '16px', cursor: 'pointer'
    },
    textoGris: { color: '#718096', fontSize: '0.875rem' },
    resultadoItem: {
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '12px 16px',
        border: '1px solid #e2e8f0', borderRadius: '8px',
        marginBottom: '8px', cursor: 'pointer',
        transition: 'background 0.2s'
    },
    verBtn: { color: '#1a365d', fontWeight: '600' },
    sacramentoItem: {
        padding: '12px 16px', borderRadius: '8px',
        marginBottom: '8px'
    },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
    grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' },
    checkboxFila: { display: 'flex', alignItems: 'center', gap: '8px' },
    feligresTag: {
        backgroundColor: '#ebf8ff', color: '#2b6cb0',
        padding: '8px 16px', borderRadius: '8px',
        marginBottom: '16px', fontSize: '0.875rem',
        fontWeight: '600'
    }
};