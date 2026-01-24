import { Stack } from "expo-router";
import * as SplashScreenNative from 'expo-splash-screen';


SplashScreenNative.preventAutoHideAsync();

export default function RootLayout() {
  return (<Stack screenOptions={{headerShown:false}}>
    {/* 1. El Index (donde está tu SplashScreen) */}
      <Stack.Screen 
        name="index" 
        options={{ 
          animation: 'none' // Animación suave para la entrada
        }} 
      />
    <Stack.Screen 
      name="Login" 
      options={{ 
        animation: 'slide_from_right', // Esta subirá como un panel
       
        }} 
      />
      <Stack.Screen 
      name="SplashScreen" 
      options={{ 
        animation: 'none', // Esta subirá como un panel
        headerShown: false 
        }} 
      />
      <Stack.Screen 
      name="Register" 
      options={{ 
        animation: 'slide_from_bottom', // Esta subirá como un panel
        headerShown: false 
        }} 
      />

      <Stack.Screen 
      name="pages/Pasajero/Navigation" 
      options={{ 
        animation: 'slide_from_right', // Esta subirá como un panel
       
        }} 
      />
       <Stack.Screen 
      name="pages/Pasajero/Profile" 
      options={{ 
        animation: 'slide_from_right', // Esta subirá como un panel
       
        }} 
      />

            <Stack.Screen 
      name="pages/Pasajero/Wallet" 
      options={{ 
        animation: 'none', // Esta subirá como un panel
       
        }} 
      />

      <Stack.Screen 
      name="pages/Conductor/Home" 
      options={{ 
        animation: 'none', // Esta subirá como un panel
       
        }} 
      />
            <Stack.Screen 
      name="pages/Pasajero/WebMap" 
      options={{ 
        animation: 'none', // Esta subirá como un panel
       
        }} 
      />

      <Stack.Screen 
      name="pages/Pasajero/Notificaciones" 
      options={{ 
        animation: 'slide_from_right', // Esta subirá como un panel
       
        }} 
      />
      <Stack.Screen 
      name="pages/Pasajero/Configuracion" 
      options={{ 
        animation: 'slide_from_right', // Esta subirá como un panel
       
        }} 
      />
      <Stack.Screen 
      name="pages/Pasajero/Privacidad" 
      options={{ 
        animation: 'slide_from_right', // Esta subirá como un panel
       
        }} 
      />
      <Stack.Screen 
      name="pages/Pasajero/CambiarContras" 
      options={{ 
        animation: 'slide_from_right', // Esta subirá como un panel
       
        }} 
      />
      <Stack.Screen
      name="pages/Pasajero/Subsidios"
      options={{ 
        animation: 'slide_from_right', // Esta subirá como un panel
       
        }} 
      />
      <Stack.Screen
      name="pages/Pasajero/Soporte"
      options={{ 
        animation: 'slide_from_right', // Esta subirá como un panel 
        }} 
      />
      
    </Stack>
    
  );
}
