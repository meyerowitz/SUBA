import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Alert, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const BUS_ID_KEY = "@MyBusId";

// ==========================================
// 🎭 SIMULACRO DE API (POST /api/abordaje/generar-qr)
// ==========================================
const mockGenerarQRBackend = async (busId) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        // El backend genera un token seguro y temporal
        qrPayload: `suba://pay?token=${Date.now()}&driver=${busId}`,
        expiresInSeconds: 300 // 5 minutos
      });
    }, 1000);
  });
};

export default function GenerarQR() {
  const router = useRouter();
  const qrRef = useRef(); 

  const [busId, setBusId] = useState("");
  const [qrData, setQrData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [tiempoRestante, setTiempoRestante] = useState(0);

  // 1. Obtener ID del bus al cargar
  useEffect(() => {
    const init = async () => {
      const id = await AsyncStorage.getItem(BUS_ID_KEY);
      if (id) {
        setBusId(id);
        fetchNuevoQR(id);
      }
    };
    init();
  }, []);

  // 2. Pedir un nuevo QR dinámico al backend
  const fetchNuevoQR = async (idActual) => {
    setCargando(true);
    try {
      const response = await mockGenerarQRBackend(idActual);
      setQrData(response.qrPayload);
      setTiempoRestante(response.expiresInSeconds);
    } catch (error) {
      Alert.alert("Error", "No se pudo conectar con el servidor para generar el QR.");
    } finally {
      setCargando(false);
    }
  };

  // 3. Temporizador de expiración (5 minutos)
  useEffect(() => {
    if (cargando || tiempoRestante <= 0) return;

    const intervalo = setInterval(() => {
      setTiempoRestante((prev) => {
        if (prev <= 1) {
          clearInterval(intervalo);
          fetchNuevoQR(busId); // Se renueva automáticamente al llegar a 0
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalo);
  }, [cargando, tiempoRestante, busId]);

  // Formato MM:SS para la UI
  const minutos = Math.floor(tiempoRestante / 60);
  const segundos = tiempoRestante % 60;
  const tiempoFormateado = `${minutos}:${segundos < 10 ? '0' : ''}${segundos}`;

  // 4. Imprimir PDF (Con advertencia de expiración)
  const imprimirPDF = async () => {
    if (!qrData) return;

    Alert.alert(
      "Advertencia de Seguridad",
      "Este código QR es dinámico y expirará en pocos minutos. Imprimirlo en papel no es recomendable para cobros permanentes.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Imprimir de todos modos", 
          onPress: () => {
            qrRef.current.toDataURL(async (dataURL) => {
              const htmlContent = `
                <html>
                  <body style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
                    <h1 style="color: #003366;">QR DE COBRO TEMPORAL - UNIDAD #104</h1>
                    <img src="data:image/png;base64,${dataURL}" style="width: 300px; height: 300px; border: 1px solid #ccc; padding: 10px;" />
                    <p style="font-size: 20px; font-weight: bold; margin-top: 20px;">ID Operador: ${busId.slice(-8).toUpperCase()}</p>
                    <p style="color: #FF3B30; font-weight: bold;">ADVERTENCIA: Este código expira a los 5 minutos de su generación.</p>
                  </body>
                </html>
              `;
              try {
                const { uri } = await Print.printToFileAsync({ html: htmlContent });
                await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
              } catch (error) {
                Alert.alert("Error", "No se pudo generar el PDF");
              }
            });
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor='#003366' barStyle="light-content" />

      {/* Header */}
      <View style={styles.headerButtons}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.iconButton} onPress={imprimirPDF}>
          <Ionicons name="print" size={28} color="#003366" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>QR Dinámico de Cobro</Text>
        <Text style={styles.subtitle}>Muestra este código al pasajero. El código se renueva automáticamente por seguridad.</Text>

        <View style={styles.qrContainer}>
          {cargando ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#003366" />
              <Text style={{marginTop: 10, color: '#666'}}>Conectando al servidor...</Text>
            </View>
          ) : (
            <QRCode
              value={qrData || "error"}
              size={250}
              color="black"
              backgroundColor="white"
              getRef={(ref) => (qrRef.current = ref)} 
            />
          )}
        </View>

        {/* Temporizador Visual */}
        <View style={styles.timerBadge}>
          <Ionicons name="time-outline" size={18} color={tiempoRestante < 30 ? "#FF3B30" : "#003366"} />
          <Text style={[styles.timerText, { color: tiempoRestante < 30 ? "#FF3B30" : "#003366" }]}>
            Expira en: {tiempoFormateado}
          </Text>
        </View>

        <Text style={styles.busIdText}>ID Operador: {busId ? busId.slice(-8).toUpperCase() : "---"}</Text>

        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark" size={24} color="#003366" />
          <Text style={styles.infoText}>
            Validación segura encriptada por el servidor.
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
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, marginTop: -30 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#003366', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 25 },
  qrContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    minHeight: 290,
    justifyContent: 'center'
  },
  loadingBox: { alignItems: 'center', justifyContent: 'center', height: 250, width: 250 },
  
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 20,
  },
  timerText: { marginLeft: 8, fontWeight: 'bold', fontSize: 14 },
  
  busIdText: { marginTop: 15, fontSize: 16, fontWeight: 'bold', color: '#333', letterSpacing: 1 },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 51, 102, 0.1)',
    padding: 15,
    borderRadius: 12,
    marginTop: 30,
    alignItems: 'center',
  },
  infoText: { color: '#003366', fontSize: 12, marginLeft: 10, flex: 1, fontWeight: '500' },
});