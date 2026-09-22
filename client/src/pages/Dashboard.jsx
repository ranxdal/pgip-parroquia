import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
    LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function Dashboard() {
    const { usuario, logout } = useAuth();
    const navigate = useNavigate();
    const [periodo, setPeriodo] = useState('mes');
    const [datos, setDatos] = useState(null);
    const [alertas, setAlertas] = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        cargarDatos();
        cargarAlertas();
    }, [periodo]);

    const cargarDatos = async () => {
        try {
            setCargando(true);
            const { data } = await api.get(`/analytics/dashboard?periodo=${periodo}`);
            setDatos(data);
        } catch (error) {
            console.error('Error cargando dashboard:', error);
        } finally {
            setCargando(false);
        }
    };

    const cargarAlertas = async () => {
        try {
            const { data } = await api.get('/analytics/alertas');
            setAlertas(data.alertas);
        } catch (error) {
            console.error('Error cargando alertas:', error);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const coloresAlerta = {
        urgente: '#fc8181',
        advertencia: '#f6ad55',
        informacion: '#63b3ed'
    };

    return (
        <div style={estilos.contenedor}>
            {/* Barra de navegación */}
            <nav style={estilos.navbar}>
                <div style={estilos.navLogo}>
                    <strong>PGIP</strong>
                    <span style={estilos.navSub}>Parroquia San Agustín</span>
                </div>
                <div style={estilos.navLinks}>
                    <button onClick={() => navigate('/tesoreria')}
                        style={estilos.navBtn}>Tesorería</button>
                    <button onClick={() => navigate('/sacramentos')}
                        style={estilos.navBtn}>Sacramentos</button>
                    <button onClick={() => navigate('/archivo')}
                        style={estilos.navBtn}>Archivo</button>
                    <span style={estilos.navUsuario}>
                        {usuario?.nombre} ({usuario?.rol})
                    </span>
                    <button onClick={handleLogout}
                        style={estilos.navBtnRojo}>Cerrar Sesión</button>
                </div>
            </nav>

            <div style={estilos.contenido}>
                {/* Encabezado */}
                <div style={estilos.encabezado}>
                    <h1 style={estilos.titulo}>Dashboard Ejecutivo</h1>
                    <div style={estilos.filtros}>
                        {['dia', 'semana', 'mes', 'anio'].map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriodo(p)}
                                style={{
                                    ...estilos.filtroBton,
                                    backgroundColor: periodo === p ? '#1a365d' : '#e2e8f0',
                                    color: periodo === p ? '#fff' : '#2d3748'
                                }}
                            >
                                {p === 'dia' ? 'Hoy' :
                                    p === 'semana' ? 'Semana' :
                                        p === 'mes' ? 'Mes' : 'Año'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Alertas */}
                {alertas.length > 0 && (
                    <div style={estilos.alertasContenedor}>
                        {alertas.map((alerta, i) => (
                            <div key={i} style={{
                                ...estilos.alerta,
                                borderLeftColor: coloresAlerta[alerta.nivel]
                            }}>
                                ⚠️ {alerta.mensaje}
                            </div>
                        ))}
                    </div>
                )}

                {cargando ? (
                    <div style={estilos.cargando}>Cargando indicadores...</div>
                ) : datos && (
                    <>
                        {/* Tarjetas KPI */}
                        <div style={estilos.kpiGrid}>
                            <div style={estilos.kpiTarjeta}>
                                <p style={estilos.kpiEtiqueta}>Ingresos del período</p>
                                <p style={estilos.kpiValor}>
                                    Q{datos.kpis.ingresos.total.toFixed(2)}
                                </p>
                                <p style={estilos.kpiSub}>
                                    {datos.kpis.ingresos.cantidad_transacciones} transacciones
                                </p>
                            </div>

                            <div style={estilos.kpiTarjeta}>
                                <p style={estilos.kpiEtiqueta}>Promedio diario</p>
                                <p style={estilos.kpiValor}>
                                    Q{datos.kpis.promedio_diario.toFixed(2)}
                                </p>
                                <p style={estilos.kpiSub}>por día</p>
                            </div>

                            <div style={estilos.kpiTarjeta}>
                                <p style={estilos.kpiEtiqueta}>Proyección próximo mes</p>
                                <p style={{ ...estilos.kpiValor, color: '#2f855a' }}>
                                    Q{datos.proyeccion.proyeccion?.toFixed(2) || 'N/D'}
                                </p>
                                <p style={estilos.kpiSub}>
                                    {datos.proyeccion.meses_analizados} meses analizados
                                </p>
                            </div>

                            <div style={estilos.kpiTarjeta}>
                                <p style={estilos.kpiEtiqueta}>Catecúmenos activos</p>
                                <p style={estilos.kpiValor}>
                                    {datos.kpis.catecumenos_activos}
                                </p>
                                <p style={estilos.kpiSub}>en proceso</p>
                            </div>
                        </div>

                        {/* Gráfica de tendencias */}
                        <div style={estilos.graficaContenedor}>
                            <h2 style={estilos.graficaTitulo}>
                                Tendencia de Ingresos — Últimos 6 meses
                            </h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={datos.tendencias}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="mes" />
                                    <YAxis />
                                    <Tooltip
                                        formatter={(value) => [`Q${value}`, 'Ingresos']}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="total_ingresos"
                                        stroke="#1a365d"
                                        strokeWidth={2}
                                        name="Ingresos (Q)"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Gráfica de sacramentos */}
                        {datos.kpis.sacramentos.length > 0 && (
                            <div style={estilos.graficaContenedor}>
                                <h2 style={estilos.graficaTitulo}>
                                    Sacramentos por Tipo
                                </h2>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={datos.kpis.sacramentos}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="tipo" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar
                                            dataKey="cantidad"
                                            fill="#2b6cb0"
                                            name="Cantidad"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

const estilos = {
    contenedor: { minHeight: '100vh', backgroundColor: '#f0f4f8' },
    navbar: {
        backgroundColor: '#1a365d',
        color: '#fff',
        padding: '0 24px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    navLogo: { display: 'flex', flexDirection: 'column' },
    navSub: { fontSize: '0.7rem', color: '#a0aec0' },
    navLinks: { display: 'flex', alignItems: 'center', gap: '12px' },
    navBtn: {
        backgroundColor: 'transparent',
        color: '#fff',
        border: '1px solid #4a6fa5',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '0.875rem'
    },
    navBtnRojo: {
        backgroundColor: '#c53030',
        color: '#fff',
        border: 'none',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '0.875rem'
    },
    navUsuario: { fontSize: '0.875rem', color: '#a0aec0' },
    contenido: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
    encabezado: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
    },
    titulo: { fontSize: '1.5rem', color: '#1a365d' },
    filtros: { display: 'flex', gap: '8px' },
    filtroBton: {
        padding: '6px 16px',
        border: 'none',
        borderRadius: '20px',
        fontSize: '0.875rem',
        cursor: 'pointer'
    },
    alertasContenedor: { marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px' },
    alerta: {
        backgroundColor: '#fff',
        borderLeft: '4px solid',
        padding: '12px 16px',
        borderRadius: '6px',
        fontSize: '0.875rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    cargando: { textAlign: 'center', padding: '40px', color: '#718096' },
    kpiGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
    },
    kpiTarjeta: {
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    kpiEtiqueta: { fontSize: '0.8rem', color: '#718096', marginBottom: '8px' },
    kpiValor: { fontSize: '1.8rem', fontWeight: 'bold', color: '#1a365d' },
    kpiSub: { fontSize: '0.75rem', color: '#a0aec0', marginTop: '4px' },
    graficaContenedor: {
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px'
    },
    graficaTitulo: { fontSize: '1rem', color: '#2d3748', marginBottom: '16px' }
};