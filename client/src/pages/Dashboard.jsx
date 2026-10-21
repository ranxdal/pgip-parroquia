import { useState, useEffect } from 'react';
import {
    LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts';
import api from '../services/api';
import Navbar from '../components/Navbar';
import styles from './Dashboard.module.css';

const PERIODOS = [
    { valor: 'semana', etiqueta: 'Semana' },
    { valor: 'mes',    etiqueta: 'Mes' },
    { valor: 'año',    etiqueta: 'Año' },
];

export default function Dashboard() {
    const [datos, setDatos]     = useState(null);
    const [periodo, setPeriodo] = useState('mes');
    const [cargando, setCargando] = useState(true);
    const [errorApi, setErrorApi] = useState(false);

    useEffect(() => {
        const cargar = async () => {
            setCargando(true);
            setErrorApi(false);
            try {
                const { data } = await api.get(`/analytics/dashboard?periodo=${periodo}`);
                setDatos(data);
            } catch {
                setErrorApi(true);
                setDatos(null);
            } finally {
                setCargando(false);
            }
        };
        cargar();
    }, [periodo]);

    return (
        <div className={styles.contenedor}>
            <Navbar />
            <div className={styles.contenido}>

                {/* Encabezado + filtros */}
                <div className={styles.encabezado}>
                    <h1 className={styles.titulo}>Panel de Analítica</h1>
                    <div className={styles.filtros}>
                        {PERIODOS.map(p => (
                            <button
                                key={p.valor}
                                className={`${styles.filtroBton} ${periodo === p.valor ? styles.filtroBtonActivo : ''}`}
                                onClick={() => setPeriodo(p.valor)}
                            >
                                {p.etiqueta}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Alertas */}
                {datos?.alertas?.length > 0 && (
                    <div className={styles.alertasContenedor}>
                        {datos.alertas.map((a, i) => (
                            <div
                                key={i}
                                className={`${styles.alerta} ${
                                    a.nivel === 'urgente'     ? styles.alertaUrgente :
                                    a.nivel === 'advertencia' ? styles.alertaAdvertencia :
                                    styles.alertaInformacion
                                }`}
                            >
                                {a.mensaje}
                            </div>
                        ))}
                    </div>
                )}

                {/* Estado de carga */}
                {cargando && (
                    <div className={styles.cargando}>Cargando datos…</div>
                )}

                {/* Error de API (backend dormido en Render free tier) */}
                {!cargando && errorApi && (
                    <div className={styles.graficaContenedor} style={{ textAlign: 'center', padding: '40px' }}>
                        <p style={{ color: 'var(--texto-tenue)', marginBottom: 8 }}>
                            ⚠️ No se pudo conectar con el servidor.
                        </p>
                        <p style={{ color: 'var(--texto-tenue)', fontSize: '0.85rem' }}>
                            El backend puede estar iniciando (Render free tier). Intenta de nuevo en unos segundos.
                        </p>
                        <button
                            className={styles.filtroBton}
                            style={{ marginTop: 16 }}
                            onClick={() => setPeriodo(p => p)}
                        >
                            🔄 Reintentar
                        </button>
                    </div>
                )}

                {/* KPIs */}
                {!cargando && datos && (
                    <>
                        <div className={styles.kpiGrid}>
                            <div className={styles.kpiTarjeta}>
                                <p className={styles.kpiEtiqueta}>Intenciones de Misa</p>
                                <p className={styles.kpiValor}>{datos.kpis?.intenciones ?? '—'}</p>
                                <p className={styles.kpiSub}>en el período</p>
                            </div>
                            <div className={styles.kpiTarjeta}>
                                <p className={styles.kpiEtiqueta}>Sacramentos</p>
                                <p className={styles.kpiValor}>{datos.kpis?.sacramentos ?? '—'}</p>
                                <p className={styles.kpiSub}>registrados</p>
                            </div>
                            <div className={styles.kpiTarjeta}>
                                <p className={styles.kpiEtiqueta}>Ingresos (Q)</p>
                                <p className={styles.kpiValorExito}>
                                    {datos.kpis?.ingresos != null
                                        ? `Q${parseFloat(datos.kpis.ingresos).toFixed(2)}`
                                        : '—'}
                                </p>
                                <p className={styles.kpiSub}>recaudado</p>
                            </div>
                            <div className={styles.kpiTarjeta}>
                                <p className={styles.kpiEtiqueta}>Feligreses</p>
                                <p className={styles.kpiValor}>{datos.kpis?.feligreses ?? '—'}</p>
                                <p className={styles.kpiSub}>registrados</p>
                            </div>
                        </div>

                        {/* Gráfica de línea — tendencia de intenciones */}
                        {datos.tendenciaIntenciones?.length > 0 && (
                            <div className={styles.graficaContenedor}>
                                <h2 className={styles.graficaTitulo}>Tendencia de Intenciones</h2>
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={datos.tendenciaIntenciones}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" />
                                        <XAxis dataKey="fecha" stroke="var(--texto-tenue)" tick={{ fontSize: 11 }} />
                                        <YAxis stroke="var(--texto-tenue)" tick={{ fontSize: 11 }} />
                                        <Tooltip
                                            contentStyle={{
                                                background: 'var(--fondo-card)',
                                                border: '1px solid var(--borde)',
                                                borderRadius: 'var(--radio)',
                                                color: 'var(--texto-principal)',
                                                fontSize: 12
                                            }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="cantidad"
                                            stroke="#C9973A"
                                            strokeWidth={2}
                                            dot={{ fill: '#C9973A', strokeWidth: 0, r: 3 }}
                                            activeDot={{ r: 5 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Gráfica de barras — ingresos por período */}
                        {datos.ingresosPorPeriodo?.length > 0 && (
                            <div className={styles.graficaContenedor}>
                                <h2 className={styles.graficaTitulo}>Ingresos por Período</h2>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={datos.ingresosPorPeriodo}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" />
                                        <XAxis dataKey="periodo" stroke="var(--texto-tenue)" tick={{ fontSize: 11 }} />
                                        <YAxis stroke="var(--texto-tenue)" tick={{ fontSize: 11 }} />
                                        <Tooltip
                                            contentStyle={{
                                                background: 'var(--fondo-card)',
                                                border: '1px solid var(--borde)',
                                                borderRadius: 'var(--radio)',
                                                color: 'var(--texto-principal)',
                                                fontSize: 12
                                            }}
                                        />
                                        <Bar dataKey="total" fill="#C9973A" radius={[3, 3, 0, 0]} />
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