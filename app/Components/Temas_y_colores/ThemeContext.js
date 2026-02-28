import React, { createContext, useState, useContext, useEffect } from 'react';
import { Appearance, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [themeMode, setThemeMode] = useState('system'); 
  const [loading, setLoading] = useState(true);
  
  // 💡 Guardamos el color actual del sistema de forma forzada
  const [systemColor, setSystemColor] = useState(Appearance.getColorScheme());

  // 1. Cargar la configuración elegida al abrir la app
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedMode = await AsyncStorage.getItem('@user_theme_mode');
        if (savedMode) {
          setThemeMode(savedMode);
        }
      } catch (e) {
        console.log("Error cargando el tema:", e);
      } finally {
        setLoading(false);
      }
    };
    loadTheme();
  }, []);

  // 2. EL DESPERTADOR: Obliga a la app a revisar el color cada vez que vuelves a ella
  useEffect(() => {
    // Escucha si la app está activa o en segundo plano
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // ¡Despierta y revisa! Si cambió de oscuro a claro mientras no veíamos, lo actualiza.
        setSystemColor(Appearance.getColorScheme());
      }
    });

    // Escucha los cambios normales por si acaso Android decide cooperar
    const appearanceSubscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColor(colorScheme);
    });

    return () => {
      appStateSubscription.remove();
      appearanceSubscription.remove();
    };
  }, []);

  // 3. Guardar la elección
  const changeThemeMode = async (mode) => {
    try {
      setThemeMode(mode);
      await AsyncStorage.setItem('@user_theme_mode', mode);
    } catch (e) {
      console.log("Error guardando el tema:", e);
    }
  };

  // 4. Lógica final: Si es sistema, usamos el color que "despertamos". Si no, la elección manual.
  const isDark = themeMode === 'system' ? systemColor === 'dark' : themeMode === 'dark';
  
  const theme = isDark ? darkTheme : lightTheme;

  if (loading) return null;

  return (
    <ThemeContext.Provider value={{ theme, isDark, themeMode, changeThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);