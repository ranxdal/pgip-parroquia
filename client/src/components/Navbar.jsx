import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
    const { usuario, logout } = useAuth();
    const navigate = useNavigate();
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [esMovil, setEsMovil] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => {
            setEsMovil(window.innerWidth <= 768);
            if (window.innerWidth > 768) setMenuAbierto(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
                <div style={estilos.navLogo}>
                    <strong style={{ fontSize: '1.1rem' }}>PGIP</strong>
                    <span style={estilos.navSub}>Parroquia San Agustín</span>
                </div>

                {/* Menú desktop */}
                {!esMovil && (
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
                        <span style={estilos.navUsuario}>{usuario?.nombre}</span>
                        <button onClick={handleLogout}
                            style={estilos.navBtnRojo}>Salir</button>
                    </div>
                )}

                {/* Botón hamburguesa para móvil */}
                {esMovil && (
                    <button
                        style={estilos.hamburguesa}
                        onClick={() => setMenuAbierto(!menuAbierto)}
                    >
                        {menuAbierto ? '✕' : '☰'}
                    </button>
                )}
            </div>

            {/* Menú móvil desplegable */}
            {esMovil && menuAbierto && (
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
        justifyContent: 'space-between'
    },
    navLogo: {
        display: 'flex',
        flexDirection: 'column',
        lineHeight: 1.2
    },
    navSub: { fontSize: '0.65rem', color: '#a0aec0' },
    navLinksDesktop: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap'
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
        color: '#a0aec0'
    },
    hamburguesa: {
        backgroundColor: 'transparent',
        color: '#fff',
        border: '1px solid #4a6fa5',
        fontSize: '1.3rem',
        cursor: 'pointer',
        padding: '4px 10px',
        borderRadius: '6px'
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
        padding: '14px 16px',
        textAlign: 'left',
        fontSize: '1rem',
        cursor: 'pointer',
        width: '100%'
    },
    menuItemRojo: {
        backgroundColor: 'transparent',
        color: '#fc8181',
        border: 'none',
        padding: '14px 16px',
        textAlign: 'left',
        fontSize: '1rem',
        cursor: 'pointer',
        width: '100%',
        borderTop: '1px solid #2d4a7a',
        marginTop: '4px'
    }
};