import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function ScannerQR() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!permission || !permission.granted) {
      requestPermission();
    }
  }, []);

  const handleBarCodeScanned = ({ data }) => {
    if (scanned) return; 
    setScanned(true);

    // 1. Datos del Conductor (Simulados a partir del ID del QR)
    const conductorID = data.toUpperCase();
    const nombreConductor = "Juan Pérez"; // Aquí podrías hacer un fetch con el ID

    // 2. Manejo de Fechas
    const ahora = new Date();
    const fechaEmision = ahora.toLocaleString();
    
    // Fecha de caducidad (ejemplo: +24 horas)
    const caducidad = new Date(ahora);
    caducidad.setHours(ahora.getHours() + 24);
    const tiempoCaducidad = new Date(ahora.getTime() + 15 * 60000); 
    const fechaCaducidad = tiempoCaducidad.toLocaleString();

    // 3. Alerta con toda la información solicitada
   Alert.alert(
      "Confirmar Pago",
      `Detalles del Ticket:\n\n` +
      `🆔 ID Conductor: ${conductorID}\n` +
      `📅 Emisión: ${fechaEmision}\n` +
      `⏳ Caduca a las: ${fechaCaducidad}\n\n` +
      `¿Deseas proceder con el pago de Bs. 60.00?`,
      [
        { text: "Cancelar", onPress: () => setScanned(false), style: "cancel" },
        { 
          text: "Confirmar Pago", 
          onPress: () => {
            router.replace({
              pathname: "/Components/TicketVirtual",
              params: {
                monto: "60.00",
                unidad: conductorID.slice(-4),
                fecha: fechaEmision,
                vence: fechaCaducidad,
                conductor: nombreConductor
              }
            });
          } 
        }
      ]
    );
  };

  // ... (Mismo código de permisos y retorno de cámara que antes)
  if (!permission) return <View style={styles.centered}><ActivityIndicator size="large" color="#003366" /></View>;
  if (!permission.granted) return (
    <View style={styles.centered}>
      <Text style={styles.errorText}>Sin acceso a cámara</Text>
      <TouchableOpacity style={styles.retryButton} onPress={requestPermission}><Text style={{color:'white'}}>Reintentar</Text></TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <CameraView
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.overlay}>
         <View style={styles.unfocusedContainer} />
         <View style={styles.middleRow}>
           <View style={styles.unfocusedContainer} /><View style={styles.focusedContainer} /><View style={styles.unfocusedContainer} />
         </View>
         <View style={styles.unfocusedContainer} />
      </View>
      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <Ionicons name="close-circle" size={60} color="white" />
      </TouchableOpacity>
    </View>
  );
}

// ... (Estilos iguales al ejemplo anterior)
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { marginBottom: 20 },
    retryButton: { backgroundColor: '#003366', padding: 15, borderRadius: 10 },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    unfocusedContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
    middleRow: { flexDirection: 'row', height: 260 },
    focusedContainer: { width: 260, borderColor: '#34C759', borderWidth: 2, borderRadius: 10 },
    closeButton: { position: 'absolute', bottom: 50, alignSelf: 'center' },
});