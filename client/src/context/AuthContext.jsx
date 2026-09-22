import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const usuarioGuardado = localStorage.getItem('pgip_usuario');
        const token = localStorage.getItem('pgip_token');
        if (usuarioGuardado && token) {
            setUsuario(JSON.parse(usuarioGuardado));
        }
        setCargando(false);
    }, []);

    const login = async (nombreUsuario, contrasena) => {
        const { data } = await api.post('/auth/login', {
            usuario: nombreUsuario,
            contrasena
        });
        localStorage.setItem('pgip_token', data.token);
        localStorage.setItem('pgip_usuario', JSON.stringify(data.usuario));
        setUsuario(data.usuario);
        return data.usuario;
    };

    const logout = () => {
        localStorage.removeItem('pgip_token');
        localStorage.removeItem('pgip_usuario');
        setUsuario(null);
    };

    return (
        <AuthContext.Provider value={{ usuario, login, logout, cargando }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}