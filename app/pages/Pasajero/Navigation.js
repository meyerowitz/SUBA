import * as React from 'react';
import { Text, View, StatusBar} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons'; // Para usar íconos, puedes instalar react-native-vector-icons
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Home from './Home';
import WebMap from './WebMap';
import { useTheme } from '../../Components/Temas_y_colores/ThemeContext';
import UnifiedHome from './UnifiedHome';
import Diamond from '../../Components/Botones_genericos/Diamond'

const Tab = createBottomTabNavigator();

// --- Componente del Navegador de Pestañas ---
function MyTabs() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme(); //temas oscuro y claro

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // Configuración de los íconos de las pestañas
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'Home') {
            // Ejemplo de ícono: 'home' o 'home-outline'
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'location' : 'location';
          } 
          // Agrega más condiciones para tus otras pestañas

          // Debes asegurarte de que Ionicons esté instalado y configurado correctamente.
          return <Ionicons name={iconName} size={30} color={color}  />; 
        },
        // Colores de los íconos y etiquetas
        tabBarActiveTintColor: theme.tabBarActiveTintColor, // El color activo puede ser el naranja de tu imagen
        tabBarInactiveTintColor: theme.tabBarInactiveTintColor,
        // Estilo de la barra de navegación inferior
        tabBarStyle: { 
          backgroundColor: theme.background, 
          height: 70 + insets.bottom, 
          paddingBottom: insets.bottom > 0 ? insets.bottom : 50,
          paddingTop: 10,
        },
        // Opciones de las pestañas
        headerShown: false, // Oculta el encabezado superior si no lo necesitas
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Map" component={UnifiedHome} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const { theme, isDark } = useTheme();
  return (
    <>
    <GestureHandlerRootView style={{ flex: 1 }}>
   <View style={{ flex: 1}}> 
     
        <MyTabs />
        <Diamond theme={theme}/>
    </View>
    </GestureHandlerRootView>
    </>
  );
}