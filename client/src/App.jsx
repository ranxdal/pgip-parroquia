import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Hub from './pages/Hub';
import Dashboard from './pages/Dashboard';
import Tesoreria from './pages/Tesoreria';
import Sacrementos from './pages/Sacramentos';
import Archivo from './pages/Archivo';
import Certificados from './pages/Certificados';
import Intenciones from './pages/Intenciones';
import Perfil from './pages/Perfil';
import Reportes from './pages/Reportes';

function RutaProtegida({ children, soloAdmin = false }) {
    const { usuario, cargando } = useAuth();

    if (cargando) return <div style={{ padding: '20px' }}>Cargando...</div>;
    if (!usuario) return <Navigate to="/login" />;
    if (soloAdmin && usuario.rol !== 'admin') return <Navigate to="/hub" />;

    return children;
}

/* Wrapper que dispara la animación de entrada en cada cambio de ruta */
function PaginaAnimada({ children }) {
    const { pathname } = useLocation();
    return (
        <div key={pathname} className="pgip-page-transition">
            {children}
        </div>
    );
}

export default function App() {
    const { usuario } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={
                usuario ? <Navigate to="/hub" /> : <Login />
            } />

            <Route path="/hub" element={
                <RutaProtegida>
                    <PaginaAnimada><Hub /></PaginaAnimada>
                </RutaProtegida>
            } />

            <Route path="/dashboard" element={
                <RutaProtegida soloAdmin={true}>
                    <PaginaAnimada><Dashboard /></PaginaAnimada>
                </RutaProtegida>
            } />

            <Route path="/tesoreria" element={
                <RutaProtegida>
                    <PaginaAnimada><Tesoreria /></PaginaAnimada>
                </RutaProtegida>
            } />

            <Route path="/sacramentos" element={
                <RutaProtegida>
                    <PaginaAnimada><Sacrementos /></PaginaAnimada>
                </RutaProtegida>
            } />

            <Route path="/certificados" element={
                <RutaProtegida>
                    <PaginaAnimada><Certificados /></PaginaAnimada>
                </RutaProtegida>
            } />

            <Route path="/intenciones" element={
                <RutaProtegida>
                    <PaginaAnimada><Intenciones /></PaginaAnimada>
                </RutaProtegida>
            } />

            <Route path="/archivo" element={
                <RutaProtegida>
                    <PaginaAnimada><Archivo /></PaginaAnimada>
                </RutaProtegida>
            } />

            <Route path="/perfil" element={
                <RutaProtegida>
                    <PaginaAnimada><Perfil /></PaginaAnimada>
                </RutaProtegida>
            } />

            <Route path="/reportes" element={
                <RutaProtegida>
                    <PaginaAnimada><Reportes /></PaginaAnimada>
                </RutaProtegida>
            } />

            <Route path="/" element={<Navigate to={usuario ? '/hub' : '/login'} />} />
            <Route path="*" element={<Navigate to={usuario ? '/hub' : '/login'} />} />
        </Routes>
    );
}