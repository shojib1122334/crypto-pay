import React, { useEffect, useState } from 'react';
import { ThemeContext, type ThemeMode } from './themeContextDef';

const THEME_STORAGE_KEY = 'cryptopay_app_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme] = useState<ThemeMode>('light');

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
    body.classList.remove('dark');
    body.classList.add('light');

    try {
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }, []);

  const setTheme = () => {
    // Light mode only
  };

  const toggleTheme = () => {
    // Light mode only
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

