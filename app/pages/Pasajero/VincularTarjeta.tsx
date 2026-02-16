import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

export default function VincularTarjeta({ alCompletar }) {
  const [escaneando, setEscaneando] = useState(false);

  // Esta función es temporal, luego la cambiaremos por la lectura real del chip NFC
  const iniciarEscaneo = () => {
    setEscaneando(true);
    
    // Simulamos que tarda 3 segundos leyendo el chip
    setTimeout(() => {
      setEscaneando(false);
      Alert.alert(
        "¡Lectura Exitosa!", 
        "Hemos detectado el chip de tu tarjeta SUBA.",
        [{ text: "Genial", onPress: () => alCompletar && alCompletar() }]
      );
    }, 3000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>¡Solicitud Aprobada!</Text>
        <Text style={styles.subtitle}>Es hora de vincular tu tarjeta física.</Text>
      </View>

      <View style={styles.nfcArea}>
        <View style={[styles.circle, escaneando && styles.circleActive]}>
          <FontAwesome6 
            name={escaneando ? "nfc-symbol" : "credit-card"} 
            size={60} 
            color={escaneando ? "#023A73" : "#94A3B8"} 
          />
        </View>
        
        <Text style={styles.instructionTitle}>
          {escaneando ? "Acerca tu tarjeta..." : "Lista para vincular"}
        </Text>
        <Text style={styles.instructionText}>
          {escaneando 
            ? "Mantén la tarjeta SUBA pegada a la parte trasera de tu teléfono sin moverla." 
            : "Presiona el botón de abajo y luego acerca la tarjeta a tu celular."}
        </Text>
      </View>

      <TouchableOpacity 
        style={[styles.button, escaneando && styles.buttonDisabled]} 
        onPress={iniciarEscaneo}
        disabled={escaneando}
      >
        {escaneando ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <FontAwesome6 name="wifi" size={18} color="white" style={{ marginRight: 10 }} />
            <Text style={styles.buttonText}>Escanear Tarjeta</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 20, justifyContent: 'space-between' },
  header: { marginTop: 40, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '900', color: '#1E293B', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#64748B', textAlign: 'center' },
  nfcArea: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  circle: { width: 160, height: 160, borderRadius: 80, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#E2E8F0', marginBottom: 30 },
  circleActive: { borderColor: '#023A73', backgroundColor: '#E0F2FE' },
  instructionTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', marginBottom: 10 },
  instructionText: { fontSize: 14, color: '#64748B', textAlign: 'center', paddingHorizontal: 20, lineHeight: 22 },
  button: { backgroundColor: '#023A73', flexDirection: 'row', padding: 18, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 30, shadowColor: '#023A73', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  buttonDisabled: { backgroundColor: '#94A3B8', shadowOpacity: 0 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});