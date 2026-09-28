import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
    const { usuario, logout } = useAuth();
    const navigate = useNavigate();
    const [menuAbierto, setMenuAbierto] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navegar = (ruta) => {
        navigate(ruta);
        setMenuAbierto(false);
    };

    return (
        <nav style={estilos.navbar}>
            <div style={estilos.navContenido}>
                {/* Logo */}
                <div style={estilos.navLogo}>
                    <strong>PGIP</strong>
                    <span style={estilos.navSub}>Parroquia San Agustín</span>
                </div>

                {/* Menú desktop */}
                <div style={estilos.navLinksDesktop}>
                    {usuario?.rol === 'admin' && (
                        <button onClick={() => navegar('/dashboard')}
                            style={estilos.navBtn}>Dashboard</button>
                    )}
                    <button onClick={() => navegar('/tesoreria')}
                        style={estilos.navBtn}>Tesorería</button>
                    <button onClick={() => navegar('/sacramentos')}
                        style={estilos.navBtn}>Sacramentos</button>
                    <button onClick={() => navegar('/archivo')}
                        style={estilos.navBtn}>Archivo</button>
                    <button onClick={() => navegar('/certificados')}
                        style={estilos.navBtn}>Certificados</button>
                    <span style={estilos.navUsuario}>
                        {usuario?.nombre}
                    </span>
                    <button onClick={handleLogout}
                        style={estilos.navBtnRojo}>Salir</button>
                </div>

                {/* Botón hamburguesa para móvil */}
                <button
                    style={estilos.hamburguesa}
                    onClick={() => setMenuAbierto(!menuAbierto)}
                >
                    {menuAbierto ? '✕' : '☰'}
                </button>
            </div>

            {/* Menú móvil desplegable */}
            {menuAbierto && (
                <div style={estilos.menuMovil}>
                    <div style={estilos.menuUsuario}>
                        👤 {usuario?.nombre} ({usuario?.rol})
                    </div>
                    {usuario?.rol === 'admin' && (
                        <button onClick={() => navegar('/dashboard')}
                            style={estilos.menuItem}>
                            📊 Dashboard
                        </button>
                    )}
                    <button onClick={() => navegar('/tesoreria')}
                        style={estilos.menuItem}>
                        💰 Tesorería
                    </button>
                    <button onClick={() => navegar('/sacramentos')}
                        style={estilos.menuItem}>
                        ✝️ Sacramentos
                    </button>
                    <button onClick={() => navegar('/archivo')}
                        style={estilos.menuItem}>
                        📁 Archivo Histórico
                    </button>
                    <button onClick={() => navegar('/certificados')}
                        style={estilos.menuItem}>
                        📄 Certificados
                    </button>
                    <button onClick={handleLogout}
                        style={estilos.menuItemRojo}>
                        🚪 Cerrar Sesión
                    </button>
                </div>
            )}
        </nav>
    );
}

const estilos = {
    navbar: {
        backgroundColor: '#1a365d',
        color: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
    },
    navContenido: {
        padding: '0 16px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%'
    },
    navLogo: {
        display: 'flex',
        flexDirection: 'column',
        lineHeight: 1.2
    },
    navSub: {
        fontSize: '0.65rem',
        color: '#a0aec0'
    },
    navLinksDesktop: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        '@media (max-width: 768px)': {
            display: 'none'
        }
    },
    navBtn: {
        backgroundColor: 'transparent',
        color: '#fff',
        border: '1px solid #4a6fa5',
        padding: '5px 10px',
        borderRadius: '6px',
        fontSize: '0.8rem',
        cursor: 'pointer'
    },
    navBtnRojo: {
        backgroundColor: '#c53030',
        color: '#fff',
        border: 'none',
        padding: '5px 10px',
        borderRadius: '6px',
        fontSize: '0.8rem',
        cursor: 'pointer'
    },
    navUsuario: {
        fontSize: '0.8rem',
        color: '#a0aec0',
        marginRight: '4px'
    },
    hamburguesa: {
        display: 'none',
        backgroundColor: 'transparent',
        color: '#fff',
        border: 'none',
        fontSize: '1.5rem',
        cursor: 'pointer',
        padding: '4px 8px'
    },
    menuMovil: {
        backgroundColor: '#1a365d',
        borderTop: '1px solid #2d4a7a',
        padding: '8px 0',
        display: 'flex',
        flexDirection: 'column'
    },
    menuUsuario: {
        padding: '10px 16px',
        fontSize: '0.875rem',
        color: '#a0aec0',
        borderBottom: '1px solid #2d4a7a',
        marginBottom: '4px'
    },
    menuItem: {
        backgroundColor: 'transparent',
        color: '#fff',
        border: 'none',
        padding: '12px 16px',
        textAlign: 'left',
        fontSize: '0.95rem',
        cursor: 'pointer',
        width: '100%'
    },
    menuItemRojo: {
        backgroundColor: 'transparent',
        color: '#fc8181',
        border: 'none',
        padding: '12px 16px',
        textAlign: 'left',
        fontSize: '0.95rem',
        cursor: 'pointer',
        width: '100%',
        borderTop: '1px solid #2d4a7a',
        marginTop: '4px'
    }
};