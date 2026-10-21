import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import styles from './Perfil.module.css';

export default function Perfil() {
    const { usuario, setUsuario } = useAuth();

    // ── Datos del perfil ──────────────────────────────────
    const [formPerfil, setFormPerfil] = useState({
        nombre: '', apellido: '', foto_url: ''
    });
    const [guardandoPerfil, setGuardandoPerfil] = useState(false);
    const [mensajePerfil, setMensajePerfil] = useState('');
    const [errorPerfil, setErrorPerfil] = useState('');

    // ── Contraseña ────────────────────────────────────────
    const [formPass, setFormPass] = useState({
        contrasena_actual: '', contrasena_nueva: '', confirmar: ''
    });
    const [guardandoPass, setGuardandoPass] = useState(false);
    const [mensajePass, setMensajePass] = useState('');
    const [errorPass, setErrorPass] = useState('');
    const [mostrarPass, setMostrarPass] = useState(false);

    // ── Gestión de usuarios (solo admin) ──────────────────
    const [usuarios, setUsuarios] = useState([]);
    const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
    const [formNuevo, setFormNuevo] = useState({
        nombre: '', apellido: '', usuario: '', contrasena: ''
    });
    const [creando, setCreando] = useState(false);
    const [mensajeAdmin, setMensajeAdmin] = useState('');
    const [errorAdmin, setErrorAdmin] = useState('');
    const [modalReset, setModalReset] = useState(null); // { id, nombre }
    const [nuevaPassReset, setNuevaPassReset] = useState('');

    const fotoInputRef = useRef();

    // Cargar datos actuales al montar
    useEffect(() => {
        if (usuario) {
            setFormPerfil({
                nombre:   usuario.nombre   || '',
                apellido: usuario.apellido || '',
                foto_url: usuario.foto_url || ''
            });
        }
        if (usuario?.rol === 'admin') cargarUsuarios();
    }, []);

    const cargarUsuarios = async () => {
        setCargandoUsuarios(true);
        try {
            const { data } = await api.get('/auth/usuarios');
            setUsuarios(data.usuarios);
        } catch {
            setErrorAdmin('Error al cargar usuarios');
        } finally {
            setCargandoUsuarios(false);
        }
    };

    // ── Guardar perfil ────────────────────────────────────
    const guardarPerfil = async (e) => {
        e.preventDefault();
        setGuardandoPerfil(true);
        setErrorPerfil('');
        setMensajePerfil('');
        try {
            const { data } = await api.put('/auth/perfil', formPerfil);
            // Actualizar contexto global para que Navbar refleje el cambio
            setUsuario(prev => ({ ...prev, ...data.usuario }));
            setMensajePerfil('Perfil actualizado');
        } catch (err) {
            setErrorPerfil(err.response?.data?.error || 'Error al actualizar');
        } finally {
            setGuardandoPerfil(false);
        }
    };

    // ── Foto por URL ──────────────────────────────────────
    const previewFoto = formPerfil.foto_url || usuario?.foto_url;

    // ── Cambiar contraseña ────────────────────────────────
    const cambiarContrasena = async (e) => {
        e.preventDefault();
        setErrorPass('');
        setMensajePass('');
        if (formPass.contrasena_nueva !== formPass.confirmar) {
            return setErrorPass('Las contraseñas nuevas no coinciden');
        }
        if (formPass.contrasena_nueva.length < 6) {
            return setErrorPass('La contraseña debe tener al menos 6 caracteres');
        }
        setGuardandoPass(true);
        try {
            await api.post('/auth/perfil/contrasena', {
                contrasena_actual: formPass.contrasena_actual,
                contrasena_nueva:  formPass.contrasena_nueva
            });
            setMensajePass('Contraseña actualizada exitosamente');
            setFormPass({ contrasena_actual: '', contrasena_nueva: '', confirmar: '' });
        } catch (err) {
            setErrorPass(err.response?.data?.error || 'Error al cambiar contraseña');
        } finally {
            setGuardandoPass(false);
        }
    };

    // ── Crear operador ────────────────────────────────────
    const crearOperador = async (e) => {
        e.preventDefault();
        setErrorAdmin('');
        setMensajeAdmin('');
        setCreando(true);
        try {
            await api.post('/auth/usuarios', formNuevo);
            setMensajeAdmin(`Operador "${formNuevo.usuario}" creado exitosamente`);
            setFormNuevo({ nombre: '', apellido: '', usuario: '', contrasena: '' });
            cargarUsuarios();
        } catch (err) {
            setErrorAdmin(err.response?.data?.error || 'Error al crear operador');
        } finally {
            setCreando(false);
        }
    };

    // ── Activar / desactivar ──────────────────────────────
    const toggleActivo = async (id) => {
        try {
            const { data } = await api.patch(`/auth/usuarios/${id}/activo`);
            setUsuarios(prev => prev.map(u =>
                u.id === id ? { ...u, activo: data.usuario.activo } : u
            ));
        } catch (err) {
            setErrorAdmin(err.response?.data?.error || 'Error al cambiar estado');
        }
    };

    // ── Resetear contraseña ───────────────────────────────
    const confirmarReset = async () => {
        if (!nuevaPassReset || nuevaPassReset.length < 6) {
            return setErrorAdmin('La contraseña debe tener al menos 6 caracteres');
        }
        try {
            await api.post(`/auth/usuarios/${modalReset.id}/reset`, {
                contrasena_nueva: nuevaPassReset
            });
            setMensajeAdmin(`Contraseña de "${modalReset.nombre}" reseteada`);
            setModalReset(null);
            setNuevaPassReset('');
        } catch (err) {
            setErrorAdmin(err.response?.data?.error || 'Error al resetear contraseña');
        }
    };

    const rolLabel = { admin: '👑 Párroco / Admin', operador: '👤 Secretaria / Operador' };

    return (
        <div className={styles.contenedor}>
            <Navbar />
            <div className={styles.contenido}>
                <h1 className={styles.titulo}>Mi Perfil</h1>

                <div className={styles.grid}>

                    {/* ── Foto y datos ── */}
                    <div className={styles.panel}>
                        <h2 className={styles.panelTitulo}>Información personal</h2>

                        <div className={styles.fotoSeccion}>
                            <div className={styles.fotoContenedor}>
                                {previewFoto ? (
                                    <img src={previewFoto} alt="Foto de perfil"
                                        className={styles.fotoImg}
                                        onError={e => { e.target.style.display = 'none'; }} />
                                ) : (
                                    <div className={styles.fotoPlaceholder}>
                                        {(formPerfil.nombre?.[0] || '?').toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className={styles.nombreGrande}>
                                    {formPerfil.nombre} {formPerfil.apellido}
                                </p>
                                <p className={styles.rolBadge}>
                                    {rolLabel[usuario?.rol] || usuario?.rol}
                                </p>
                                <p className={styles.textoGris}>@{usuario?.usuario}</p>
                            </div>
                        </div>

                        {mensajePerfil && (
                            <div className={styles.exito} onClick={() => setMensajePerfil('')}>
                                ✅ {mensajePerfil}
                            </div>
                        )}
                        {errorPerfil && (
                            <div className={styles.errorDiv} onClick={() => setErrorPerfil('')}>
                                ❌ {errorPerfil}
                            </div>
                        )}

                        <form onSubmit={guardarPerfil} className={styles.formulario}>
                            <div className={styles.grid2}>
                                <div className={styles.campo}>
                                    <label className={styles.etiqueta}>Nombre</label>
                                    <input type="text" value={formPerfil.nombre}
                                        onChange={e => setFormPerfil({ ...formPerfil, nombre: e.target.value })}
                                        className={styles.input} required />
                                </div>
                                <div className={styles.campo}>
                                    <label className={styles.etiqueta}>Apellido</label>
                                    <input type="text" value={formPerfil.apellido}
                                        onChange={e => setFormPerfil({ ...formPerfil, apellido: e.target.value })}
                                        className={styles.input} required />
                                </div>
                            </div>
                            <div className={styles.campo}>
                                <label className={styles.etiqueta}>URL de foto de perfil</label>
                                <input type="url" value={formPerfil.foto_url}
                                    onChange={e => setFormPerfil({ ...formPerfil, foto_url: e.target.value })}
                                    className={styles.input}
                                    placeholder="https://..." />
                                <p className={styles.ayuda}>
                                    Pega el enlace de una imagen (Google Drive, Dropbox, etc.)
                                </p>
                            </div>
                            <button type="submit" className={styles.botonPrimario}
                                disabled={guardandoPerfil}>
                                {guardandoPerfil ? 'Guardando...' : '💾 Guardar cambios'}
                            </button>
                        </form>
                    </div>

                    {/* ── Cambiar contraseña ── */}
                    <div className={styles.panel}>
                        <h2 className={styles.panelTitulo}>Cambiar contraseña</h2>

                        {mensajePass && (
                            <div className={styles.exito} onClick={() => setMensajePass('')}>
                                ✅ {mensajePass}
                            </div>
                        )}
                        {errorPass && (
                            <div className={styles.errorDiv} onClick={() => setErrorPass('')}>
                                ❌ {errorPass}
                            </div>
                        )}

                        <form onSubmit={cambiarContrasena} className={styles.formulario}>
                            <div className={styles.campo}>
                                <label className={styles.etiqueta}>Contraseña actual</label>
                                <input type={mostrarPass ? 'text' : 'password'}
                                    value={formPass.contrasena_actual}
                                    onChange={e => setFormPass({ ...formPass, contrasena_actual: e.target.value })}
                                    className={styles.input} required />
                            </div>
                            <div className={styles.campo}>
                                <label className={styles.etiqueta}>Nueva contraseña</label>
                                <input type={mostrarPass ? 'text' : 'password'}
                                    value={formPass.contrasena_nueva}
                                    onChange={e => setFormPass({ ...formPass, contrasena_nueva: e.target.value })}
                                    className={styles.input} required minLength={6} />
                            </div>
                            <div className={styles.campo}>
                                <label className={styles.etiqueta}>Confirmar nueva contraseña</label>
                                <input type={mostrarPass ? 'text' : 'password'}
                                    value={formPass.confirmar}
                                    onChange={e => setFormPass({ ...formPass, confirmar: e.target.value })}
                                    className={styles.input} required />
                            </div>
                            <label className={styles.checkFila}>
                                <input type="checkbox" checked={mostrarPass}
                                    onChange={e => setMostrarPass(e.target.checked)} />
                                Mostrar contraseñas
                            </label>
                            <button type="submit" className={styles.botonPrimario}
                                disabled={guardandoPass}>
                                {guardandoPass ? 'Actualizando...' : '🔒 Cambiar contraseña'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* ── Gestión de usuarios (solo admin) ── */}
                {usuario?.rol === 'admin' && (
                    <div className={styles.panel} style={{ marginTop: '24px' }}>
                        <h2 className={styles.panelTitulo}>Gestión de operadores</h2>
                        <p className={styles.textoGris}>
                            Cree cuentas para las secretarias de la oficina parroquial.
                        </p>

                        {mensajeAdmin && (
                            <div className={styles.exito} onClick={() => setMensajeAdmin('')}>
                                ✅ {mensajeAdmin}
                            </div>
                        )}
                        {errorAdmin && (
                            <div className={styles.errorDiv} onClick={() => setErrorAdmin('')}>
                                ❌ {errorAdmin}
                            </div>
                        )}

                        {/* Formulario nuevo operador */}
                        <details className={styles.detalle}>
                            <summary className={styles.detalleSummary}>
                                ➕ Crear nueva cuenta de operador
                            </summary>
                            <form onSubmit={crearOperador} className={styles.formulario}
                                style={{ marginTop: '16px' }}>
                                <div className={styles.grid2}>
                                    <div className={styles.campo}>
                                        <label className={styles.etiqueta}>Nombre</label>
                                        <input type="text" value={formNuevo.nombre}
                                            onChange={e => setFormNuevo({ ...formNuevo, nombre: e.target.value })}
                                            className={styles.input} required />
                                    </div>
                                    <div className={styles.campo}>
                                        <label className={styles.etiqueta}>Apellido</label>
                                        <input type="text" value={formNuevo.apellido}
                                            onChange={e => setFormNuevo({ ...formNuevo, apellido: e.target.value })}
                                            className={styles.input} required />
                                    </div>
                                </div>
                                <div className={styles.grid2}>
                                    <div className={styles.campo}>
                                        <label className={styles.etiqueta}>Usuario (login)</label>
                                        <input type="text" value={formNuevo.usuario}
                                            onChange={e => setFormNuevo({ ...formNuevo, usuario: e.target.value })}
                                            className={styles.input} required />
                                    </div>
                                    <div className={styles.campo}>
                                        <label className={styles.etiqueta}>Contraseña inicial</label>
                                        <input type="text" value={formNuevo.contrasena}
                                            onChange={e => setFormNuevo({ ...formNuevo, contrasena: e.target.value })}
                                            className={styles.input} required minLength={6} />
                                    </div>
                                </div>
                                <button type="submit" className={styles.botonPrimario}
                                    disabled={creando} style={{ width: 'auto' }}>
                                    {creando ? 'Creando...' : '✅ Crear operador'}
                                </button>
                            </form>
                        </details>

                        {/* Lista de usuarios */}
                        {cargandoUsuarios ? (
                            <p className={styles.textoGris}>Cargando usuarios...</p>
                        ) : (
                            <div className={styles.tablaContenedor}>
                                <table className={styles.tabla}>
                                    <thead>
                                        <tr>
                                            <th className={styles.th}>Usuario</th>
                                            <th className={styles.th}>Nombre</th>
                                            <th className={styles.th}>Rol</th>
                                            <th className={styles.th}>Estado</th>
                                            <th className={styles.th}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usuarios.map(u => (
                                            <tr key={u.id}
                                                className={!u.activo ? styles.filaInactiva : ''}>
                                                <td className={styles.td}>
                                                    <div className={styles.usuarioFila}>
                                                        {u.foto_url ? (
                                                            <img src={u.foto_url}
                                                                className={styles.miniAvatar}
                                                                onError={e => e.target.style.display='none'} />
                                                        ) : (
                                                            <div className={styles.miniAvatarPlaceholder}>
                                                                {(u.nombre?.[0] || '?').toUpperCase()}
                                                            </div>
                                                        )}
                                                        @{u.usuario}
                                                    </div>
                                                </td>
                                                <td className={styles.td}>
                                                    {u.nombre} {u.apellido}
                                                </td>
                                                <td className={styles.td}>
                                                    <span className={u.rol === 'admin' ? styles.badgeAdmin : styles.badgeOp}>
                                                        {u.rol === 'admin' ? 'Admin' : 'Operador'}
                                                    </span>
                                                </td>
                                                <td className={styles.td}>
                                                    <span className={u.activo ? styles.badgeActivo : styles.badgeInactivo}>
                                                        {u.activo ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>
                                                <td className={styles.td}>
                                                    {u.rol !== 'admin' && (
                                                        <div className={styles.accionesFila}>
                                                            <button
                                                                onClick={() => toggleActivo(u.id)}
                                                                className={u.activo ? styles.botonDesactivar : styles.botonActivar}>
                                                                {u.activo ? 'Desactivar' : 'Activar'}
                                                            </button>
                                                            <button
                                                                onClick={() => { setModalReset({ id: u.id, nombre: u.usuario }); setNuevaPassReset(''); }}
                                                                className={styles.botonReset}>
                                                                🔑 Reset
                                                            </button>
                                                        </div>
                                                    )}
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

            {/* ── Modal reset contraseña ── */}
            {modalReset && (
                <div className={styles.modalOverlay} onClick={() => setModalReset(null)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.modalTitulo}>
                            Resetear contraseña de @{modalReset.nombre}
                        </h3>
                        <div className={styles.campo}>
                            <label className={styles.etiqueta}>Nueva contraseña</label>
                            <input type="text" value={nuevaPassReset}
                                onChange={e => setNuevaPassReset(e.target.value)}
                                className={styles.input}
                                placeholder="Mínimo 6 caracteres"
                                autoFocus />
                        </div>
                        <div className={styles.modalAcciones}>
                            <button onClick={() => setModalReset(null)}
                                className={styles.botonCancelar}>Cancelar</button>
                            <button onClick={confirmarReset}
                                className={styles.botonPrimario}
                                style={{ width: 'auto' }}>
                                🔑 Confirmar reset
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}