import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

// 💡 1. IMPORTAMOS NUESTRO CENTRO DE CONTROL MAGICO
import { MOCK_BACKEND } from '../../../lib/SimuladorBackend';
import BilleteraCentral from './BilleteraCentral'; 

export default function MiTarjetaHub() {
  const router = useRouter();

  // 💡 2. LEEMOS EL ESTADO DIRECTAMENTE DEL SIMULADOR
  // Ya no necesitamos "AsyncStorage" ni pantallas de carga
  const perfilCompletado = MOCK_BACKEND.perfil_completado;

  // ==========================================
  // NIVEL 1: EL EXPLORADOR (No ha hecho el KYC)
  // ==========================================
  if (!perfilCompletado) {
    return (
      <View style={styles.containerCenter}>
        <View style={styles.iconCircleBig}>
          <FontAwesome6 name="wallet" size={50} color="#023A73" />
        </View>
        <Text style={styles.title}>Billetera Digital SUBA</Text>
        <Text style={styles.subtitle}>
          Para poder recargar saldo, pagar tu pasaje con código QR y acceder a subsidios, primero debes habilitar tu billetera.
        </Text>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => router.push('/pages/Pasajero/FormularioPerfil')} 
        >
          <Text style={styles.primaryButtonText}>Habilitar Mi Billetera (Gratis)</Text>
          <FontAwesome6 name="arrow-right" size={16} color="white" />
        </TouchableOpacity>
      </View>
    );
  }

  // ==========================================
  // NIVEL 2 y 3: EL PASAJERO DIGITAL
  // ==========================================
  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <BilleteraCentral />
    </View>
  );
}

const styles = StyleSheet.create({
  containerCenter: { flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', padding: 30 },
  iconCircleBig: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0F172A', marginBottom: 15, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#64748B', textAlign: 'center', marginBottom: 35, lineHeight: 24 },
  primaryButton: { flexDirection: 'row', backgroundColor: '#0284C7', paddingVertical: 18, paddingHorizontal: 25, borderRadius: 100, alignItems: 'center', gap: 15, elevation: 5, shadowColor: '#0284C7', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 8 },
  primaryButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});