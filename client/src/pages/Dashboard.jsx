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
    { valor: 'hoy',    etiqueta: 'Hoy',    dias: 1  },
    { valor: 'semana', etiqueta: 'Semana', dias: 7  },
    { valor: 'mes',    etiqueta: 'Mes',    dias: 30 },
    { valor: 'año',    etiqueta: 'Año',    dias: 365 },
];

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function fechaLocal(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fechasDesdeHasta(periodo) {
    const hoy   = new Date();
    const hasta = fechaLocal(hoy);
    const desde = new Date(hoy);
    if (periodo === 'hoy')    desde.setDate(hoy.getDate());
    if (periodo === 'semana') desde.setDate(hoy.getDate() - 6);
    if (periodo === 'mes')    desde.setDate(hoy.getDate() - 29);
    if (periodo === 'año')    desde.setFullYear(hoy.getFullYear() - 1);
    return { desde: fechaLocal(desde), hasta };
}

function nombreMes(mesStr) {  // 'YYYY-MM'
    const [, m] = mesStr.split('-');
    return MESES[parseInt(m, 10) - 1];
}

const ETIQUETAS_CONCEPTO = {
    'intencion_misa':           '🕯️ Intención de Misa',
    'certificado_bautismo':     '💧 Certificado Bautismo',
    'certificado_confirmacion': '✝️ Certificado Confirmación',
    'certificado_matrimonio':   '💍 Certificado Matrimonio',
};

export default function Dashboard() {
    const [periodo, setPeriodo]   = useState('mes');
    const [cargando, setCargando] = useState(true);
    const [errorApi, setErrorApi] = useState(false);
    const [intento,  setIntento]  = useState(0);

    // Datos
    const [resumenTesoreria, setResumenTesoreria] = useState(null);
    const [intenciones,      setIntenciones]      = useState([]);
    const [feligreses,       setFeligreses]        = useState([]);

    const cargar = useCallback(async () => {
        setCargando(true);
        setErrorApi(false);
        const { desde, hasta } = fechasDesdeHasta(periodo);
        try {
            const [resTesoreria, resInt, resFel] = await Promise.allSettled([
                api.get(`/tesoreria/resumen?desde=${desde}&hasta=${hasta}`),
                api.get('/intenciones'),
                api.get('/sacramentos/feligres/buscar?termino='),
            ]);

            if (resTesoreria.status === 'fulfilled') {
                setResumenTesoreria(resTesoreria.value.data);
            } else {
                setResumenTesoreria(null);
            }

            if (resInt.status === 'fulfilled') {
                setIntenciones(resInt.value.data.intenciones || []);
            }

            if (resFel.status === 'fulfilled') {
                setFeligreses(resFel.value.data.feligreses || []);
            }

        } catch {
            setErrorApi(true);
        } finally {
            setCargando(false);
        }
    }, [intento, periodo]); // eslint-disable-line

    useEffect(() => { cargar(); }, [cargar]);

    /* ── KPIs ───────────────────────────────────────────────── */
    const totalIngresos      = resumenTesoreria?.resumen?.total_ingresos      ?? 0;
    const totalTransacciones = resumenTesoreria?.resumen?.total_transacciones ?? 0;

    const diasPeriodo = PERIODOS.find(p => p.valor === periodo)?.dias ?? 30;
    const promedioDiario = diasPeriodo > 0 ? totalIngresos / diasPeriodo : 0;
    const proyeccionMes  = promedioDiario * 30;

    // Catecúmenos activos
    const catecumenos = feligreses.filter(f => f.es_catecumeno || f.estado === 'catecumeno').length;

    /* ── Alertas ─────────────────────────────────────────────── */
    const alertas = [];
    // Usar fecha local (no UTC) para evitar desfase de zona horaria
    const hoyLocal = new Date();
    const hoy = `${hoyLocal.getFullYear()}-${String(hoyLocal.getMonth()+1).padStart(2,'0')}-${String(hoyLocal.getDate()).padStart(2,'0')}`;
    const intencionesHoy = intenciones.filter(i => (i.fecha_misa || '').slice(0, 10) === hoy);
    if (!cargando && intencionesHoy.length === 0) {
        alertas.push({ nivel: 'advertencia', mensaje: '⚠️ No se han registrado intenciones el día de hoy' });
    }

    /* ── Gráfica: ingresos por día ───────────────────────────── */
    const ingresosporDia = (resumenTesoreria?.por_dia || []).map(r => ({
        fecha:  r.fecha?.slice(5) ?? r.fecha,   // MM-DD
        total:  parseFloat(r.total),
    }));

    /* ── Gráfica: ingresos por mes (barras) ──────────────────── */
    const ingresosporMes = (resumenTesoreria?.por_mes || []).map(r => ({
        periodo: nombreMes(r.mes),
        total:   parseFloat(r.total),
    }));

    /* ── Desglose por concepto ───────────────────────────────── */
    const porConcepto = resumenTesoreria?.por_concepto || [];

    const hayDatos = totalIngresos > 0 || totalTransacciones > 0;

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

                {cargando && <div className={styles.cargando}>Cargando datos…</div>}

                {!cargando && errorApi && (
                    <div className={styles.graficaContenedor} style={{ textAlign: 'center', padding: '40px' }}>
                        <p style={{ color: 'var(--texto-tenue)', marginBottom: 8 }}>
                            ⚠️ No se pudo conectar con el servidor.
                        </p>
                        <p style={{ color: 'var(--texto-tenue)', fontSize: '0.85rem' }}>
                            El backend puede estar iniciando. Intenta de nuevo en unos segundos.
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
                                <p className={styles.kpiValorExito}>Q{parseFloat(totalIngresos).toFixed(2)}</p>
                                <p className={styles.kpiSub}>{totalTransacciones} cobro{totalTransacciones !== 1 ? 's' : ''}</p>
                            </div>
                            <div className={styles.kpiTarjeta}>
                                <p className={styles.kpiEtiqueta}>Promedio diario</p>
                                <p className={styles.kpiValorExito}>Q{promedioDiario.toFixed(2)}</p>
                                <p className={styles.kpiSub}>por día</p>
                            </div>
                            <div className={styles.kpiTarjeta}>
                                <p className={styles.kpiEtiqueta}>Proyección próximo mes</p>
                                <p className={styles.kpiValorExito}>Q{proyeccionMes.toFixed(2)}</p>
                                <p className={styles.kpiSub}>{diasPeriodo} día{diasPeriodo !== 1 ? 's' : ''} analizados</p>
                            </div>
                            <div className={styles.kpiTarjeta}>
                                <p className={styles.kpiEtiqueta}>Catecúmenos activos</p>
                                <p className={styles.kpiValor}>{catecumenos}</p>
                                <p className={styles.kpiSub}>en proceso</p>
                            </div>
                        </div>

                        {/* Desglose por concepto */}
                        {porConcepto.length > 0 && (
                            <div className={styles.graficaContenedor}>
                                <h2 className={styles.graficaTitulo}>Desglose por Concepto</h2>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                                    {porConcepto.map(c => (
                                        <div key={c.concepto} style={{
                                            background: 'var(--fondo-panel)',
                                            border: '1px solid var(--borde)',
                                            borderRadius: 'var(--radio)',
                                            padding: '14px 16px',
                                        }}>
                                            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--texto-tenue)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                                                {ETIQUETAS_CONCEPTO[c.concepto] || c.concepto || 'Sin concepto'}
                                            </p>
                                            <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--oro)', margin: '0 0 2px' }}>
                                                Q{parseFloat(c.total).toFixed(2)}
                                            </p>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--texto-suave)', margin: 0 }}>
                                                {c.cantidad} cobro{parseInt(c.cantidad) !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Gráfica de línea — ingresos por día */}
                        {ingresosporDia.length > 1 && (
                            <div className={styles.graficaContenedor}>
                                <h2 className={styles.graficaTitulo}>Ingresos Diarios — Período seleccionado</h2>
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={ingresosporDia}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" />
                                        <XAxis dataKey="fecha" stroke="var(--texto-tenue)" tick={{ fontSize: 11 }} />
                                        <YAxis stroke="var(--texto-tenue)" tick={{ fontSize: 11 }} />
                                        <Tooltip
                                            contentStyle={{
                                                background: 'var(--fondo-card)',
                                                border: '1px solid var(--borde)',
                                                borderRadius: 'var(--radio)',
                                                color: 'var(--texto-principal)',
                                                fontSize: 12,
                                            }}
                                            formatter={(v) => [`Q${parseFloat(v).toFixed(2)}`, 'Ingresos']}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="total"
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
                        {ingresosporMes.length > 0 && (
                            <div className={styles.graficaContenedor}>
                                <h2 className={styles.graficaTitulo}>Ingresos — Últimos 6 meses</h2>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={ingresosporMes}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" />
                                        <XAxis dataKey="periodo" stroke="var(--texto-tenue)" tick={{ fontSize: 11 }} />
                                        <YAxis stroke="var(--texto-tenue)" tick={{ fontSize: 11 }} />
                                        <Tooltip
                                            contentStyle={{
                                                background: 'var(--fondo-card)',
                                                border: '1px solid var(--borde)',
                                                borderRadius: 'var(--radio)',
                                                color: 'var(--texto-principal)',
                                                fontSize: 12,
                                            }}
                                            formatter={(v) => [`Q${parseFloat(v).toFixed(2)}`, 'Ingresos']}
                                        />
                                        <Bar dataKey="total" fill="#C9973A" radius={[3, 3, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Sin datos aún */}
                        {!hayDatos && ingresosporMes.length === 0 && (
                            <div className={styles.graficaContenedor} style={{ textAlign: 'center', padding: '32px' }}>
                                <p style={{ color: 'var(--texto-tenue)' }}>
                                    No hay cobros registrados en el período seleccionado
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}