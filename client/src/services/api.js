import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor para agregar el token automáticamente
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('pgip_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor para manejar errores globalmente
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('pgip_token');
            localStorage.removeItem('pgip_usuario');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;