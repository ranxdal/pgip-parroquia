import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import styles from './Hub.module.css';

// ─── Módulos del sistema ──────────────────────────────────────────────────────
const MODULOS = [
    {
        icono:  '💰',
        nombre: 'Tesorería',
        desc:   'Registro de cobros, control de ingresos y gestión de conceptos parroquiales.',
        ruta:   '/tesoreria',
        rol:    null,           // visible para todos
    },
    {
        icono:  '🕊️',
        nombre: 'Intenciones de Misa',
        desc:   'Registro diario de intenciones, exportación a Word para el celebrante.',
        ruta:   '/intenciones',
        rol:    null,
    },
    {
        icono:  '📄',
        nombre: 'Certificados',
        desc:   'Búsqueda en el archivo histórico y emisión de certificados sacramentales.',
        ruta:   '/certificados',
        rol:    null,
    },
    {
        icono:  '📁',
        nombre: 'Archivo Histórico',
        desc:   'Digitalización y consulta del acervo documental parroquial.',
        ruta:   '/archivo',
        rol:    null,
    },
    {
        icono:  '✝️',
        nombre: 'Sacramentos',
        desc:   'Registro de feligreses y seguimiento de sacramentos: bautismo, confirmación, matrimonio.',
        ruta:   '/sacramentos',
        rol:    null,
    },
    {
        icono:  '📋',
        nombre: 'Reportes',
        desc:   'Generación de reportes en Excel y PDF para análisis y rendición de cuentas.',
        ruta:   '/reportes',
        rol:    null,
    },
    {
        icono:  '📊',
        nombre: 'Panel de Analítica',
        desc:   'KPIs, tendencias de ingresos y alertas operacionales del período seleccionado.',
        ruta:   '/dashboard',
        rol:    'admin',        // solo admin
    },
];

// ─── Datos institucionales ────────────────────────────────────────────────────
const INFO = [
    { icono: '⛪', etiqueta: 'Parroquia',    valor: 'San Agustín de Sumpango'  },
    { icono: '📍', etiqueta: 'Diócesis',     valor: 'Sololá-Chimaltenango'     },
    { icono: '🗓️', etiqueta: 'Establecida',  valor: 'Época colonial'           },
    { icono: '🇬🇹', etiqueta: 'Municipio',    valor: 'Sumpango, Sacatepéquez'   },
];

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Hub() {
    const navigate  = useNavigate();
    const { usuario } = useAuth();

    const nombreCorto = usuario?.nombre?.split(' ')[0] || 'bienvenido';
    const esAdmin     = usuario?.rol === 'admin';

    const modulosVisibles = MODULOS.filter(m => !m.rol || m.rol === usuario?.rol);

    const ahora = new Date();
    const hora  = ahora.getHours();
    const saludo =
        hora < 12 ? 'Buenos días' :
        hora < 19 ? 'Buenas tardes' :
                    'Buenas noches';

    return (
        <div className={styles.pagina}>
            <Navbar />
            <div className={styles.contenedor}>

                {/* ── Hero bienvenida ── */}
                <div className={styles.hero}>
                    <div className={styles.heroTexto}>
                        <p className={styles.heroSaludo}>{saludo}</p>
                        <h1 className={styles.heroTitulo}>
                            {nombreCorto}
                        </h1>
                        <p className={styles.heroSub}>
                            Parroquia San Agustín de Sumpango · PGIP
                            {esAdmin && ' · Administrador'}
                        </p>
                    </div>
                    <div className={styles.heroBadge}>
                        <span className={styles.heroBadgeIcono}>✝</span>
                        <span className={styles.heroBadgeLabel}>PGIP</span>
                    </div>
                    <span className={styles.heroDeco}>✝</span>
                </div>

                {/* ── Módulos ── */}
                <p className={styles.seccionLabel}>Módulos del sistema</p>
                <div className={styles.modulosGrid}>
                    {modulosVisibles.map((m) => (
                        <button
                            key={m.ruta}
                            className={styles.moduloCard}
                            onClick={() => navigate(m.ruta)}
                        >
                            <div className={styles.moduloCardInner}>
                                <div className={styles.moduloIconoBloque}>
                                    {m.icono}
                                </div>
                                <div className={styles.moduloTexto}>
                                    <p className={styles.moduloNombre}>{m.nombre}</p>
                                    <p className={styles.moduloDesc}>{m.desc}</p>
                                    {m.rol === 'admin' && (
                                        <span className={styles.moduloBadgeAdmin}>Solo Admin</span>
                                    )}
                                    <span className={styles.moduloFlecha}>
                                        Abrir →
                                    </span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* ── Info parroquial ── */}
                <p className={styles.seccionLabel}>Información parroquial</p>
                <div className={styles.infoGrid}>
                    {INFO.map((item) => (
                        <div key={item.etiqueta} className={styles.infoCard}>
                            <span className={styles.infoIcono}>{item.icono}</span>
                            <p className={styles.infoEtiqueta}>{item.etiqueta}</p>
                            <p className={styles.infoValor}>{item.valor}</p>
                        </div>
                    ))}
                </div>

                {/* ── Pie ── */}
                <p className={styles.piePgip}>
                    PGIP · Sistema de Gestión Parroquial · {ahora.getFullYear()}
                </p>
            </div>
        </div>
    );
}