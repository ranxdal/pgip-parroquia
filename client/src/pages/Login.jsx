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
            if (usuario.rol === 'admin') {
                navigate('/dashboard');
            } else {
                navigate('/tesoreria');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Error al iniciar sesión');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className={styles.contenedor}>
            <div className={styles.tarjeta}>
                <div className={styles.encabezado}>
                    <h1 className={styles.titulo}>PGIP</h1>
                    <p className={styles.subtitulo}>
                        Parroquia San Agustín de Sumpango
                    </p>
                </div>

                <form onSubmit={handleSubmit} className={styles.formulario}>
                    <div className={styles.campo}>
                        <label className={styles.etiqueta}>Usuario</label>
                        <input
                            type="text"
                            name="usuario"
                            value={form.usuario}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="Ingrese su usuario"
                            autoFocus
                            required
                        />
                    </div>

                    <div className={styles.campo}>
                        <label className={styles.etiqueta}>Contraseña</label>
                        <input
                            type="password"
                            name="contrasena"
                            value={form.contrasena}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="Ingrese su contraseña"
                            required
                        />
                    </div>

                    {error && (
                        <div className={styles.error}>{error}</div>
                    )}

                    <button
                        type="submit"
                        className={styles.boton}
                        disabled={cargando}
                    >
                        {cargando ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>
        </div>
    );
}