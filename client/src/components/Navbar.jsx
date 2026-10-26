import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import styles from './Navbar.module.css';

export default function Navbar() {
    const { usuario, logout } = useAuth();
    const { tema, toggleTema } = useTheme();
    const navigate  = useNavigate();
    const location  = useLocation();
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [esMovil, setEsMovil] = useState(window.innerWidth <= 860);

    useEffect(() => {
        const handleResize = () => {
            setEsMovil(window.innerWidth <= 860);
            if (window.innerWidth > 860) setMenuAbierto(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Cierra el menú al cambiar de ruta
    useEffect(() => { setMenuAbierto(false); }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navegar = (ruta) => {
        navigate(ruta);
        setMenuAbierto(false);
    };

    // Devuelve true si la ruta actual coincide (exacta o sub-ruta)
    const esActivo = (ruta) => location.pathname === ruta || location.pathname.startsWith(ruta + '/');

    const btnClass = (ruta) =>
        `${styles.navBtn}${esActivo(ruta) ? ' ' + styles.navBtnActivo : ''}`;

    const menuClass = (ruta) =>
        `${styles.menuItem}${esActivo(ruta) ? ' ' + styles.menuItemActivo : ''}`;

    const avatarLetra = (usuario?.nombre?.[0] || '?').toUpperCase();
    const iconoTema   = tema === 'dark' ? '☀️' : '🌙';
    const labelTema   = tema === 'dark' ? 'Modo día' : 'Modo noche';

    return (
        <nav className={styles.navbar}>
            <div className={styles.navContenido}>
                {/* Logo */}
                <div className={styles.navLogo} onClick={() => navegar('/hub')}
                     style={{ cursor: 'pointer' }}>
                    <span className={styles.navLogoPrincipal}>PGIP</span>
                    <span className={styles.navLogoSep} />
                    <span className={styles.navSub}>Parroquia San Agustín</span>
                </div>

                {/* Links desktop */}
                {!esMovil && (
                    <div className={styles.navLinksDesktop}>
                        {usuario?.rol === 'admin' && (
                            <button onClick={() => navegar('/dashboard')}
                                className={btnClass('/dashboard')}>
                                Dashboard
                            </button>
                        )}
                        <button onClick={() => navegar('/tesoreria')}
                            className={btnClass('/tesoreria')}>
                            Tesorería
                        </button>
                        <button onClick={() => navegar('/sacramentos')}
                            className={btnClass('/sacramentos')}>
                            Sacramentos
                        </button>
                        <button onClick={() => navegar('/archivo')}
                            className={btnClass('/archivo')}>
                            Archivo
                        </button>
                        <button onClick={() => navegar('/certificados')}
                            className={btnClass('/certificados')}>
                            Certificados
                        </button>
                        <button onClick={() => navegar('/intenciones')}
                            className={btnClass('/intenciones')}>
                            Intenciones
                        </button>
                        <button onClick={() => navegar('/reportes')}
                            className={btnClass('/reportes')}>
                            Reportes
                        </button>

                        <span className={styles.navSeparador} />

                        {/* Toggle tema */}
                        <button
                            className={styles.temaToggle}
                            onClick={toggleTema}
                            title={labelTema}
                            aria-label={labelTema}>
                            {iconoTema}
                        </button>

                        {/* Avatar */}
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
                            className={styles.navBtnRojo}>
                            Salir
                        </button>
                    </div>
                )}

                {/* Hamburguesa */}
                {esMovil && (
                    <button
                        className={styles.hamburguesa}
                        onClick={() => setMenuAbierto(!menuAbierto)}
                        aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}>
                        {menuAbierto ? '✕' : '☰'}
                    </button>
                )}
            </div>

            {/* Menú móvil */}
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
                            className={menuClass('/dashboard')}>
                            📊 Dashboard
                        </button>
                    )}
                    <button onClick={() => navegar('/tesoreria')}
                        className={menuClass('/tesoreria')}>
                        💰 Tesorería
                    </button>
                    <button onClick={() => navegar('/sacramentos')}
                        className={menuClass('/sacramentos')}>
                        ✝️ Sacramentos
                    </button>
                    <button onClick={() => navegar('/archivo')}
                        className={menuClass('/archivo')}>
                        📁 Archivo Histórico
                    </button>
                    <button onClick={() => navegar('/certificados')}
                        className={menuClass('/certificados')}>
                        📄 Certificados
                    </button>
                    <button onClick={() => navegar('/intenciones')}
                        className={menuClass('/intenciones')}>
                        🕊️ Intenciones de Misa
                    </button>
                    <button onClick={() => navegar('/reportes')}
                        className={menuClass('/reportes')}>
                        📋 Reportes
                    </button>
                    <button onClick={() => navegar('/perfil')}
                        className={menuClass('/perfil')}>
                        👤 Mi Perfil
                    </button>

                    <div className={styles.menuTemaFila}>
                        <span className={styles.menuTemaLabel}>Apariencia</span>
                        <button className={styles.menuTemaBtnMovil} onClick={toggleTema}>
                            {iconoTema} {labelTema}
                        </button>
                    </div>

                    <button onClick={handleLogout}
                        className={styles.menuItemRojo}>
                        🚪 Cerrar Sesión
                    </button>
                </div>
            )}
        </nav>
    );
}