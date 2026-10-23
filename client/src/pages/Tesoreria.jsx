import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import styles from './Tesoreria.module.css';
import jsPDF from 'jspdf';

const CONCEPTOS = [
    { valor: 'intencion_misa',           etiqueta: 'Intención de Misa',              ruta: '/intenciones', icono: '🕯️' },
    { valor: 'certificado_bautismo',      etiqueta: 'Certificado de Bautismo',        ruta: '/certificados', icono: '💧' },
    { valor: 'certificado_confirmacion',  etiqueta: 'Certificado de Confirmación',    ruta: '/certificados', icono: '✝️' },
    { valor: 'certificado_matrimonio',    etiqueta: 'Certificado de Matrimonio',      ruta: '/certificados', icono: '💍' },
];

export default function Tesoreria() {
    const navigate = useNavigate();
    const { usuario: usuarioAuth } = useAuth();

    const [sesionCaja, setSesionCaja]     = useState(null);
    const [balance, setBalance]           = useState(null);
    const [historial, setHistorial]       = useState([]);
    const [montoInicial, setMontoInicial] = useState('50');
    const [mensaje, setMensaje]           = useState('');
    const [error, setError]               = useState('');
    const [cargando, setCargando]         = useState(false);

    // Formulario de cobro
    const [form, setForm] = useState({
        tipo:      'efectivo',
        monto:     '',
        concepto:  '',
    });

    // Último cobro registrado (para habilitar botón de ir al módulo)
    const [ultimoCobro, setUltimoCobro] = useState(null);

    // Usuario activo (para el recibo) — viene del AuthContext
    const usuarioActivo = usuarioAuth;

    useEffect(() => { cargarBalance(); }, []);

    const cargarBalance = async () => {
        try {
            const { data } = await api.get('/tesoreria/caja/balance');
            setSesionCaja(data.balance);
            setBalance(data.balance);
            cargarHistorial(data.balance.id);
        } catch {
            setSesionCaja(null);
            setBalance(null);
        }
    };

    const cargarHistorial = async (sesionId) => {
        try {
            const { data } = await api.get(`/tesoreria/transacciones/${sesionId}`);
            setHistorial(data.transacciones || []);
        } catch {
            setHistorial([]);
        }
    };

    const mostrarExito = (msg) => { setMensaje(msg); setTimeout(() => setMensaje(''), 4000); };
    const mostrarError = (msg) => { setError(msg);   setTimeout(() => setError(''), 4000); };

    // ── ABRIR CAJA ─────────────────────────────────────────────────────
    const abrirCaja = async () => {
        if (!montoInicial) return mostrarError('Ingrese el monto inicial');
        setCargando(true);
        try {
            await api.post('/tesoreria/caja/abrir', {
                monto_inicial: parseFloat(montoInicial)
            });
            mostrarExito('Caja abierta exitosamente');
            setMontoInicial('50');
            cargarBalance();
        } catch (err) {
            mostrarError(err.response?.data?.error || 'Error al abrir caja');
        } finally {
            setCargando(false);
        }
    };

    // ── REGISTRAR COBRO ────────────────────────────────────────────────
    const registrarCobro = async (e) => {
        e.preventDefault();
        if (!form.monto || !form.concepto) return mostrarError('Complete todos los campos');
        if (!sesionCaja) return mostrarError('Abra la caja primero');
        setCargando(true);
        setError('');
        try {
            const conceptoInfo = CONCEPTOS.find(c => c.valor === form.concepto);
            const { data } = await api.post('/tesoreria/transaccion', {
                sesion_caja_id: sesionCaja.id,
                tipo:           form.tipo,
                monto:          parseFloat(form.monto),
                descripcion:    conceptoInfo?.etiqueta || form.concepto,
                concepto:       form.concepto,
            });

            const transaccion = {
                ...data.transaccion,
                concepto:    form.concepto,
                tipo:        form.tipo,
                monto:       parseFloat(form.monto),
                descripcion: conceptoInfo?.etiqueta || form.concepto,
            };

            setUltimoCobro(transaccion);
            mostrarExito(`Cobro registrado — ${data.transaccion.correlativo}`);
            setForm({ tipo: 'efectivo', monto: '', concepto: '' });
            cargarBalance();
        } catch (err) {
            mostrarError(err.response?.data?.error || 'Error al registrar cobro');
        } finally {
            setCargando(false);
        }
    };

    // ── IMPRIMIR RECIBO ────────────────────────────────────────────────
    const imprimirRecibo = (tx) => {
        const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 130] });
        const fecha = new Date(tx.created_at).toLocaleDateString('es-GT', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
        const hora  = new Date(tx.created_at).toLocaleTimeString('es-GT', {
            hour: '2-digit', minute: '2-digit'
        });

        // Encabezado
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('PARROQUIA SAN AGUSTÍN', 40, 10, { align: 'center' });
        doc.text('DE SUMPANGO, SACATEPÉQUEZ', 40, 15, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text('Sumpango, Sacatepéquez, Guatemala', 40, 20, { align: 'center' });
        doc.setLineWidth(0.3);
        doc.line(5, 23, 75, 23);

        // Título
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('RECIBO DE COBRO', 40, 29, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`No. ${tx.correlativo}`, 40, 34, { align: 'center' });
        doc.line(5, 37, 75, 37);

        // Detalle
        let y = 43;
        const fila = (etiqueta, valor) => {
            doc.setFont('helvetica', 'bold');
            doc.text(`${etiqueta}:`, 5, y);
            doc.setFont('helvetica', 'normal');
            const lineas = doc.splitTextToSize(valor, 45);
            doc.text(lineas, 30, y);
            y += lineas.length > 1 ? lineas.length * 5 : 6;
        };

        fila('Fecha',    fecha);
        fila('Hora',     hora);
        fila('Tipo pago', tx.tipo === 'efectivo' ? 'Efectivo' : 'Transferencia');

        // Concepto con descripción larga
        const conceptoInfo = CONCEPTOS.find(c => c.valor === tx.concepto);
        fila('Concepto', conceptoInfo?.etiqueta || tx.descripcion || '—');

        if (tx.descripcion && tx.descripcion !== conceptoInfo?.etiqueta) {
            fila('Detalle', tx.descripcion);
        }

        // Emisor
        if (usuarioActivo) {
            fila('Emitido por', `${usuarioActivo.nombre} ${usuarioActivo.apellido}`);
            fila('Usuario',      usuarioActivo.usuario);
        }

        doc.line(5, y + 1, 75, y + 1); y += 7;

        // Total
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL:', 5, y);
        doc.text(`Q${parseFloat(tx.monto).toFixed(2)}`, 75, y, { align: 'right' });
        y += 8;
        doc.line(5, y, 75, y); y += 6;

        // Pie
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('Gracias por su ofrenda.', 40, y, { align: 'center' }); y += 5;
        doc.text('Que Dios le bendiga.', 40, y, { align: 'center' });

        doc.save(`recibo_${tx.correlativo}.pdf`);
    };

    // ── CONCEPTO SELECCIONADO ──────────────────────────────────────────
    const conceptoActual = CONCEPTOS.find(c => c.valor === ultimoCobro?.concepto);

    // ── RENDER ─────────────────────────────────────────────────────────
    return (
        <div className={styles.contenedor}>
            <Navbar />
            <div className={styles.contenido}>
                <h1 className={styles.titulo}>Tesorería y Control de Caja</h1>

                {mensaje && <div className={styles.exito}    onClick={() => setMensaje('')}>✅ {mensaje}</div>}
                {error   && <div className={styles.errorDiv} onClick={() => setError('')}>❌ {error}</div>}

                {/* ── Último cobro: botón de ir al módulo ── */}
                {ultimoCobro && conceptoActual && (
                    <div className={styles.bannerCobro}>
                        <div className={styles.bannerTexto}>
                            <span className={styles.bannerIcono}>{conceptoActual.icono}</span>
                            <div>
                                <p className={styles.bannerTitulo}>Cobro registrado — {ultimoCobro.correlativo}</p>
                                <p className={styles.bannerSub}>
                                    Q{parseFloat(ultimoCobro.monto).toFixed(2)} · {conceptoActual.etiqueta}
                                </p>
                            </div>
                        </div>
                        <div className={styles.bannerAcciones}>
                            <button
                                className={styles.botonRecibo}
                                onClick={() => imprimirRecibo(ultimoCobro)}>
                                🖨️ Imprimir recibo
                            </button>
                            <button
                                className={styles.botonIrModulo}
                                onClick={() => navigate(conceptoActual.ruta)}>
                                Ir a {conceptoActual.etiqueta.split(' ')[0] === 'Intención'
                                    ? 'Intenciones' : 'Certificados'} →
                            </button>
                        </div>
                    </div>
                )}

                <div className={styles.grid}>
                    {/* ── Panel izquierdo: estado de caja ── */}
                    <div className={styles.panel}>
                        <h2 className={styles.panelTitulo}>Estado de Caja</h2>

                        {!sesionCaja ? (
                            <div>
                                <p className={styles.textoGris}>No hay caja abierta hoy</p>
                                <div className={styles.campo}>
                                    <label className={styles.etiqueta}>Monto inicial (Q)</label>
                                    <input
                                        type="number"
                                        value={montoInicial}
                                        onChange={e => setMontoInicial(e.target.value)}
                                        className={styles.input}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <button
                                    onClick={abrirCaja}
                                    className={styles.botonPrimario}
                                    disabled={cargando}>
                                    Abrir Caja del Día
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div className={styles.estadoCaja}>
                                    <span className={`${styles.badge} ${sesionCaja.estado === 'abierta' ? styles.badgeAbierta : styles.badgeCerrada}`}>
                                        {sesionCaja.estado === 'abierta' ? '🟢 Caja Abierta' : '🔴 Caja Cerrada'}
                                    </span>
                                </div>
                                <div className={styles.infoGrid}>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoEtiqueta}>Monto inicial</span>
                                        <span className={styles.infoValor}>Q{parseFloat(sesionCaja.monto_inicial).toFixed(2)}</span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoEtiqueta}>Total cobrado</span>
                                        <span className={styles.infoValor}>Q{parseFloat(balance?.total_transacciones || 0).toFixed(2)}</span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoEtiqueta}>Cobros hoy</span>
                                        <span className={styles.infoValor}>{balance?.cantidad_transacciones || 0}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Panel derecho: registrar cobro ── */}
                    <div className={styles.panel}>
                        <h2 className={styles.panelTitulo}>Registrar Cobro</h2>

                        {!sesionCaja ? (
                            <p className={styles.textoGris}>Abra la caja para registrar cobros</p>
                        ) : sesionCaja.estado !== 'abierta' ? (
                            <p className={styles.textoGris}>La caja de hoy está cerrada</p>
                        ) : (
                            <form onSubmit={registrarCobro} className={styles.formulario}>
                                {/* Método de pago */}
                                <div className={styles.campo}>
                                    <label className={styles.etiqueta}>Método de pago</label>
                                    <select
                                        value={form.tipo}
                                        onChange={e => setForm({ ...form, tipo: e.target.value })}
                                        className={styles.input}>
                                        <option value="efectivo">💵 Efectivo</option>
                                        <option value="transferencia">📲 Transferencia</option>
                                    </select>
                                </div>

                                {/* Monto */}
                                <div className={styles.campo}>
                                    <label className={styles.etiqueta}>Monto (Q)</label>
                                    <input
                                        type="number"
                                        value={form.monto}
                                        onChange={e => setForm({ ...form, monto: e.target.value })}
                                        className={styles.input}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0.01"
                                        required
                                    />
                                </div>

                                {/* Concepto */}
                                <div className={styles.campo}>
                                    <label className={styles.etiqueta}>Concepto del cobro</label>
                                    <div className={styles.conceptosGrid}>
                                        {CONCEPTOS.map(c => (
                                            <button
                                                key={c.valor}
                                                type="button"
                                                className={`${styles.conceptoBtn} ${form.concepto === c.valor ? styles.conceptoBtnActivo : ''}`}
                                                onClick={() => setForm({ ...form, concepto: c.valor })}>
                                                <span className={styles.conceptoIcono}>{c.icono}</span>
                                                <span className={styles.conceptoLabel}>{c.etiqueta}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className={styles.botonPrimario}
                                    disabled={cargando || !form.concepto || !form.monto}>
                                    {cargando ? 'Registrando...' : 'Confirmar Cobro'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {/* ── Historial de cobros del día ── */}
                {historial.length > 0 && (
                    <div className={styles.panel}>
                        <h2 className={styles.panelTitulo}>Cobros registrados hoy</h2>
                        <div className={styles.tablaContenedor}>
                            <table className={styles.tabla}>
                                <thead>
                                    <tr>
                                        <th className={styles.th}>Correlativo</th>
                                        <th className={styles.th}>Concepto</th>
                                        <th className={styles.th}>Tipo pago</th>
                                        <th className={styles.th}>Monto</th>
                                        <th className={styles.th}>Emitido por</th>
                                        <th className={styles.th}>Hora</th>
                                        <th className={styles.th}>Recibo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historial.map(t => {
                                        const ci = CONCEPTOS.find(c => c.valor === t.concepto);
                                        return (
                                            <tr key={t.id}>
                                                <td className={styles.td}>
                                                    <span className={styles.correlativo}>{t.correlativo}</span>
                                                </td>
                                                <td className={styles.td}>
                                                    {ci ? `${ci.icono} ${ci.etiqueta}` : (t.descripcion || '—')}
                                                </td>
                                                <td className={styles.td}>
                                                    <span className={`${styles.badge} ${t.tipo === 'efectivo' ? styles.badgeEfectivo : styles.badgeTransferencia}`}>
                                                        {t.tipo === 'efectivo' ? '💵 Efectivo' : '📲 Transferencia'}
                                                    </span>
                                                </td>
                                                <td className={styles.td}>
                                                    <strong>Q{parseFloat(t.monto).toFixed(2)}</strong>
                                                </td>
                                                <td className={styles.td}>
                                                    {t.nombre_usuario
                                                        ? `${t.nombre_usuario} ${t.apellido_usuario || ''}`
                                                        : '—'}
                                                </td>
                                                <td className={styles.td}>
                                                    {new Date(t.created_at).toLocaleTimeString('es-GT', {
                                                        hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </td>
                                                <td className={styles.td}>
                                                    <button
                                                        onClick={() => imprimirRecibo(t)}
                                                        className={styles.botonRecibo}>
                                                        🖨️ Recibo
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}