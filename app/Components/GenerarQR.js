import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Alert, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useRouter } from 'expo-router';
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const BUS_ID_KEY = "@Sesion_usuario";

export default function GenerarQR() {
  const router = useRouter();
  const qrRef = useRef();

  const [busId, setBusId] = useState("");
  const [conductorInfo, setConductorInfo] = useState({ id: "", email: "", fullName: "" });
  const [loading, setLoading] = useState(true);

  // 1. Obtener ID del bus al cargar
  useEffect(() => {
    const cargarDatosConductor = async () => {
      try {
        const sesionString = await AsyncStorage.getItem(BUS_ID_KEY);
        if (sesionString) {
          const sesionObjeto = JSON.parse(sesionString);
          
          // Extraemos los datos específicos
          const id = sesionObjeto.id || sesionObjeto._id || "";
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
    if (!qrRef.current) return;

    qrRef.current.toDataURL(async (dataURL) => {
      const htmlContent = `
        <html>
          <body style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: 'Helvetica', sans-serif; text-align: center;">
            <div style="border: 4px solid #023A73; padding: 40px; border-radius: 20px;">
              <h1 style="color: #FFA311; font-size: 40px; margin-bottom: 10px; background-color: #023A73; padding: 10px 20px; border-radius: 10px;">SUBA PAGO RÁPIDO</h1>
              <h2 style="color: #333; font-size: 28px; margin-top: 15px;">${conductorInfo.fullName.toUpperCase()}</h2>
              
              <img src="data:image/png;base64,${dataURL}" style="width: 350px; height: 350px; margin: 20px 0;" />
              
              <div style="background-color: #F0F5FA; padding: 20px; border-radius: 10px; margin-top: 20px;">
                <p style="font-size: 24px; margin: 5px 0; color: #023A73;"><strong>UNIDAD:</strong> ${busId.substring(0, 8).toUpperCase()}</p>
                <p style="font-size: 18px; color: #64748B; margin: 5px 0;">${conductorInfo.email}</p>
              </div>
              
              <p style="color: #023A73; font-size: 22px; margin-top: 30px; font-weight: bold;">Escanea para pagar tu pasaje</p>
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
        <ActivityIndicator size="large" color="#023A73" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor='#F4F7FA' barStyle="dark-content" />

      {/* Header */}
      <View style={styles.headerButtons}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <FontAwesome6 name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.iconButton} onPress={imprimirPDF}>
          <FontAwesome6 name="print" size={24} color="#023A73" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Mi QR de Cobro</Text>
        <Text style={styles.subtitle}>
          Hola, <Text style={{fontWeight: 'bold', color: '#0F172A'}}>{conductorInfo.fullName}</Text>. 
          Muestra o imprime este código para recibir pagos de pasaje.
        </Text>

        <View style={styles.qrContainer}>
          {busId ? (
            <QRCode
              value={busId} // 💡 AHORA PASAMOS EL ID LIMPIO PARA QUE EL ESCÁNER LO LEA BIEN
              size={250}
              color="#0F172A"
              backgroundColor="white"
              getRef={(ref) => (qrRef.current = ref)}
            />
          ) : (
            <Text>ID no encontrado</Text>
          )}
        </View>

        <Text style={styles.busIdText}>UNIDAD: {busId.substring(0, 8).toUpperCase()}</Text>
        <Text style={styles.emailText}>{conductorInfo.email}</Text>

        <View style={styles.infoBox}>
          <FontAwesome6 name="shield-halved" size={20} color="#023A73" />
          <Text style={styles.infoText}>
            Este código enlaza directamente a tu cuenta de operador para recibir cobros seguros de SUBA.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerButtons: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15
  },
  iconButton: { 
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 14,
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3 
  },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, marginTop: -30 },
  title: { fontSize: 28, fontWeight: '900', color: '#023A73', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', marginBottom: 35, lineHeight: 22 },
  qrContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#023A73',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
  },
  busIdText: { marginTop: 25, fontSize: 20, fontWeight: '800', color: '#1E293B', letterSpacing: 2 },
  emailText: { fontSize: 14, color: '#64748B', marginTop: 5, fontWeight: '500' },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    padding: 15,
    borderRadius: 16,
    marginTop: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD'
  },
  infoText: { color: '#0369A1', fontSize: 13, marginLeft: 12, flex: 1, lineHeight: 20, fontWeight: '500' },
});