import { useState, useEffect } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import styles from './Tesoreria.module.css';
import jsPDF from 'jspdf';

export default function Tesoreria() {
    const [sesionCaja, setSesionCaja] = useState(null);
    const [balance, setBalance] = useState(null);
    const [transacciones, setTransacciones] = useState([]);
    const [form, setForm] = useState({ tipo: 'efectivo', monto: '', descripcion: '' });
    const [montoInicial, setMontoInicial] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);

    useEffect(() => { cargarBalance(); }, []);

    const cargarBalance = async () => {
        try {
            const { data } = await api.get('/tesoreria/caja/balance');
            setBalance(data.balance);
            setSesionCaja(data.balance);
        } catch {
            setSesionCaja(null);
        }
    };

    const abrirCaja = async () => {
        if (!montoInicial) return setError('Ingrese el monto inicial');
        setCargando(true);
        try {
            const { data } = await api.post('/tesoreria/caja/abrir', {
                monto_inicial: parseFloat(montoInicial)
            });
            setSesionCaja(data.sesion);
            setMensaje('Caja abierta exitosamente');
            setMontoInicial('');
            cargarBalance();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al abrir caja');
        } finally {
            setCargando(false);
        }
    };

    const registrarTransaccion = async (e) => {
        e.preventDefault();
        if (!form.monto || !sesionCaja) return;
        setCargando(true);
        setError('');
        try {
            const { data } = await api.post('/tesoreria/transaccion', {
                sesion_caja_id: sesionCaja.id,
                tipo: form.tipo,
                monto: parseFloat(form.monto),
                descripcion: form.descripcion
            });
            setMensaje(`Transacción registrada: ${data.transaccion.correlativo}`);
            setTransacciones([data.transaccion, ...transacciones]);
            setForm({ tipo: 'efectivo', monto: '', descripcion: '' });
            cargarBalance();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al registrar');
        } finally {
            setCargando(false);
        }
    };

    const imprimirRecibo = (transaccion) => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 120] });
        const fecha = new Date(transaccion.created_at).toLocaleDateString('es-GT');
        const hora = new Date(transaccion.created_at).toLocaleTimeString('es-GT');

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('PARROQUIA SAN AGUSTÍN', 40, 10, { align: 'center' });
        doc.text('DE SUMPANGO', 40, 15, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Sumpango, Sacatepéquez', 40, 20, { align: 'center' });
        doc.setLineWidth(0.3);
        doc.line(5, 23, 75, 23);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('RECIBO DE COBRO', 40, 29, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`No. ${transaccion.correlativo}`, 40, 34, { align: 'center' });
        doc.line(5, 37, 75, 37);

        let y = 43;
        doc.text(`Fecha: ${fecha}`, 5, y); y += 6;
        doc.text(`Hora: ${hora}`, 5, y); y += 6;
        doc.text(`Tipo: ${transaccion.tipo}`, 5, y); y += 6;

        if (transaccion.descripcion) {
            doc.text('Concepto:', 5, y); y += 5;
            const lineas = doc.splitTextToSize(transaccion.descripcion, 68);
            doc.text(lineas, 5, y);
            y += lineas.length * 5;
        }

        doc.line(5, y + 2, 75, y + 2); y += 8;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL:', 5, y);
        doc.text(`Q${parseFloat(transaccion.monto).toFixed(2)}`, 75, y, { align: 'right' });
        y += 8;
        doc.line(5, y, 75, y); y += 6;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('Gracias por su ofrenda.', 40, y, { align: 'center' }); y += 5;
        doc.text('Que Dios le bendiga.', 40, y, { align: 'center' });

        doc.save(`recibo_${transaccion.correlativo}.pdf`);
    };

    return (
        <div className={styles.contenedor}>
            <Navbar />
            <div className={styles.contenido}>
                <h1 className={styles.titulo}>Tesorería y Control de Caja</h1>

                {mensaje && <div className={styles.exito} onClick={() => setMensaje('')}>✅ {mensaje}</div>}
                {error && <div className={styles.errorDiv} onClick={() => setError('')}>❌ {error}</div>}

                <div className={styles.grid}>
                    <div className={styles.panel}>
                        <h2 className={styles.panelTitulo}>Estado de Caja</h2>
                        {!sesionCaja ? (
                            <div>
                                <p className={styles.textoGris}>No hay caja abierta hoy</p>
                                <div className={styles.campo}>
                                    <label className={styles.etiqueta}>Monto inicial (Q)</label>
                                    <input type="number" value={montoInicial}
                                        onChange={e => setMontoInicial(e.target.value)}
                                        className={styles.input} placeholder="0.00" />
                                </div>
                                <button onClick={abrirCaja}
                                    className={styles.botonPrimario} disabled={cargando}>
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
                                        <span className={styles.infoEtiqueta}>Total transacciones</span>
                                        <span className={styles.infoValor}>Q{parseFloat(balance?.total_transacciones || 0).toFixed(2)}</span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoEtiqueta}>Cantidad</span>
                                        <span className={styles.infoValor}>{balance?.cantidad_transacciones || 0}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={styles.panel}>
                        <h2 className={styles.panelTitulo}>Registrar Cobro</h2>
                        {!sesionCaja ? (
                            <p className={styles.textoGris}>Abra la caja para registrar cobros</p>
                        ) : (
                            <form onSubmit={registrarTransaccion} className={styles.formulario}>
                                <div className={styles.campo}>
                                    <label className={styles.etiqueta}>Tipo de pago</label>
                                    <select value={form.tipo}
                                        onChange={e => setForm({ ...form, tipo: e.target.value })}
                                        className={styles.input}>
                                        <option value="efectivo">Efectivo</option>
                                        <option value="transferencia">Transferencia</option>
                                    </select>
                                </div>
                                <div className={styles.campo}>
                                    <label className={styles.etiqueta}>Monto (Q)</label>
                                    <input type="number" value={form.monto}
                                        onChange={e => setForm({ ...form, monto: e.target.value })}
                                        className={styles.input}
                                        placeholder="0.00" step="0.01" min="0.01" required />
                                </div>
                                <div className={styles.campo}>
                                    <label className={styles.etiqueta}>Descripción</label>
                                    <input type="text" value={form.descripcion}
                                        onChange={e => setForm({ ...form, descripcion: e.target.value })}
                                        className={styles.input}
                                        placeholder="Ej: Intención de misa - Familia García" />
                                </div>
                                <button type="submit" className={styles.botonPrimario} disabled={cargando}>
                                    {cargando ? 'Registrando...' : 'Registrar Cobro'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {transacciones.length > 0 && (
                    <div className={styles.panel}>
                        <h2 className={styles.panelTitulo}>Transacciones registradas hoy</h2>
                        <div className={styles.tablaContenedor}>
                            <table className={styles.tabla}>
                                <thead>
                                    <tr>
                                        <th className={styles.th}>Correlativo</th>
                                        <th className={styles.th}>Tipo</th>
                                        <th className={styles.th}>Monto</th>
                                        <th className={styles.th}>Descripción</th>
                                        <th className={styles.th}>Imprimir</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transacciones.map(t => (
                                        <tr key={t.id}>
                                            <td className={styles.td}>{t.correlativo}</td>
                                            <td className={styles.td}>{t.tipo}</td>
                                            <td className={styles.td}>Q{parseFloat(t.monto).toFixed(2)}</td>
                                            <td className={styles.td}>{t.descripcion}</td>
                                            <td className={styles.td}>
                                                <button onClick={() => imprimirRecibo(t)}
                                                    className={styles.botonRecibo}>
                                                    🖨️ Recibo
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}