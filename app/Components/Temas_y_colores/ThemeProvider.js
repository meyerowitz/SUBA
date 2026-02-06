
import React, { createContext, useState, useContext } from 'react';
import { useColorScheme } from 'react-native';

const lightTheme = {
  background: '#FFFFFF',
  text: '#000000',
  primary: '#007AFF',
};

const darkTheme = {
  background: '#121212',
  text: '#FFFFFF',
  primary: '#0A84FF',
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const deviceTheme = useColorScheme(); // Detecta el modo del sistema (iOS/Android)
  const [isDark, setIsDark] = useState(deviceTheme === 'dark');

  const theme = isDark ? darkTheme : lightTheme;

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);