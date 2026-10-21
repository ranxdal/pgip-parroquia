import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Navbar.module.css';

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

    const avatarLetra = (usuario?.nombre?.[0] || '?').toUpperCase();

    return (
        <nav className={styles.navbar}>
            <div className={styles.navContenido}>
                <div className={styles.navLogo}>
                    <span className={styles.navLogoPrincipal}>PGIP</span>
                    <span className={styles.navLogoSep} />
                    <span className={styles.navSub}>Parroquia San Agustín</span>
                </div>

                {!esMovil && (
                    <div className={styles.navLinksDesktop}>
                        {usuario?.rol === 'admin' && (
                            <button onClick={() => navegar('/dashboard')}
                                className={styles.navBtn}>Dashboard</button>
                        )}
                        <button onClick={() => navegar('/tesoreria')}
                            className={styles.navBtn}>Tesorería</button>
                        <button onClick={() => navegar('/sacramentos')}
                            className={styles.navBtn}>Sacramentos</button>
                        <button onClick={() => navegar('/archivo')}
                            className={styles.navBtn}>Archivo</button>
                        <button onClick={() => navegar('/certificados')}
                            className={styles.navBtn}>Certificados</button>
                        <button onClick={() => navegar('/intenciones')}
                            className={styles.navBtn}>Intenciones</button>

                        {/* Avatar / perfil */}
                        <button onClick={() => navegar('/perfil')}
                            className={styles.navAvatar}
                            title={`${usuario?.nombre} — Mi perfil`}>
                            {usuario?.foto_url ? (
                                <img src={usuario.foto_url} alt="perfil"
                                    className={styles.avatarImg}
                                    onError={e => { e.target.style.display = 'none'; }} />
                            ) : (
                                <span className={styles.avatarLetra}>{avatarLetra}</span>
                            )}
                        </button>

                        <button onClick={handleLogout}
                            className={styles.navBtnRojo}>Salir</button>
                    </div>
                )}

                {esMovil && (
                    <button
                        className={styles.hamburguesa}
                        onClick={() => setMenuAbierto(!menuAbierto)}
                    >
                        {menuAbierto ? '✕' : '☰'}
                    </button>
                )}
            </div>

            {esMovil && menuAbierto && (
                <div className={styles.menuMovil}>
                    <div className={styles.menuUsuario}>
                        {usuario?.foto_url ? (
                            <img src={usuario.foto_url} alt="perfil"
                                className={styles.menuAvatarImg}
                                onError={e => e.target.style.display='none'} />
                        ) : (
                            <span className={styles.menuAvatarLetra}>{avatarLetra}</span>
                        )}
                        <span>{usuario?.nombre} ({usuario?.rol})</span>
                    </div>
                    {usuario?.rol === 'admin' && (
                        <button onClick={() => navegar('/dashboard')}
                            className={styles.menuItem}>
                            📊 Dashboard
                        </button>
                    )}
                    <button onClick={() => navegar('/tesoreria')}
                        className={styles.menuItem}>
                        💰 Tesorería
                    </button>
                    <button onClick={() => navegar('/sacramentos')}
                        className={styles.menuItem}>
                        ✝️ Sacramentos
                    </button>
                    <button onClick={() => navegar('/archivo')}
                        className={styles.menuItem}>
                        📁 Archivo Histórico
                    </button>
                    <button onClick={() => navegar('/certificados')}
                        className={styles.menuItem}>
                        📄 Certificados
                    </button>
                    <button onClick={() => navegar('/intenciones')}
                        className={styles.menuItem}>
                        🕊️ Intenciones de Misa
                    </button>
                    <button onClick={() => navegar('/perfil')}
                        className={styles.menuItem}>
                        👤 Mi Perfil
                    </button>
                    <button onClick={handleLogout}
                        className={styles.menuItemRojo}>
                        🚪 Cerrar Sesión
                    </button>
                </div>
            )}
        </nav>
    );
}