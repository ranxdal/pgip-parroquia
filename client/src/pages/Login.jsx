import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Login.module.css';

export default function Login() {
    const [form, setForm] = useState({ usuario: '', contrasena: '' });
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setCargando(true);
        try {
            const usuario = await login(form.usuario, form.contrasena);
            navigate('/hub');
        } catch (err) {
            setError(err.response?.data?.error || 'Usuario o contraseña incorrectos');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className={styles.pagina}>
            {/* Panel izquierdo — imagen */}
            <div className={styles.panelImagen}>
                <div className={styles.imagenOverlay} />
                <div className={styles.imagenContenido}>
                    <div className={styles.cruzdeco}>✝</div>
                    <h2 className={styles.nombreParroquia}>
                        Parroquia<br />San Agustín
                    </h2>
                    <p className={styles.lugarParroquia}>Sumpango, Sacatepéquez</p>
                    <div className={styles.lineadeco} />
                    <p className={styles.lemaParroquia}>
                        Gestión Integral<br />Parroquial
                    </p>
                </div>
            </div>

            {/* Panel derecho — formulario */}
            <div className={styles.panelForm}>
                <div className={styles.formContenido}>
                    <div className={styles.logoBloque}>
                        <span className={styles.logoAcronimo}>PGIP</span>
                        <span className={styles.logoLinea} />
                        <span className={styles.logoDesc}>Sistema de Gestión</span>
                    </div>

                    <h1 className={styles.formTitulo}>Iniciar sesión</h1>
                    <p className={styles.formSubtitulo}>Acceso exclusivo para personal autorizado</p>

                    <form onSubmit={handleSubmit} className={styles.formulario}>
                        <div className={styles.campo}>
                            <label className={styles.etiqueta} htmlFor="usuario">
                                Usuario
                            </label>
                            <input
                                id="usuario"
                                type="text"
                                name="usuario"
                                value={form.usuario}
                                onChange={handleChange}
                                className={styles.input}
                                placeholder="Ingrese su usuario"
                                autoComplete="username"
                                autoFocus
                                required
                            />
                        </div>

                        <div className={styles.campo}>
                            <label className={styles.etiqueta} htmlFor="contrasena">
                                Contraseña
                            </label>
                            <input
                                id="contrasena"
                                type="password"
                                name="contrasena"
                                value={form.contrasena}
                                onChange={handleChange}
                                className={styles.input}
                                placeholder="Ingrese su contraseña"
                                autoComplete="current-password"
                                required
                            />
                        </div>

                        {error && (
                            <div className={styles.error} role="alert">{error}</div>
                        )}

                        <button
                            type="submit"
                            className={styles.boton}
                            disabled={cargando}
                        >
                            {cargando ? (
                                <span className={styles.botonCargando}>
                                    <span className={styles.spinner} />
                                    Verificando...
                                </span>
                            ) : 'Entrar'}
                        </button>
                    </form>

                    <p className={styles.pie}>
                        Parroquia San Agustín de Sumpango &mdash; {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        </div>
    );
}