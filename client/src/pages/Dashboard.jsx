import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import styles from './Dashboard.module.css';
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

    const claseAlerta = {
        urgente: styles.alertaUrgente,
        advertencia: styles.alertaAdvertencia,
        informacion: styles.alertaInformacion
    };

    return (
        <div className={styles.contenedor}>
            <Navbar />

            <div className={styles.contenido}>
                <div className={styles.encabezado}>
                    <h1 className={styles.titulo}>Dashboard Ejecutivo</h1>
                    <div className={styles.filtros}>
                        {['dia', 'semana', 'mes', 'anio'].map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriodo(p)}
                                className={`${styles.filtroBton} ${periodo === p ? styles.filtroBtonActivo : ''}`}
                            >
                                {p === 'dia' ? 'Hoy' :
                                    p === 'semana' ? 'Semana' :
                                        p === 'mes' ? 'Mes' : 'Año'}
                            </button>
                        ))}
                    </div>
                </div>

                {alertas.length > 0 && (
                    <div className={styles.alertasContenedor}>
                        {alertas.map((alerta, i) => (
                            <div key={i} className={`${styles.alerta} ${claseAlerta[alerta.nivel]}`}>
                                ⚠️ {alerta.mensaje}
                            </div>
                        ))}
                    </div>
                )}

                {cargando ? (
                    <div className={styles.cargando}>Cargando indicadores...</div>
                ) : datos && (
                    <>
                        <div className={styles.kpiGrid}>
                            <div className={styles.kpiTarjeta}>
                                <p className={styles.kpiEtiqueta}>Ingresos del período</p>
                                <p className={styles.kpiValor}>
                                    Q{datos.kpis.ingresos.total.toFixed(2)}
                                </p>
                                <p className={styles.kpiSub}>
                                    {datos.kpis.ingresos.cantidad_transacciones} transacciones
                                </p>
                            </div>
                            <div className={styles.kpiTarjeta}>
                                <p className={styles.kpiEtiqueta}>Promedio diario</p>
                                <p className={styles.kpiValor}>
                                    Q{datos.kpis.promedio_diario.toFixed(2)}
                                </p>
                                <p className={styles.kpiSub}>por día</p>
                            </div>
                            <div className={styles.kpiTarjeta}>
                                <p className={styles.kpiEtiqueta}>Proyección próximo mes</p>
                                <p className={styles.kpiValorExito}>
                                    Q{datos.proyeccion.proyeccion?.toFixed(2) || 'N/D'}
                                </p>
                                <p className={styles.kpiSub}>
                                    {datos.proyeccion.meses_analizados} meses analizados
                                </p>
                            </div>
                            <div className={styles.kpiTarjeta}>
                                <p className={styles.kpiEtiqueta}>Catecúmenos activos</p>
                                <p className={styles.kpiValor}>
                                    {datos.kpis.catecumenos_activos}
                                </p>
                                <p className={styles.kpiSub}>en proceso</p>
                            </div>
                        </div>

                        <div className={styles.graficaContenedor}>
                            <h2 className={styles.graficaTitulo}>
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
                            <div className={styles.graficaContenedor}>
                                <h2 className={styles.graficaTitulo}>Sacramentos por Tipo</h2>
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