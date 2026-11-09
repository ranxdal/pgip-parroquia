import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import styles from './Perfil.module.css';

export default function Perfil() {
    const { usuario, setUsuario } = useAuth();

    // ── Datos del perfil ──────────────────────────────────
    const [formPerfil, setFormPerfil] = useState({
        nombre: '', apellido: ''
    });
    const [guardandoPerfil, setGuardandoPerfil] = useState(false);
    const [mensajePerfil, setMensajePerfil] = useState('');
    const [errorPerfil, setErrorPerfil] = useState('');

    // ── Foto de perfil ────────────────────────────────────
    const [fotoPreview, setFotoPreview] = useState(null);
    const [fotoArchivo, setFotoArchivo] = useState(null);
    const [subiendoFoto, setSubiendoFoto] = useState(false);
    const [mensajeFoto, setMensajeFoto] = useState('');
    const [errorFoto, setErrorFoto] = useState('');
    const fotoInputRef = useRef();

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
    const [modalReset, setModalReset] = useState(null);
    const [nuevaPassReset, setNuevaPassReset] = useState('');

    // Cargar datos actuales al montar
    useEffect(() => {
        if (usuario) {
            setFormPerfil({
                nombre: usuario.nombre || '',
                apellido: usuario.apellido || '',
            });
            setFotoPreview(usuario.foto_url || null);
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

    // ── Seleccionar foto (solo preview local) ─────────────
    const seleccionarFoto = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validar tamaño (2 MB)
        if (file.size > 2 * 1024 * 1024) {
            setErrorFoto('La imagen no puede superar 2 MB');
            return;
        }

        setFotoArchivo(file);
        setErrorFoto('');
        setMensajeFoto('');

        // Preview local inmediato
        const reader = new FileReader();
        reader.onload = (ev) => setFotoPreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    // ── Subir foto al servidor ────────────────────────────
    const subirFoto = async () => {
        if (!fotoArchivo) return;

        setSubiendoFoto(true);
        setErrorFoto('');
        setMensajeFoto('');

        try {
            const formData = new FormData();
            formData.append('foto', fotoArchivo);

            const { data } = await api.post('/auth/perfil/foto', formData);

            // Actualizar contexto global y localStorage
            const usuarioActualizado = { ...usuario, foto_url: data.usuario.foto_url };
            setUsuario(usuarioActualizado);
            localStorage.setItem('pgip_usuario', JSON.stringify(usuarioActualizado));
            setFotoPreview(data.usuario.foto_url);
            setFotoArchivo(null);
            setMensajeFoto('Foto actualizada correctamente');
        } catch (err) {
            setErrorFoto(err.response?.data?.error || 'Error al subir la foto');
            // Revertir preview al original
            setFotoPreview(usuario?.foto_url || null);
        } finally {
            setSubiendoFoto(false);
        }
    };

    // ── Guardar perfil (nombre y apellido) ────────────────
    const guardarPerfil = async (e) => {
        e.preventDefault();
        setGuardandoPerfil(true);
        setErrorPerfil('');
        setMensajePerfil('');
        try {
            const { data } = await api.put('/auth/perfil', formPerfil);
            setUsuario(prev => ({ ...prev, ...data.usuario }));
            setMensajePerfil('Perfil actualizado');
        } catch (err) {
            setErrorPerfil(err.response?.data?.error || 'Error al actualizar');
        } finally {
            setGuardandoPerfil(false);
        }
    };

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
                contrasena_nueva: formPass.contrasena_nueva
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
                {/* ── Hero encabezado ── */}
                <div className={styles.hero}>
                    <div className={styles.heroTexto}>
                        <div className={styles.heroTituloFila}>
                            <span className={styles.heroIcono}>👤</span>
                            <h1 className={styles.heroTitulo}>Mi Perfil</h1>
                        </div>
                        <p className={styles.heroSub}>Configuración de cuenta y gestión de usuarios · Parroquia San Agustín</p>
                    </div>
                </div>

                <div className={styles.grid}>

                    {/* ── Foto y datos ── */}
                    <div className={styles.panel}>
                        <h2 className={styles.panelTitulo}>Información personal</h2>

                        <div className={styles.fotoSeccion}>
                            <div className={styles.fotoContenedor}>
                                {fotoPreview ? (
                                    <img src={fotoPreview} alt="Foto de perfil"
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

                        {/* ── Sección foto de perfil ── */}
                        <div className={styles.fotoUploadSeccion}>
                            <label className={styles.etiqueta}>Foto de perfil</label>

                            {mensajeFoto && (
                                <div className={styles.exito} onClick={() => setMensajeFoto('')}>
                                    ✅ {mensajeFoto}
                                </div>
                            )}
                            {errorFoto && (
                                <div className={styles.errorDiv} onClick={() => setErrorFoto('')}>
                                    ❌ {errorFoto}
                                </div>
                            )}

                            <div className={styles.fotoUploadFila}>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    ref={fotoInputRef}
                                    onChange={seleccionarFoto}
                                    style={{ display: 'none' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => fotoInputRef.current.click()}
                                    className={styles.botonSecundario}
                                >
                                    🖼️ Elegir imagen
                                </button>
                                {fotoArchivo && (
                                    <>
                                        <span className={styles.nombreArchivo}>
                                            {fotoArchivo.name}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={subirFoto}
                                            className={styles.botonPrimario}
                                            disabled={subiendoFoto}
                                            style={{ width: 'auto' }}
                                        >
                                            {subiendoFoto ? 'Subiendo...' : '⬆️ Subir foto'}
                                        </button>
                                    </>
                                )}
                            </div>
                            <p className={styles.ayuda}>
                                Formatos: JPG, PNG, WebP o GIF · Máximo 2 MB
                            </p>
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
                                                                onError={e => e.target.style.display = 'none'} />
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