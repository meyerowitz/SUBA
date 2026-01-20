import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import AsyncStorage from "@react-native-async-storage/async-storage";
// Importaciones de Expo
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const BUS_ID_KEY = "@MyBusId";

export default function GenerarQR() {
  const [busId, setBusId] = useState("");
  const router = useRouter();
  const qrRef = useRef(); // Referencia para obtener la imagen del QR

  useEffect(() => {
    const getBusId = async () => {
      const id = await AsyncStorage.getItem(BUS_ID_KEY);
      if (id) setBusId(id);
    };
    getBusId();
  }, []);

  // Función para imprimir / Crear PDF
  const imprimirPDF = async () => {
    if (!busId) return;

    // 1. Obtener la imagen base64 del QR desde el componente
    qrRef.current.toDataURL(async (dataURL) => {
      const htmlContent = `
        <html>
          <body style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
            <h1 style="color: #003366;">QR DE COBRO - UNIDAD #104</h1>
            <img src="data:image/png;base64,${dataURL}" style="width: 300px; height: 300px; border: 1px solid #ccc; padding: 10px;" />
            <p style="font-size: 20px; font-weight: bold; margin-top: 20px;">ID Operador: ${busId.slice(-8).toUpperCase()}</p>
            <p style="color: #666;">Escanee para realizar el pago del pasaje</p>
          </body>
        </html>
      `;

      try {
        // 2. Generar el PDF y abrir el diálogo de impresión
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      } catch (error) {
        Alert.alert("Error", "No se pudo generar el PDF");
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor='#003366' barStyle="light-content" />

      {/* Header con Botón Volver e Imprimir */}
      <View style={styles.headerButtons}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.iconButton} onPress={imprimirPDF}>
          <Ionicons name="print" size={28} color="#003366" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Mi QR de Cobro</Text>
        <Text style={styles.subtitle}>Muestra este código al pasajero para recibir el pago</Text>

        <View style={styles.qrContainer}>
          {busId ? (
            <QRCode
              value={busId}
              size={250}
              color="black"
              backgroundColor="white"
              getRef={(ref) => (qrRef.current = ref)} // Asignar referencia
            />
          ) : (
            <Text>Generando ID...</Text>
          )}
        </View>

        <Text style={styles.busIdText}>ID Operador: {busId.slice(-8).toUpperCase()}</Text>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#003366" />
          <Text style={styles.infoText}>
            Este código vincula el pago directamente a tu cuenta de conductor.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FA' },
  headerButtons: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 10
  },
  iconButton: { padding: 10 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, marginTop: -50 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#003366', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 40 },
  qrContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  busIdText: { marginTop: 20, fontSize: 16, fontWeight: 'bold', color: '#333', letterSpacing: 1 },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 12,
    marginTop: 40,
    alignItems: 'center',
  },
  infoText: { color: '#003366', fontSize: 12, marginLeft: 10, flex: 1 },
});