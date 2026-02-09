import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function ScannerQR() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();

  // --- PETICIÓN AUTOMÁTICA DE PERMISOS ---
  useEffect(() => {
    if (!permission || !permission.granted) {
      requestPermission();
    }
  }, []);

  // 1. Mientras el sistema decide o carga el estado del permiso
  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#003366" />
        <Text>Cargando cámara...</Text>
      </View>
    );
  }

  // 2. Si el usuario rechazó el permiso (le mostramos un botón para intentar de nuevo)
  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Ionicons name="camera-reverse-outline" size={60} color="#ccc" />
        <Text style={styles.errorText}>Se requiere acceso a la cámara para pagar</Text>
        <TouchableOpacity style={styles.retryButton} onPress={requestPermission}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Habilitar Cámara</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = ({ data }) => {
     const router = useRouter();
    setScanned(true);
    // data contiene el ID del conductor que pusimos en el QR
    Alert.alert(
      "Confirmar Pago",
      `¿Deseas pagar el pasaje a la unidad ID: ${data.slice(-6).toUpperCase()}?`,
      [
        { text: "Cancelar", onPress: () =>{ router.replace('/pages/Home') }, style: "cancel"},
        { 
          text: "Confirmar Pago", 
          onPress: () => {
            console.log("ID del Conductor:", data);
            router.replace({
                pathname: "/Components/TicketVirtual",
                params: {
                monto: "60", // Ejemplo: viene de tu estado global
                unidad: data.slice(-4).toUpperCase(),
                fecha: new Date().toLocaleString()
                }
            });;
          } 
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <CameraView
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Guía visual del escáner */}
      <View style={styles.overlay}>
        <View style={styles.unfocusedContainer} />
        <View style={styles.middleRow}>
          <View style={styles.unfocusedContainer} />
          <View style={styles.focusedContainer}>
             <View style={[styles.corner, { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 }]} />
             <View style={[styles.corner, { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 }]} />
             <View style={[styles.corner, { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 }]} />
             <View style={[styles.corner, { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 }]} />
          </View>
          <View style={styles.unfocusedContainer} />
        </View>
        <View style={styles.unfocusedContainer} />
      </View>

      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <Ionicons name="close-circle" size={60} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { textAlign: 'center', marginVertical: 20, color: '#666' },
  retryButton: { backgroundColor: '#003366', padding: 15, borderRadius: 10 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  unfocusedContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  middleRow: { flexDirection: 'row', height: 260 },
  focusedContainer: { width: 260, position: 'relative' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: '#34C759' },
  closeButton: { position: 'absolute', bottom: 50, alignSelf: 'center' },
});