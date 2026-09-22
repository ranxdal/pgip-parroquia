import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import jsPDF from 'jspdf';

export default function Tesoreria() {
    const { usuario, logout } = useAuth();
    const navigate = useNavigate();
    const [sesionCaja, setSesionCaja] = useState(null);
    const [balance, setBalance] = useState(null);
    const [transacciones, setTransacciones] = useState([]);
    const [form, setForm] = useState({
        tipo: 'efectivo',
        monto: '',
        descripcion: ''
    });
    const [montoInicial, setMontoInicial] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        cargarBalance();
    }, []);

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
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [80, 120]  // Formato ticket de caja
        });

        const fecha = new Date(transaccion.created_at)
            .toLocaleDateString('es-GT');
        const hora = new Date(transaccion.created_at)
            .toLocaleTimeString('es-GT');

        // Encabezado
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('PARROQUIA SAN AGUSTÍN', 40, 10, { align: 'center' });
        doc.text('DE SUMPANGO', 40, 15, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Sumpango, Sacatepéquez', 40, 20, { align: 'center' });

        // Línea separadora
        doc.setLineWidth(0.3);
        doc.line(5, 23, 75, 23);

        // Correlativo
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('RECIBO DE COBRO', 40, 29, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`No. ${transaccion.correlativo}`, 40, 34, { align: 'center' });

        // Línea separadora
        doc.line(5, 37, 75, 37);

        // Datos de la transacción
        let y = 43;
        doc.setFontSize(8);
        doc.text(`Fecha: ${fecha}`, 5, y);
        y += 6;
        doc.text(`Hora: ${hora}`, 5, y);
        y += 6;
        doc.text(`Tipo de pago: ${transaccion.tipo}`, 5, y);
        y += 6;

        if (transaccion.descripcion) {
            doc.text('Concepto:', 5, y);
            y += 5;
            const lineas = doc.splitTextToSize(transaccion.descripcion, 68);
            doc.text(lineas, 5, y);
            y += lineas.length * 5;
        }

        // Línea separadora
        doc.line(5, y + 2, 75, y + 2);
        y += 8;

        // Monto
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL:', 5, y);
        doc.text(`Q${parseFloat(transaccion.monto).toFixed(2)}`, 75, y, { align: 'right' });
        y += 8;

        // Línea separadora
        doc.setLineWidth(0.3);
        doc.line(5, y, 75, y);
        y += 6;

        // Pie del recibo
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('Gracias por su ofrenda.', 40, y, { align: 'center' });
        y += 5;
        doc.text('Que Dios le bendiga.', 40, y, { align: 'center' });
        y += 6;
        doc.text('PGIP — Sistema de Gestión Parroquial', 40, y, { align: 'center' });

        // Guardar PDF
        doc.save(`recibo_${transaccion.correlativo}.pdf`);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div style={estilos.contenedor}>
            {/* Navbar */}
            <nav style={estilos.navbar}>
                <div style={estilos.navLogo}>
                    <strong>PGIP</strong>
                    <span style={estilos.navSub}>Parroquia San Agustín</span>
                </div>
                <div style={estilos.navLinks}>
                    {usuario?.rol === 'admin' && (
                        <button onClick={() => navigate('/dashboard')}
                            style={estilos.navBtn}>Dashboard</button>
                    )}
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
                <h1 style={estilos.titulo}>Tesorería y Control de Caja</h1>

                {mensaje && (
                    <div style={estilos.exito} onClick={() => setMensaje('')}>
                        ✅ {mensaje}
                    </div>
                )}
                {error && (
                    <div style={estilos.errorDiv} onClick={() => setError('')}>
                        ❌ {error}
                    </div>
                )}

                <div style={estilos.grid}>
                    {/* Panel izquierdo — Estado de caja */}
                    <div style={estilos.panel}>
                        <h2 style={estilos.panelTitulo}>Estado de Caja</h2>

                        {!sesionCaja ? (
                            <div>
                                <p style={estilos.textoGris}>
                                    No hay caja abierta hoy
                                </p>
                                <div style={estilos.campo}>
                                    <label style={estilos.etiqueta}>
                                        Monto inicial (Q)
                                    </label>
                                    <input
                                        type="number"
                                        value={montoInicial}
                                        onChange={e => setMontoInicial(e.target.value)}
                                        style={estilos.input}
                                        placeholder="0.00"
                                    />
                                </div>
                                <button
                                    onClick={abrirCaja}
                                    style={estilos.botonPrimario}
                                    disabled={cargando}
                                >
                                    Abrir Caja del Día
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div style={estilos.estadoCaja}>
                                    <span style={{
                                        ...estilos.badge,
                                        backgroundColor: sesionCaja.estado === 'abierta'
                                            ? '#c6f6d5' : '#fed7d7',
                                        color: sesionCaja.estado === 'abierta'
                                            ? '#2f855a' : '#c53030'
                                    }}>
                                        {sesionCaja.estado === 'abierta'
                                            ? '🟢 Caja Abierta' : '🔴 Caja Cerrada'}
                                    </span>
                                </div>
                                <div style={estilos.infoGrid}>
                                    <div style={estilos.infoItem}>
                                        <span style={estilos.infoEtiqueta}>
                                            Monto inicial
                                        </span>
                                        <span style={estilos.infoValor}>
                                            Q{parseFloat(sesionCaja.monto_inicial).toFixed(2)}
                                        </span>
                                    </div>
                                    <div style={estilos.infoItem}>
                                        <span style={estilos.infoEtiqueta}>
                                            Total transacciones
                                        </span>
                                        <span style={estilos.infoValor}>
                                            Q{parseFloat(balance?.total_transacciones || 0).toFixed(2)}
                                        </span>
                                    </div>
                                    <div style={estilos.infoItem}>
                                        <span style={estilos.infoEtiqueta}>
                                            Transacciones
                                        </span>
                                        <span style={estilos.infoValor}>
                                            {balance?.cantidad_transacciones || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Panel derecho — Registrar cobro */}
                    <div style={estilos.panel}>
                        <h2 style={estilos.panelTitulo}>Registrar Cobro</h2>

                        {!sesionCaja ? (
                            <p style={estilos.textoGris}>
                                Abra la caja para registrar cobros
                            </p>
                        ) : (
                            <form onSubmit={registrarTransaccion}
                                style={estilos.formulario}>
                                <div style={estilos.campo}>
                                    <label style={estilos.etiqueta}>
                                        Tipo de pago
                                    </label>
                                    <select
                                        value={form.tipo}
                                        onChange={e => setForm({
                                            ...form, tipo: e.target.value
                                        })}
                                        style={estilos.input}
                                    >
                                        <option value="efectivo">Efectivo</option>
                                        <option value="transferencia">
                                            Transferencia
                                        </option>
                                    </select>
                                </div>

                                <div style={estilos.campo}>
                                    <label style={estilos.etiqueta}>
                                        Monto (Q)
                                    </label>
                                    <input
                                        type="number"
                                        value={form.monto}
                                        onChange={e => setForm({
                                            ...form, monto: e.target.value
                                        })}
                                        style={estilos.input}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0.01"
                                        required
                                    />
                                </div>

                                <div style={estilos.campo}>
                                    <label style={estilos.etiqueta}>
                                        Descripción
                                    </label>
                                    <input
                                        type="text"
                                        value={form.descripcion}
                                        onChange={e => setForm({
                                            ...form, descripcion: e.target.value
                                        })}
                                        style={estilos.input}
                                        placeholder="Ej: Intención de misa - Familia García"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    style={estilos.botonPrimario}
                                    disabled={cargando}
                                >
                                    {cargando ? 'Registrando...' : 'Registrar Cobro'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {/* Transacciones del día */}
                {transacciones.length > 0 && (
                    <div style={estilos.panel}>
                        <h2 style={estilos.panelTitulo}>
                            Transacciones registradas hoy
                        </h2>
                        <table style={estilos.tabla}>
                            <thead>
                                <tr>
                                    <th style={estilos.th}>Correlativo</th>
                                    <th style={estilos.th}>Tipo</th>
                                    <th style={estilos.th}>Monto</th>
                                    <th style={estilos.th}>Descripción</th>
                                    <th style={estilos.th}>Imprimir</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transacciones.map(t => (
                                    <tr key={t.id}>
                                        <td style={estilos.td}>{t.correlativo}</td>
                                        <td style={estilos.td}>{t.tipo}</td>
                                        <td style={estilos.td}>
                                            Q{parseFloat(t.monto).toFixed(2)}
                                        </td>
                                        <td style={estilos.td}>{t.descripcion}</td>
                                        <td style={estilos.td}>
                                            <button
                                                onClick={() => imprimirRecibo(t)}
                                                style={estilos.botonRecibo}>
                                                🖨️ Recibo
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

const estilos = {
    contenedor: { minHeight: '100vh', backgroundColor: '#f0f4f8' },
    navbar: {
        backgroundColor: '#1a365d', color: '#fff',
        padding: '0 24px', height: '60px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between'
    },
    navLogo: { display: 'flex', flexDirection: 'column' },
    navSub: { fontSize: '0.7rem', color: '#a0aec0' },
    navLinks: { display: 'flex', alignItems: 'center', gap: '12px' },
    navBtn: {
        backgroundColor: 'transparent', color: '#fff',
        border: '1px solid #4a6fa5', padding: '6px 12px',
        borderRadius: '6px', fontSize: '0.875rem'
    },
    navBtnRojo: {
        backgroundColor: '#c53030', color: '#fff',
        border: 'none', padding: '6px 12px',
        borderRadius: '6px', fontSize: '0.875rem'
    },
    navUsuario: { fontSize: '0.875rem', color: '#a0aec0' },
    contenido: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
    titulo: { fontSize: '1.5rem', color: '#1a365d', marginBottom: '24px' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' },
    panel: {
        backgroundColor: '#fff', padding: '24px',
        borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '0'
    },
    panelTitulo: { fontSize: '1rem', color: '#2d3748', marginBottom: '16px' },
    formulario: { display: 'flex', flexDirection: 'column', gap: '16px' },
    campo: { display: 'flex', flexDirection: 'column', gap: '6px' },
    etiqueta: { fontSize: '0.875rem', fontWeight: '600', color: '#2d3748' },
    input: {
        padding: '10px 14px', border: '1px solid #e2e8f0',
        borderRadius: '8px', fontSize: '1rem'
    },
    botonPrimario: {
        backgroundColor: '#1a365d', color: '#fff',
        padding: '12px', border: 'none',
        borderRadius: '8px', fontSize: '1rem',
        fontWeight: '600', cursor: 'pointer',
        marginTop: '8px'
    },
    botonRecibo: {
        backgroundColor: '#2f855a', color: '#fff',
        border: 'none', padding: '4px 10px',
        borderRadius: '6px', fontSize: '0.8rem',
        cursor: 'pointer'
    },
    exito: {
        backgroundColor: '#f0fff4', border: '1px solid #68d391',
        color: '#2f855a', padding: '12px 16px',
        borderRadius: '8px', marginBottom: '16px',
        cursor: 'pointer'
    },
    errorDiv: {
        backgroundColor: '#fff5f5', border: '1px solid #fc8181',
        color: '#c53030', padding: '12px 16px',
        borderRadius: '8px', marginBottom: '16px',
        cursor: 'pointer'
    },
    textoGris: { color: '#718096', fontSize: '0.875rem' },
    estadoCaja: { marginBottom: '16px' },
    badge: {
        padding: '6px 12px', borderRadius: '20px',
        fontSize: '0.875rem', fontWeight: '600'
    },
    infoGrid: { display: 'flex', flexDirection: 'column', gap: '12px' },
    infoItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    infoEtiqueta: { fontSize: '0.875rem', color: '#718096' },
    infoValor: { fontSize: '1rem', fontWeight: '600', color: '#2d3748' },
    tabla: { width: '100%', borderCollapse: 'collapse', marginTop: '12px' },
    th: {
        textAlign: 'left', padding: '10px 12px',
        backgroundColor: '#f7fafc', fontSize: '0.8rem',
        color: '#718096', borderBottom: '1px solid #e2e8f0'
    },
    td: {
        padding: '10px 12px', fontSize: '0.875rem',
        borderBottom: '1px solid #f0f4f8', color: '#2d3748'
    }
};