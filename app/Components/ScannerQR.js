import React, { useState, useEffect } from 'react';
import { 
  Text, View, StyleSheet, TouchableOpacity, 
  ActivityIndicator, Alert 
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import Ionicons from 'react-native-vector-icons/Ionicons';

// IMPORTACIONES DE BASE DE DATOS
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuración de Supabase
const supabase = createClient(
  'https://wkkdynuopaaxtzbchxgv.supabase.co', 
  'sb_publishable_S18aNBlyLP3-hV_mRMcehA_zbCDMSGP'
);

export default function ScannerQR() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [procesando, setProcesando] = useState(false); // Bloqueo de UI durante la DB
  const router = useRouter();

  useEffect(() => {
    if (!permission || !permission.granted) {
      requestPermission();
    }
  }, []);

  // --- OBTENER DATOS DE SESIÓN ---
  const getSessionData = async () => {
    try {
      const session = await AsyncStorage.getItem('@Sesion_usuario');
      return session ? JSON.parse(session) : null;
    } catch (e) {
      return null;
    }
  };

  // --- LÓGICA DE TRANSACCIÓN ---
  const ejecutarPagoQR = async (conductorID, fechaEmision, fechaCaducidad, nombreConductor) => {
    setProcesando(true);
    const MONTO_PAGO = 60.00;
    const targetId = String(conductorID).trim(); // Limpiamos el ID del QR

    try {
      const session = await getSessionData();
      if (!session) throw new Error("No se encontró sesión activa. Inicia sesión de nuevo.");
      
      const myId = session._id.trim();
      const myName = session.fullName || "Usuario App";
      const referenciaUnica = `QR-${Date.now().toString().slice(-6)}`;

      // 1. OBTENER MI SALDO ACTUAL DIRECTO DE LA DB
      const { data: myData, error: myError } = await supabase
        .from('Saldo_usuarios')
        .select('saldo')
        .eq('external_user_id', myId)
        .maybeSingle();

      if (myError) throw new Error("Error al consultar tu saldo.");
      const miSaldoActual = myData ? myData.saldo : 0;

      // VALIDACIÓN DE SALDO
      if (miSaldoActual < MONTO_PAGO) {
        Alert.alert("Saldo insuficiente", `Tu saldo actual es Bs. ${miSaldoActual.toFixed(2)}. Necesitas Bs. 60.00.`);
        setScanned(false);
        return;
      }

      // 2. DESCONTAR MI SALDO
      const { error: errorResta } = await supabase
        .from('Saldo_usuarios')
        .update({ saldo: miSaldoActual - MONTO_PAGO })
        .eq('external_user_id', myId);

      if (errorResta) throw new Error("No se pudo procesar el descuento de tu cuenta.");

      // 3. SUMAR SALDO AL CONDUCTOR (UPSERT)
      const { data: destData } = await supabase
        .from('Saldo_usuarios')
        .select('saldo')
        .eq('external_user_id', targetId)
        .maybeSingle();

      const saldoActualDest = destData ? destData.saldo : 0;
      
      const { error: errorSuma } = await supabase
        .from('Saldo_usuarios')
        .upsert(
          { external_user_id: targetId, saldo: saldoActualDest + MONTO_PAGO },
          { onConflict: 'external_user_id' }
        );

      if (errorSuma) throw new Error("Error al acreditar el pago al conductor.");

      // 4. REGISTRAR HISTORIAL PARA AMBOS
      await supabase.from('validaciones_pago').insert([
        {
          external_user_id: myId,
          referencia: referenciaUnica,
          monto_informado: MONTO_PAGO,
          evidencia_url: `Pago Pasaje: ${targetId}`,
          estado: 'completado'
        },
        {
          external_user_id: targetId,
          referencia: referenciaUnica,
          monto_informado: MONTO_PAGO,
          evidencia_url: `Pasaje Recibido de: ${myName}`,
          estado: 'completado'
        }
      ]);

      // 5. TODO BIEN -> IR AL TICKET
      router.replace({
        pathname: "/Components/TicketVirtual",
        params: {
          monto: "60.00",
          unidad: targetId.slice(-4),
          fecha: fechaEmision,
          vence: fechaCaducidad,
          conductor: nombreConductor
        }
      });

    } catch (error) {
      console.error("Error en proceso de pago:", error);
      Alert.alert("Error en el pago", error.message);
      setScanned(false); // Permitir volver a escanear si falló
    } finally {
      setProcesando(false);
    }
  };

  // --- DETECTOR DE QR ---
  const handleBarCodeScanned = ({ data }) => {
    if (scanned || procesando) return; 
    setScanned(true);

    const conductorID = String(data).toUpperCase();
    const nombreConductor = "Conductor Registrado"; 
    
    // Fechas para el ticket
    const ahora = new Date();
    const fechaEmision = ahora.toLocaleString();
    const tiempoCaducidad = new Date(ahora.getTime() + 15 * 60000); 
    const fechaCaducidad = tiempoCaducidad.toLocaleString();

    Alert.alert(
      "Confirmar Pasaje",
      `¿Deseas pagar Bs. 60.00 a la unidad ${conductorID.slice(-4)}?`,
      [
        { 
          text: "Cancelar", 
          onPress: () => setScanned(false), 
          style: "cancel" 
        },
        { 
          text: "Pagar Pasaje", 
          onPress: () => ejecutarPagoQR(conductorID, fechaEmision, fechaCaducidad, nombreConductor) 
        }
      ]
    );
  };

  // --- RENDERIZADO DE PERMISOS ---
  if (!permission) return <View style={styles.centered}><ActivityIndicator size="large" color="#003366" /></View>;
  
  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Necesitamos acceso a la cámara para escanear el QR</Text>
        <TouchableOpacity style={styles.retryButton} onPress={requestPermission}>
          <Text style={{color:'white', fontWeight:'bold'}}>CONCEDER PERMISO</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* PANTALLA DE CARGA SI SE ESTÁ PROCESANDO EL DINERO */}
      {procesando && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#34C759" />
          <Text style={styles.loadingText}>Procesando pago seguro...</Text>
          <Text style={styles.loadingSubText}>No cierres la aplicación</Text>
        </View>
      )}

      {/* MARCO DEL ESCÁNER (UI) */}
      <View style={styles.overlay}>
          <View style={styles.unfocusedContainer} />
          <View style={styles.middleRow}>
            <View style={styles.unfocusedContainer} />
            <View style={styles.focusedContainer} />
            <View style={styles.unfocusedContainer} />
          </View>
          <View style={styles.unfocusedContainer} />
      </View>

      <TouchableOpacity 
        style={styles.closeButton} 
        onPress={() => router.back()}
        disabled={procesando}
      >
        <Ionicons name="close-circle" size={60} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { textAlign: 'center', marginBottom: 20, fontSize: 16, color: '#333' },
  retryButton: { backgroundColor: '#003366', padding: 15, borderRadius: 12 },
  
  // UI de Cámara
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  unfocusedContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  middleRow: { flexDirection: 'row', height: 260 },
  focusedContainer: { width: 260, borderColor: '#34C759', borderWidth: 3, borderRadius: 20 },
  closeButton: { position: 'absolute', bottom: 50, alignSelf: 'center' },

  // Overlay de carga
  loadingOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0,0,0,0.85)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 100 
  },
  loadingText: { color: 'white', marginTop: 15, fontSize: 18, fontWeight: 'bold' },
  loadingSubText: { color: '#BDC3C7', marginTop: 5, fontSize: 12 }
});