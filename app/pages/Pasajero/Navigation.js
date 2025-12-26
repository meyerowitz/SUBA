import * as React from 'react';
import { Text, View, StatusBar} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons'; // Para usar íconos, puedes instalar react-native-vector-icons
import { SafeAreaView } from 'react-native-safe-area-context';

import Home from './Home';
import WebMap from './WebMap';

const Tab = createBottomTabNavigator();

// --- Componente del Navegador de Pestañas ---
function MyTabs() {
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
        tabBarActiveTintColor: 'orange', // El color activo puede ser el naranja de tu imagen
        tabBarInactiveTintColor: 'gray',
        // Estilo de la barra de navegación inferior
        tabBarStyle: { 
          backgroundColor: 'white', 
          paddingTop:20,
          height: 70, // Ajusta la altura si es necesario
          paddingBottom: 50, // Un pequeño padding en la parte inferior es común
        },
        // Opciones de las pestañas
        headerShown: false, // Oculta el encabezado superior si no lo necesitas
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Map" component={WebMap} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  return (
    <>
    <StatusBar translucent={true} backgroundColor="transparent" barStyle="dark-content"></StatusBar>
    
      <MyTabs />
      
    </>
  );
}