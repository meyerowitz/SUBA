import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import { useRouter } from 'expo-router';

// 🔗 CONEXIÓN AL BACKEND
const API_URL = "https://subapp-api.onrender.com";

export default function VincularTarjeta() {
  const router = useRouter();
  const [escaneando, setEscaneando] = useState(false);
  const [procesando, setProcesando] = useState(false);

  // 1. Inicializamos la antena NFC al abrir la pantalla
  useEffect(() => {
    async function initNfc() {
      try {
        await NfcManager.start();
      } catch (e) {
        console.warn('Error iniciando NFC, tu dispositivo podría no soportarlo', e);
        Alert.alert("Aviso", "Tu dispositivo parece no soportar NFC o está apagado.");
      }
    }
    initNfc();

    // Limpieza segura al salir
    return () => {
      NfcManager.cancelTechnologyRequest().catch(() => 0);
    };
  }, []);

  // 2. Función Real de Lectura NFC
  const iniciarVinculacion = async () => {
    setEscaneando(true);

    try {
      // 💡 Android pide un prompt diferente, pero react-native-nfc-manager lo maneja bien
      await NfcManager.requestTechnology([NfcTech.NfcA, NfcTech.IsoDep]); 
      
      // Esperamos a que la tarjeta física toque la antena del teléfono
      const tag = await NfcManager.getTag();
      
      if (tag && tag.id) {
        const uidDetectado = tag.id.toUpperCase();
        
        // Apagamos el lector del teléfono de inmediato por seguridad
        await NfcManager.cancelTechnologyRequest();
        
        // Pasamos a procesar en nuestro servidor
        setEscaneando(false);
        guardarEnBackend(uidDetectado);
      } else {
        throw new Error("No se pudo leer el ID de la tarjeta");
      }

    } catch (ex) {
      console.warn("Lectura cancelada o fallida", ex);
      setEscaneando(false);
      NfcManager.cancelTechnologyRequest().catch(() => 0);
      Alert.alert("⚠️ Lectura Fallida", "No pudimos leer la tarjeta. Intenta acercarla nuevamente a la parte trasera de tu teléfono (cerca de la cámara).");
    }
  };

  // 3. Lógica de Base de Datos (Vía API Fastify)
  const guardarEnBackend = async (uidNfc) => {
    setProcesando(true);
    try {
      const sessionString = await AsyncStorage.getItem('@Sesion_usuario');
      if (!sessionString) throw new Error("No hay sesión activa. Inicia sesión nuevamente.");
      
      const sessionData = JSON.parse(sessionString);
      
      // 💡 Buscamos el token en diferentes niveles por si la estructura cambió
      const token = sessionData.token || (sessionData.data && sessionData.data.token);
      
      console.log("🔑 Token a enviar:", token ? "Token encontrado" : "¡TOKEN VACÍO!");

      if (!token) {
        throw new Error("No se encontró tu credencial de seguridad. Cierra sesión y vuelve a entrar.");
      }

      // 🧠 Llamada a la API de Vinculación
      const payload = {
        cardId: uidNfc // Enviamos el ID del chip físico
      };

      console.log("📤 Enviando a vincular:", payload);

      const response = await fetch(`${API_URL}/api/nfc/vincular`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // 👈 Aquí va el token
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      // Si el backend se queja, lanzamos el error para verlo
      if (!response.ok) throw new Error(data.message || data.error || "Error vinculando la tarjeta en el servidor");

      setProcesando(false);
      
      Alert.alert(
        "¡Tarjeta Vinculada! 🎉", 
        `El plástico físico (${uidNfc}) se ha conectado a tu Billetera SUBA exitosamente.`,
        [{ text: "Ver mi Billetera", onPress: () => router.back() }]
      );

    } catch (error) {
      console.log("🛑 Error de vinculación detallado:", error);
      setProcesando(false);
      Alert.alert("Error", error.message || "Hubo un problema asociando la tarjeta.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome6 name="xmark" size={24} color="#94A3B8" />
        </TouchableOpacity>
        <View style={{ width: 24 }} /> 
      </View>

      <View style={styles.contentHeader}>
        <Text style={styles.title}>¡Plástico Listo!</Text>
        <Text style={styles.subtitle}>Es hora de vincular tu nueva tarjeta física a tu billetera digital.</Text>
      </View>

      <View style={styles.nfcArea}>
        <View style={[styles.circle, (escaneando || procesando) && styles.circleActive]}>
          <FontAwesome6 
            name={procesando ? "gears" : (escaneando ? "nfc-symbol" : "credit-card")} 
            size={60} 
            color={(escaneando || procesando) ? "#023A73" : "#94A3B8"} 
          />
        </View>
        
        <Text style={styles.instructionTitle}>
          {procesando ? "Guardando datos..." : (escaneando ? "Acerca tu tarjeta..." : "Lista para vincular")}
        </Text>
        <Text style={styles.instructionText}>
          {procesando
            ? "Conectando tu chip con la base de datos de SUBA."
            : (escaneando 
                ? "Mantén la tarjeta SUBA pegada a la parte trasera de tu teléfono sin moverla." 
                : "Presiona el botón de abajo y luego acerca la tarjeta a tu celular.")}
        </Text>
      </View>

      <TouchableOpacity 
        style={[styles.button, (escaneando || procesando) && styles.buttonDisabled]} 
        onPress={iniciarVinculacion}
        disabled={escaneando || procesando}
      >
        {(escaneando || procesando) ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <FontAwesome6 name="wifi" size={18} color="white" style={{ marginRight: 10, transform: [{rotate: '90deg'}] }} />
            <Text style={styles.buttonText}>Escanear Tarjeta Real</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 20, justifyContent: 'space-between' },
  header: { marginTop: 40, flexDirection: 'row', justifyContent: 'space-between' },
  backButton: { padding: 5 },
  contentHeader: { alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '900', color: '#1E293B', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#64748B', textAlign: 'center', paddingHorizontal: 20 },
  nfcArea: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  circle: { width: 160, height: 160, borderRadius: 80, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#E2E8F0', marginBottom: 30 },
  circleActive: { borderColor: '#023A73', backgroundColor: '#E0F2FE' },
  instructionTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', marginBottom: 10 },
  instructionText: { fontSize: 14, color: '#64748B', textAlign: 'center', paddingHorizontal: 30, lineHeight: 22 },
  button: { backgroundColor: '#023A73', flexDirection: 'row', padding: 18, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 30, shadowColor: '#023A73', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  buttonDisabled: { backgroundColor: '#94A3B8', shadowOpacity: 0 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});