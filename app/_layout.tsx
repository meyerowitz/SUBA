import { Stack } from "expo-router";
import * as SplashScreenNative from 'expo-splash-screen';
import { RecoveryProvider } from '@/context/RecoveryContext'; //

SplashScreenNative.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <RecoveryProvider>
      <Stack screenOptions={{ headerShown: false }}>
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
            animation: 'slide_from_right', 
          }} 
        />
        
        <Stack.Screen 
          name="SplashScreen" 
          options={{ 
            animation: 'none', 
            headerShown: false 
          }} 
        />
        
        <Stack.Screen 
          name="Register" 
          options={{ 
            animation: 'slide_from_bottom', 
            headerShown: false 
          }} 
        />

        {/* --- FLUJO DE RECUPERACIÓN --- */}
        <Stack.Screen 
          name="forgotten-password" 
          options={{ animation: 'slide_from_right', headerShown: false }} 
        />
        
        <Stack.Screen 
          name="verify-code" 
          options={{ animation: 'slide_from_right', headerShown: false }} 
        />
        
        <Stack.Screen 
          name="reset-password" 
          options={{ animation: 'slide_from_right', headerShown: false }} 
        />

        {/* --- PÁGINAS DE PASAJERO --- */}
        <Stack.Screen 
          name="pages/Pasajero/Navigation" 
          options={{ 
            animation: 'slide_from_right', 
          }} 
        />
        
        <Stack.Screen 
          name="pages/Pasajero/Profile" 
          options={{ 
            animation: 'slide_from_right', 
          }} 
        />

        <Stack.Screen 
          name="pages/Pasajero/Wallet" 
          options={{ 
            animation: 'none', 
          }} 
        />

        <Stack.Screen 
          name="Home" 
          options={{ 
            animation: 'none', 
          }} 
        />
        
        <Stack.Screen 
          name="WebMap" 
          options={{ 
            animation: 'none', 
          }} 
        />

        <Stack.Screen 
          name="pages/Pasajero/Notificaciones" 
          options={{ 
            animation: 'slide_from_right', 
          }} 
        />
        
        <Stack.Screen 
          name="pages/Pasajero/Configuracion" 
          options={{ 
            animation: 'slide_from_right', 
          }} 
        />
        
        <Stack.Screen 
          name="pages/Pasajero/Privacidad" 
          options={{ 
            animation: 'slide_from_right', 
          }} 
        />
      </Stack>
    </RecoveryProvider>
  );
}