import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [tema, setTema] = useState(() => {
        return localStorage.getItem('pgip_tema') || 'dark';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', tema);
        localStorage.setItem('pgip_tema', tema);
    }, [tema]);

    const toggleTema = () => setTema(t => t === 'dark' ? 'light' : 'dark');

    return (
        <ThemeContext.Provider value={{ tema, toggleTema }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}