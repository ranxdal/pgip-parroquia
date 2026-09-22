import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
        <div style={estilos.contenedor}>
            <div style={estilos.tarjeta}>
                <div style={estilos.encabezado}>
                    <h1 style={estilos.titulo}>PGIP</h1>
                    <p style={estilos.subtitulo}>
                        Parroquia San Agustín de Sumpango
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={estilos.formulario}>
                    <div style={estilos.campo}>
                        <label style={estilos.etiqueta}>Usuario</label>
                        <input
                            type="text"
                            name="usuario"
                            value={form.usuario}
                            onChange={handleChange}
                            style={estilos.input}
                            placeholder="Ingrese su usuario"
                            autoFocus
                            required
                        />
                    </div>

                    <div style={estilos.campo}>
                        <label style={estilos.etiqueta}>Contraseña</label>
                        <input
                            type="password"
                            name="contrasena"
                            value={form.contrasena}
                            onChange={handleChange}
                            style={estilos.input}
                            placeholder="Ingrese su contraseña"
                            required
                        />
                    </div>

                    {error && (
                        <div style={estilos.error}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        style={{
                            ...estilos.boton,
                            opacity: cargando ? 0.7 : 1
                        }}
                        disabled={cargando}
                    >
                        {cargando ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>
        </div>
    );
}

const estilos = {
    contenedor: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f4f8'
    },
    tarjeta: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.1)'
    },
    encabezado: {
        textAlign: 'center',
        marginBottom: '32px'
    },
    titulo: {
        fontSize: '2.5rem',
        fontWeight: 'bold',
        color: '#1a365d',
        margin: '0 0 8px 0'
    },
    subtitulo: {
        color: '#718096',
        fontSize: '0.9rem',
        margin: 0
    },
    formulario: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    },
    campo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
    },
    etiqueta: {
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#2d3748'
    },
    input: {
        padding: '10px 14px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '1rem',
        outline: 'none',
        transition: 'border-color 0.2s'
    },
    error: {
        backgroundColor: '#fff5f5',
        border: '1px solid #fc8181',
        color: '#c53030',
        padding: '10px 14px',
        borderRadius: '8px',
        fontSize: '0.875rem'
    },
    boton: {
        backgroundColor: '#1a365d',
        color: '#ffffff',
        padding: '12px',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    }
};