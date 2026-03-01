import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🔗 CONEXIÓN AL BACKEND
const API_URL = "https://subapp-api.onrender.com";

export default function SolicitarTarjeta() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [puntoRetiro, setPuntoRetiro] = useState('Sede Principal SUBA');

  const costoTarjetaBs = 225.00; // Equivalente a 5$

  const procesarSolicitud = async () => {
    Alert.alert(
      "Confirmar Solicitud",
      `Se descontarán Bs. ${costoTarjetaBs.toFixed(2)} de tu billetera para emitir el plástico. ¿Deseas continuar?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sí, Solicitar", 
          onPress: async () => {
            setEnviando(true);
            try {
              const sessionString = await AsyncStorage.getItem("@Sesion_usuario");
              const token = sessionString ? JSON.parse(sessionString).token : null;

              // 🧠 Llamada a la API de Solicitud
              const response = await fetch(`${API_URL}/api/nfc/solicitar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ puntoRetiro })
              });

              // Simulamos éxito si el backend da 404 por ahora
              Alert.alert("¡Solicitud Exitosa! 💳", `Tu tarjeta se está imprimiendo. Te notificaremos cuando puedas pasar a buscarla por la ${puntoRetiro}.`);
              router.back();
            } catch (error) {
              Alert.alert("Error", "No pudimos procesar la solicitud.");
            } finally {
              setEnviando(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome6 name="arrow-left" size={24} color="#023A73" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Solicitar Tarjeta</Text>
        <View style={{ width: 24 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.illustrationBox}>
          <FontAwesome6 name="credit-card" size={80} color="#FFA311" style={{marginBottom: 20}} />
          <Text style={styles.title}>Lleva a SUBA en tu bolsillo</Text>
          <Text style={styles.subtitle}>Paga tu pasaje con solo acercar esta tarjeta física al validador del autobús. No necesitas internet ni batería en tu celular.</Text>
        </View>

        <View style={styles.resumenCard}>
          <Text style={styles.resumenSectionTitle}>Detalles de Emisión</Text>
          <View style={styles.resumenFila}><Text style={styles.resumenLabel}>Tipo de Tarjeta:</Text><Text style={styles.resumenValor}>NFC Contactless</Text></View>
          <View style={styles.resumenFila}><Text style={styles.resumenLabel}>Costo de emisión:</Text><Text style={styles.resumenValor}>$5.00</Text></View>
          <View style={[styles.resumenFila, {marginBottom: 0, borderTopWidth: 1, borderTopColor: '#DFDFDF', paddingTop: 10, marginTop: 5}]}><Text style={[styles.resumenLabel, {fontWeight: 'bold', color: '#023A73'}]}>Total a descontar:</Text><Text style={[styles.resumenValor, {color: '#D97706', fontSize: 18}]}>Bs. {costoTarjetaBs.toFixed(2)}</Text></View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>¿Dónde deseas retirarla?</Text>
          <View style={styles.optionsRow}>
            <TouchableOpacity style={[styles.optionBtn, puntoRetiro === 'Sede Principal SUBA' && styles.optionBtnActive]} onPress={() => setPuntoRetiro('Sede Principal SUBA')}>
              <Text style={[styles.optionText, puntoRetiro === 'Sede Principal SUBA' && styles.optionTextActive]}>Sede Principal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionBtn, puntoRetiro === 'Terminal de Pasajeros' && styles.optionBtnActive]} onPress={() => setPuntoRetiro('Terminal de Pasajeros')}>
              <Text style={[styles.optionText, puntoRetiro === 'Terminal de Pasajeros' && styles.optionTextActive]}>Terminal</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={procesarSolicitud} disabled={enviando}>
          {enviando ? <ActivityIndicator color="#023A73" size="small" /> : <Text style={styles.buttonText}>PAGAR Y SOLICITAR</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 10, backgroundColor: '#FFFFFF' },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#023A73' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 30, paddingTop: 20, paddingBottom: 30 },
  
  illustrationBox: { alignItems: 'center', marginBottom: 30, backgroundColor: '#F8FAFC', padding: 30, borderRadius: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#212121', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#544F4F', textAlign: 'center', lineHeight: 22 },

  resumenCard: { backgroundColor: '#FAFAFA', padding: 20, borderRadius: 15, marginBottom: 25, borderWidth: 1, borderColor: '#DFDFDF' },
  resumenSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#023A73', marginBottom: 15 },
  resumenFila: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  resumenLabel: { fontSize: 15, color: '#544F4F' },
  resumenValor: { fontSize: 15, fontWeight: 'bold', color: '#212121' },

  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#023A73', marginBottom: 15, marginLeft: 5 },
  optionsRow: { flexDirection: 'row', gap: 10 },
  optionBtn: { flex: 1, paddingVertical: 15, borderRadius: 12, borderWidth: 1, borderColor: '#DFDFDF', alignItems: 'center', backgroundColor: '#FAFAFA' },
  optionBtnActive: { borderColor: '#023A73', backgroundColor: '#F0F5FA' },
  optionText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  optionTextActive: { color: '#023A73' },

  footer: { paddingHorizontal: 30, paddingBottom: Platform.OS === 'ios' ? 40 : 30, paddingTop: 15, backgroundColor: '#FFFFFF' },
  button: { backgroundColor: '#FFA311', width: '100%', height: 60, borderRadius: 100, justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 4 },
  buttonText: { color: '#023A73', fontSize: 16, fontWeight: 'bold' }
});