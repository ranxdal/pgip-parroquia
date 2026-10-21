import { useState, useEffect, useCallback } from 'react';
import {
    LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts';
import api from '../services/api';
import Navbar from '../components/Navbar';
import styles from './Dashboard.module.css';

const PERIODOS = [
    { valor: 'hoy',    etiqueta: 'Hoy' },
    { valor: 'semana', etiqueta: 'Semana' },
    { valor: 'mes',    etiqueta: 'Mes' },
    { valor: 'año',    etiqueta: 'Año' },
];

/* ── helpers de fecha ─────────────────────────────────────── */
function fechaDesde(periodo) {
    const hoy = new Date();
    if (periodo === 'hoy')   return hoy.toISOString().slice(0, 10);
    if (periodo === 'semana') {
        const d = new Date(hoy); d.setDate(d.getDate() - 6);
        return d.toISOString().slice(0, 10);
    }
    if (periodo === 'mes') {
        const d = new Date(hoy); d.setDate(d.getDate() - 29);
        return d.toISOString().slice(0, 10);
    }
    // año
    const d = new Date(hoy); d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
}

function nombreMes(fechaStr) {
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const [, m] = fechaStr.split('-');
    return meses[parseInt(m, 10) - 1];
}

export default function Dashboard() {
    const [periodo, setPeriodo]   = useState('mes');
    const [cargando, setCargando] = useState(true);
    const [errorApi, setErrorApi] = useState(false);
    const [intento, setIntento]   = useState(0);

    // Datos en crudo
    const [intenciones, setIntenciones] = useState([]);
    const [sacramentos, setSacramentos] = useState([]);
    const [feligreses,  setFeligreses]  = useState([]);

    const cargar = useCallback(async () => {
        setCargando(true);
        setErrorApi(false);
        try {
            // Tres llamadas en paralelo a las rutas reales del backend
            const [resInt, resSac] = await Promise.all([
                api.get('/intenciones'),
                api.get('/sacramentos/feligres/buscar?termino='),
            ]);

            setIntenciones(resInt.data.intenciones || []);

            // buscarFeligres devuelve { feligreses: [...] }
            const fel = resSac.data.feligreses || [];
            setFeligreses(fel);

            // Sacramentos: iteramos sobre todos los feligreses no es viable en el dashboard
            // Usamos los datos de feligreses para contar catecúmenos
            setSacramentos([]);
        } catch {
            // Si buscarFeligres falla (requiere termino), intentamos con intenciones solas
            try {
                const resInt2 = await api.get('/intenciones');
                setIntenciones(resInt2.data.intenciones || []);
                setFeligreses([]);
                setSacramentos([]);
            } catch {
                setErrorApi(true);
            }
        } finally {
            setCargando(false);
        }
    }, [intento, periodo]); // eslint-disable-line

    useEffect(() => { cargar(); }, [cargar]);

    /* ── KPIs derivados ─────────────────────────────────────── */
    const desde = fechaDesde(periodo);

    const intencionesperiodo = intenciones.filter(i => {
        const f = i.fecha_misa || i.created_at || '';
        return f >= desde;
    });

    const totalIntenciones = intencionesperiodo.length;

    // Ingresos: las intenciones de misa tienen un monto (Q50 estándar en GT)
    // Si existe campo monto lo usamos; si no usamos Q50 por intención
    const totalIngresos = intencionesperiodo.reduce((sum, i) => {
        return sum + (parseFloat(i.monto) || 50);
    }, 0);

    const diasPeriodo = periodo === 'hoy' ? 1
        : periodo === 'semana' ? 7
        : periodo === 'mes'    ? 30
        : 365;

    const promedioDiario = diasPeriodo > 0 ? totalIngresos / diasPeriodo : 0;

    // Proyección próximo mes basada en promedio diario
    const proyeccionMes = promedioDiario * 30;

    // Catecúmenos activos
    const catecumenos = feligreses.filter(f => f.es_catecumeno || f.estado === 'catecumeno').length;

    /* ── Alertas ─────────────────────────────────────────────── */
    const alertas = [];
    const hoy = new Date().toISOString().slice(0, 10);
    const intencionesHoy = intenciones.filter(i => (i.fecha_misa || '') === hoy);
    if (intencionesHoy.length === 0) {
        alertas.push({ nivel: 'advertencia', mensaje: '⚠️ No se han registrado intenciones el día de hoy' });
    }

    /* ── Gráfica: tendencia de intenciones por día/semana ────── */
    const tendencia = (() => {
        if (intenciones.length === 0) return [];
        // Agrupar por fecha
        const conteo = {};
        intencionesperiodo.forEach(i => {
            const fecha = (i.fecha_misa || i.created_at || '').slice(0, 10);
            conteo[fecha] = (conteo[fecha] || 0) + 1;
        });
        return Object.entries(conteo)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-12)
            .map(([fecha, cantidad]) => ({
                fecha: fecha.slice(5), // MM-DD
                cantidad
            }));
    })();

    /* ── Gráfica: ingresos por mes (últimos 6 meses) ─────────── */
    const ingresosGrafica = (() => {
        if (intenciones.length === 0) return [];
        const conteo = {};
        intenciones.forEach(i => {
            const f = (i.fecha_misa || i.created_at || '').slice(0, 7); // YYYY-MM
            if (!f || f.length < 7) return;
            const monto = parseFloat(i.monto) || 50;
            conteo[f] = (conteo[f] || 0) + monto;
        });
        return Object.entries(conteo)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-6)
            .map(([fecha, total]) => ({
                periodo: nombreMes(fecha + '-01'),
                total: parseFloat(total.toFixed(2))
            }));
    })();

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

                {/* Estado de carga */}
                {cargando && (
                    <div className={styles.cargando}>Cargando datos…</div>
                )}

                {/* Error de API */}
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
                            onClick={() => setIntento(n => n + 1)}
                        >
                            🔄 Reintentar
                        </button>
                    </div>
                )}

                {/* Contenido principal */}
                {!cargando && !errorApi && (
                    <>
                        {/* Alertas */}
                        {alertas.length > 0 && (
                            <div className={styles.alertasContenedor}>
                                {alertas.map((a, i) => (
                                    <div key={i} className={`${styles.alerta} ${
                                        a.nivel === 'urgente'     ? styles.alertaUrgente :
                                        a.nivel === 'advertencia' ? styles.alertaAdvertencia :
                                        styles.alertaInformacion
                                    }`}>
                                        {a.mensaje}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* KPIs */}
                        <div className={styles.kpiGrid}>
                            <div className={styles.kpiTarjeta}>
                                <p className={styles.kpiEtiqueta}>Ingresos del período</p>
                                <p className={styles.kpiValorExito}>
                                    Q{totalIngresos.toFixed(2)}
                                </p>
                                <p className={styles.kpiSub}>{totalIntenciones} intenciones</p>
                            </div>
                            <div className={styles.kpiTarjeta}>
                                <p className={styles.kpiEtiqueta}>Promedio diario</p>
                                <p className={styles.kpiValorExito}>
                                    Q{promedioDiario.toFixed(2)}
                                </p>
                                <p className={styles.kpiSub}>por día</p>
                            </div>
                            <div className={styles.kpiTarjeta}>
                                <p className={styles.kpiEtiqueta}>Proyección próximo mes</p>
                                <p className={styles.kpiValorExito}>
                                    Q{proyeccionMes.toFixed(2)}
                                </p>
                                <p className={styles.kpiSub}>{diasPeriodo} días analizados</p>
                            </div>
                            <div className={styles.kpiTarjeta}>
                                <p className={styles.kpiEtiqueta}>Catecúmenos activos</p>
                                <p className={styles.kpiValor}>{catecumenos}</p>
                                <p className={styles.kpiSub}>en proceso</p>
                            </div>
                        </div>

                        {/* Gráfica de línea — tendencia de intenciones */}
                        {tendencia.length > 0 && (
                            <div className={styles.graficaContenedor}>
                                <h2 className={styles.graficaTitulo}>Tendencia de Intenciones — Últimos registros</h2>
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={tendencia}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" />
                                        <XAxis dataKey="fecha" stroke="var(--texto-tenue)" tick={{ fontSize: 11 }} />
                                        <YAxis stroke="var(--texto-tenue)" tick={{ fontSize: 11 }} allowDecimals={false} />
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

                        {/* Gráfica de barras — ingresos por mes */}
                        {ingresosGrafica.length > 0 && (
                            <div className={styles.graficaContenedor}>
                                <h2 className={styles.graficaTitulo}>Ingresos — Últimos 6 meses</h2>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={ingresosGrafica}>
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
                                            formatter={(v) => [`Q${v}`, 'Ingresos']}
                                        />
                                        <Bar dataKey="total" fill="#C9973A" radius={[3, 3, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Sin datos aún */}
                        {tendencia.length === 0 && ingresosGrafica.length === 0 && (
                            <div className={styles.graficaContenedor} style={{ textAlign: 'center', padding: '32px' }}>
                                <p style={{ color: 'var(--texto-tenue)' }}>
                                    No hay registros en el período seleccionado
                                </p>
                            </div>
                        )}
                    </>
                )}

            </div>
        </div>
    );
}