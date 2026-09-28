import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import {
    LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function Dashboard() {
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

    const coloresAlerta = {
        urgente: '#fc8181',
        advertencia: '#f6ad55',
        informacion: '#63b3ed'
    };

    return (
        <div style={estilos.contenedor}>
            <Navbar />

            <div style={estilos.contenido}>
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

                        <div style={estilos.graficaContenedor}>
                            <h2 style={estilos.graficaTitulo}>
                                Tendencia de Ingresos — Últimos 6 meses
                            </h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={datos.tendencias}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="mes" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => [`Q${value}`, 'Ingresos']} />
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

                        {datos.kpis.sacramentos.length > 0 && (
                            <div style={estilos.graficaContenedor}>
                                <h2 style={estilos.graficaTitulo}>Sacramentos por Tipo</h2>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={datos.kpis.sacramentos}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="tipo" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="cantidad" fill="#2b6cb0" name="Cantidad" />
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
    contenido: { padding: '16px', maxWidth: '1200px', margin: '0 auto' },
    encabezado: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px'
    },
    titulo: { fontSize: '1.3rem', color: '#1a365d' },
    filtros: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
    filtroBton: {
        padding: '6px 12px', border: 'none',
        borderRadius: '20px', fontSize: '0.8rem', cursor: 'pointer'
    },
    alertasContenedor: { marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' },
    alerta: {
        backgroundColor: '#fff', borderLeft: '4px solid',
        padding: '10px 14px', borderRadius: '6px',
        fontSize: '0.85rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    cargando: { textAlign: 'center', padding: '40px', color: '#718096' },
    kpiGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px', marginBottom: '16px'
    },
    kpiTarjeta: {
        backgroundColor: '#fff', padding: '16px',
        borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    kpiEtiqueta: { fontSize: '0.75rem', color: '#718096', marginBottom: '6px' },
    kpiValor: { fontSize: '1.5rem', fontWeight: 'bold', color: '#1a365d' },
    kpiSub: { fontSize: '0.7rem', color: '#a0aec0', marginTop: '4px' },
    graficaContenedor: {
        backgroundColor: '#fff', padding: '16px',
        borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '16px', overflowX: 'auto'
    },
    graficaTitulo: { fontSize: '0.95rem', color: '#2d3748', marginBottom: '12px' }
};