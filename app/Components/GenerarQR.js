import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Alert, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const BUS_ID_KEY = "@Sesion_usuario";

export default function GenerarQR() {
  const [busId, setBusId] = useState("");
  const [conductorInfo, setConductorInfo] = useState({ id: "", email: "", fullName: "" });
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  const qrRef = useRef();

  useEffect(() => {
    const cargarDatosConductor = async () => {
      try {
        const sesionString = await AsyncStorage.getItem(BUS_ID_KEY);
        if (sesionString) {
          const sesionObjeto = JSON.parse(sesionString);
          
          // Extraemos los datos específicos
          const id = sesionObjeto.id || "";
          const email = sesionObjeto.email || "No disponible";
          const fullName = sesionObjeto.fullName || "Conductor";

          setBusId(id);
          setConductorInfo({ id, email, fullName });
        }
      } catch (error) {
        console.error("Error al cargar sesión:", error);
        Alert.alert("Error", "No se pudo cargar la información del conductor");
      } finally {
        setLoading(false);
      }
    };
    cargarDatosConductor();
  }, []);

  const imprimirPDF = async () => {
    if (!busId) return;

    // Obtenemos la imagen base64 del QR
    qrRef.current.toDataURL(async (dataURL) => {
      const htmlContent = `
        <html>
          <body style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: 'Helvetica', sans-serif; text-align: center;">
            <div style="border: 2px solid #003366; padding: 40px; border-radius: 20px;">
              <h1 style="color: #003366; font-size: 40px; margin-bottom: 10px;">PAGO RÁPIDO</h1>
              <h2 style="color: #333; font-size: 28px; margin-top: 0;">${conductorInfo.fullName.toUpperCase()}</h2>
              
              <img src="data:image/png;base64,${dataURL}" style="width: 350px; height: 350px; margin: 20px 0;" />
              
              <div style="background-color: #f4f7fa; padding: 20px; border-radius: 10px; margin-top: 20px;">
                <p style="font-size: 24px; margin: 5px 0;"><strong>ID Operador:</strong> ${busId.substring(0, 8).toUpperCase()}</p>
                <p style="font-size: 18px; color: #666; margin: 5px 0;">${conductorInfo.email}</p>
              </div>
              
              <p style="color: #003366; font-size: 18px; margin-top: 30px; font-weight: bold;">Escanea para pagar tu pasaje</p>
            </div>
          </body>
        </html>
      `;

      try {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      } catch (error) {
        Alert.alert("Error", "No se pudo generar el archivo de impresión");
      }
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#003366" />
      </View>
    );
  }

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
        <Text style={styles.title}>Mi QR de Cobro</Text>
        <Text style={styles.subtitle}>
          Hola, <Text style={{fontWeight: 'bold'}}>{conductorInfo.fullName}</Text>. 
          Muestra este código para recibir pagos.
        </Text>

        <View style={styles.qrContainer}>
          {busId ? (
            <QRCode
              // El QR ahora contiene el objeto JSON con ID, Email y Nombre
              value={JSON.stringify(conductorInfo)}
              size={250}
              color="black"
              backgroundColor="white"
              getRef={(ref) => (qrRef.current = ref)}
            />
          ) : (
            <Text>ID no encontrado</Text>
          )}
        </View>

        {/* Aquí reflejamos solo los primeros 8 dígitos */}
        <Text style={styles.busIdText}>ID: {busId.substring(0, 8).toUpperCase()}</Text>
        <Text style={styles.emailText}>{conductorInfo.email}</Text>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#003366" />
          <Text style={styles.infoText}>
            Este código contiene tu información verificada para transferencias seguras.
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
    paddingHorizontal: 15,
    paddingTop: 10
  },
  iconButton: { 
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2 
  },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, marginTop: -30 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#003366', marginBottom: 5 },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 35, lineHeight: 20 },
  qrContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 25,
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  busIdText: { marginTop: 25, fontSize: 20, fontWeight: 'bold', color: '#333', letterSpacing: 2 },
  emailText: { fontSize: 14, color: '#888', marginTop: 5 },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 15,
    marginTop: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBE1FA'
  },
  infoText: { color: '#003366', fontSize: 13, marginLeft: 10, flex: 1, lineHeight: 18 },
});