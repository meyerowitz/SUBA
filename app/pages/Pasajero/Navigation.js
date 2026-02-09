import * as React from 'react';
import { Text, View, StatusBar} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons'; // Para usar íconos, puedes instalar react-native-vector-icons
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import UnifiedHome from './UnifiedHome';
import WebMap from './WebMap';
import { useTheme } from '../../Components/Temas_y_colores/ThemeContext';

const Tab = createBottomTabNavigator();

// --- Componente del Navegador de Pestañas ---
function MyTabs() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // ... (tu lógica de iconos puede quedarse, no molesta) ...

        // AQUÍ EL CAMBIO PARA BORRAR LA BARRA 👇
        tabBarStyle: { display: 'none' }, // ESTO OCULTA LA BARRA COMPLETAMENTE
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={UnifiedHome} />
      
      {/* Si en el futuro quieres otra pestaña, le quitas el display: 'none'
         Pero por ahora, esto hace que se vea como una App nativa full screen.
      */}
      
    </Tab.Navigator>
  );
}

export default function Navigation() {
  return (
    <>
   <View style={{ flex: 1}}> 
      <StatusBar 
        translucent={true} 
        backgroundColor="transparent" 
        barStyle="dark-content" 
      />
        <MyTabs />
    </View>
    </>
  );
}