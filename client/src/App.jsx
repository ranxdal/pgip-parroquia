import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tesoreria from './pages/Tesoreria';
import Sacrementos from './pages/Sacramentos';
import Archivo from './pages/Archivo';
import Certificados from './pages/Certificados';
import Intenciones from './pages/Intenciones';

function RutaProtegida({ children, soloAdmin = false }) {
    const { usuario, cargando } = useAuth();

    if (cargando) return <div style={{ padding: '20px' }}>Cargando...</div>;
    if (!usuario) return <Navigate to="/login" />;
    if (soloAdmin && usuario.rol !== 'admin') return <Navigate to="/tesoreria" />;

    return children;
}

export default function App() {
    const { usuario } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={
                usuario ? <Navigate to={usuario.rol === 'admin' ? '/dashboard' : '/tesoreria'} /> : <Login />
            } />

            <Route path="/dashboard" element={
                <RutaProtegida soloAdmin={true}>
                    <Dashboard />
                </RutaProtegida>
            } />

            <Route path="/tesoreria" element={
                <RutaProtegida>
                    <Tesoreria />
                </RutaProtegida>
            } />

            <Route path="/sacramentos" element={
                <RutaProtegida>
                    <Sacrementos />
                </RutaProtegida>
            } />

            <Route path="/certificados" element={
                <RutaProtegida>
                    <Certificados />
                </RutaProtegida>
            } />
            <Route path="/intenciones" element={
                <RutaProtegida>
                    <Intenciones />
                </RutaProtegida>
            } />
            <Route path="/archivo" element={
                <RutaProtegida>
                    <Archivo />
                </RutaProtegida>
            } />

            <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
    );
}