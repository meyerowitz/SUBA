import React, { useState, useEffect } from 'react';
import { 
  Text, View, StyleSheet, TouchableOpacity, 
  ActivityIndicator, Alert 
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🔗 CONEXIÓN AL BACKEND
const API_URL = "https://subapp-api.onrender.com";

export default function ScannerQR() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!permission || !permission.granted) {
      requestPermission();
    }
  }, []);

  // --- LÓGICA DE TRANSACCIÓN VÍA BACKEND ---
  const ejecutarPagoQR = async (qrDataScaneado) => {
    setProcesando(true);

    try {
      const sessionString = await AsyncStorage.getItem('@Sesion_usuario');
      if (!sessionString) throw new Error("No hay sesión activa. Inicia sesión de nuevo.");
      const token = JSON.parse(sessionString).token;

      // 🧠 LLAMADA A LA API DE ABORDAJE (Sección 4.3 del PDF)
      // El backend recibe el ID del bus, verifica subsidios, resta el saldo y crea la transacción
      const response = await fetch(`${API_URL}/api/abordaje/pagar-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          qrData: qrDataScaneado // Enviamos la info que leímos del QR del autobús
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "No se pudo procesar el pago. Revisa tu saldo.");
      }

      // Si el pago es exitoso, el backend nos devuelve los datos del cobro para el ticket
      // data.ticket podría contener { montoCobrado, descuentoAplicado, unidad, fecha }
      
      router.replace({
        pathname: "/Components/TicketVirtual",
        params: {
          monto: data.montoCobrado || "60.00", 
          unidad: qrDataScaneado.slice(-4),
          fecha: new Date().toLocaleString(),
          conductor: "Conductor SUBA",
          descuento: data.descuentoAplicado || "Ninguno"
        }
      });

    } catch (error) {
      console.error("Error en proceso de pago:", error);
      Alert.alert("Pago Rechazado ❌", error.message);
      setScanned(false); // Permitir volver a escanear
    } finally {
      setProcesando(false);
    }
  };

  // --- DETECTOR DE QR ---
  const handleBarCodeScanned = ({ data }) => {
    if (scanned || procesando) return; 
    setScanned(true);

    const conductorID = String(data).trim();
    
    Alert.alert(
      "Confirmar Abordaje",
      `¿Deseas pagar el pasaje a la unidad ${conductorID.slice(-4)}?`,
      [
        { 
          text: "Cancelar", 
          onPress: () => setScanned(false), 
          style: "cancel" 
        },
        { 
          text: "Pagar Pasaje", 
          onPress: () => ejecutarPagoQR(conductorID) 
        }
      ]
    );
  };

  // --- RENDERIZADO DE PERMISOS ---
  if (!permission) return <View style={styles.centered}><ActivityIndicator size="large" color="#003366" /></View>;
  
  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Necesitamos acceso a la cámara para escanear el código QR del autobús.</Text>
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
      
      {procesando && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#34C759" />
          <Text style={styles.loadingText}>Procesando pago seguro...</Text>
          <Text style={styles.loadingSubText}>Verificando saldo y subsidios</Text>
        </View>
      )}

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