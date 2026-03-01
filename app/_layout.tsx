import { Stack } from "expo-router";
import * as SplashScreenNative from "expo-splash-screen";
import { ThemeProvider } from './Components/Temas_y_colores/ThemeContext';
import { RecoveryProvider } from '@/context/RecoveryContext';
SplashScreenNative.preventAutoHideAsync();
import './Components/i18n/i18n';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RecoveryProvider> 
        <Stack screenOptions={{ headerShown: false }}>
          {/* Pantallas Principales */}
          <Stack.Screen name="index" options={{ animation: "none" }} />
          <Stack.Screen name="Login" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="SplashScreen" options={{ animation: "none", headerShown: false }} />
          <Stack.Screen name="Register" options={{ animation: "slide_from_bottom", headerShown: false }} />

          {/* --- FLUJO DE RECUPERACIÓN (Pantallas Nuevas) --- */}
          <Stack.Screen name="pages/olvide_contrasena/forgotten-password" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="pages/olvide_contrasena/verify-code" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="pages/olvide_contrasena/reset-password" options={{ animation: 'slide_from_right' }} />

          {/* --- PÁGINAS DE PASAJERO --- */}
          <Stack.Screen name="pages/Pasajero/Navigation" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="pages/Pasajero/Profile" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="pages/Pasajero/Wallet" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="pages/Conductor/Home" options={{ animation: 'none' }} /> 
          <Stack.Screen name="pages/Pasajero/WebMap" options={{ animation: 'none' }} /> 
          <Stack.Screen name="pages/Pasajero/UnifiedHome" options={{ animation: 'none' }} />
          <Stack.Screen name="pages/Pasajero/Notificaciones" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="pages/Pasajero/Configuracion" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="pages/Pasajero/Privacidad" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="pages/Pasajero/CambiarContras" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="pages/Pasajero/Subsidios" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="pages/Pasajero/Soporte" options={{ animation: 'slide_from_right' }} />

          {/* --- PÁGINAS DE CONDUCTOR --- */}
          <Stack.Screen name="pages/Conductor/Home2" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="pages/Conductor/Profile" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="pages/Conductor/Configuracion" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="pages/Conductor/Historial" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="pages/Conductor/Notificaciones" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="pages/Conductor/Privacidad" options={{ animation: "slide_from_right" }} />

          {/* --- COMPONENTES ADICIONALES --- */}
          <Stack.Screen name="Components/ScannerQR" options={{ animation: "slide_from_bottom" }} />
          <Stack.Screen name="Components/GenerarQR" options={{ animation: "slide_from_bottom" }} />
          <Stack.Screen name="Components/TicketVirtual" options={{ animation: "slide_from_bottom" }} />
          <Stack.Screen name="Components/PaymentNFC" options={{ animation: "slide_from_bottom" }} />
        </Stack>
      </RecoveryProvider>
    </ThemeProvider>
  );
}