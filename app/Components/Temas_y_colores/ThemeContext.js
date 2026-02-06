
import React, { createContext, useState, useContext } from 'react';
import { useColorScheme } from 'react-native';

const lightTheme = {
  background: '#ffffffff',
  background_2: '#ffffffff',
  text: '#000000',
  text_2: '#2D3436',
  primary: "#D99015",
  primary_2: "#D99015",
  ActivityIndicator: '#0022ffff',
  volver_button: '#000000',
  barstyle:'#003366',
  barstyle_2:'#D99015',
  tabBarActiveTintColor: 'orange',
  tabBarInactiveTintColor: 'gray',
};

const darkTheme = {
  background: '#003366',
  background_2: '#2374c4',
  text: '#ffffff',
  text_2: '#ffffff',
  primary: "#D99015",
  primary_2: 'rgb(0, 200, 255)',
  ActivityIndicator: 'rgb(255, 255, 255)',
  volver_button: 'white',
  barstyle:'#003366',
  barstyle_2:'#003366',
  tabBarActiveTintColor: 'white',
  tabBarInactiveTintColor: 'rgb(0, 200, 255)',
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