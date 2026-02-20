import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import Ionicons from 'react-native-vector-icons/Ionicons';

// 💡 IMPORTAMOS NUESTRO SIMULADOR (Que representa la API de Fastify)
import { MOCK_BACKEND } from '../../lib/SimuladorBackend';

// ==========================================
// 🎭 SIMULACRO DE API (POST /api/abordaje/pagar-qr)
// ==========================================
const mockPagarQR = async (datosQR) => {
  return new Promise((resolve, reject) => {
    console.log("Enviando QR escaneado al Backend (Fastify):", datosQR);
    setTimeout(() => {
      // Simulamos que el backend procesó el pago, aplicó descuentos y respondió con éxito
      resolve({ 
        success: true, 
        montoCobrado: 60.00, // El backend decide cuánto cobrar
        conductor: "Unidad SUBA-01",
        mensaje: "Pago aprobado"
      });
    }, 2000);
  });
};

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

  // --- LÓGICA DE TRANSACCIÓN SEGURA (Vía API) ---
  const ejecutarPagoQR = async (datosEscaneados) => {
    setProcesando(true);

    try {
      // 🧠 1. PAYLOAD CORRECTO: Solo enviamos el contenido del QR al Backend
      // El Backend es quien desencripta esto, sabe quién es el chofer y cobra.
      const payload = {
        qrData: datosEscaneados,
        metodo: "camara_celular"
      };

      // 2. Enviamos a la API
      const respuestaBackend = await mockPagarQR(payload);

      // 3. Éxito: Mostramos comprobante y devolvemos al usuario
      Alert.alert(
        "¡Viaje Pagado! 🚌",
        `Se han descontado Bs. ${respuestaBackend.montoCobrado.toFixed(2)} de tu billetera.\nDestino: ${respuestaBackend.conductor}`,
        [{ text: "Buen viaje", onPress: () => router.back() }]
      );

    } catch (error) {
      console.error("Error en proceso de pago:", error);
      Alert.alert("Error de Pago", "No se pudo procesar el código QR. Intenta de nuevo.");
      setScanned(false); // Reiniciamos el escáner para que intente otra vez
    } finally {
      setProcesando(false);
    }
  };

  // --- DETECTOR DE QR ---
  const handleBarCodeScanned = ({ data }) => {
    if (scanned || procesando) return; 
    setScanned(true); // Bloqueamos la cámara para que no escanee 100 veces por segundo

    Alert.alert(
      "QR Detectado",
      "¿Deseas procesar el pago para abordar esta unidad?",
      [
        { 
          text: "Cancelar", 
          onPress: () => setScanned(false), 
          style: "cancel" 
        },
        { 
          text: "Pagar Pasaje", 
          onPress: () => ejecutarPagoQR(data) 
        }
      ]
    );
  };

  // --- RENDERIZADO DE PERMISOS ---
  if (!permission) return <View style={styles.centered}><ActivityIndicator size="large" color="#003366" /></View>;
  
  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Necesitamos acceso a la cámara para escanear el QR del pasaje.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={requestPermission}>
          <Text style={{color:'white', fontWeight:'bold'}}>CONCEDER PERMISO</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- INTERFAZ ORIGINAL (Intacta porque estaba perfecta) ---
  return (
    <View style={styles.container}>
      <CameraView
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* PANTALLA DE CARGA */}
      {procesando && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#34C759" />
          <Text style={styles.loadingText}>Verificando y pagando...</Text>
          <Text style={styles.loadingSubText}>Conectando con el servidor seguro</Text>
        </View>
      )}

      {/* MARCO DEL ESCÁNER */}
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
        <Ionicons name="close-circle" size={60} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { textAlign: 'center', marginBottom: 20, fontSize: 16, color: '#333' },
  retryButton: { backgroundColor: '#023A73', padding: 15, borderRadius: 12 },
  
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