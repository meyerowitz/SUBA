import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TicketVirtual() {
  const router = useRouter();
  const { monto, unidad, fecha } = useLocalSearchParams();

  // Generamos el código una sola vez al cargar el componente
  const codigoValidacion = useMemo(() => 
    Math.random().toString(36).substring(2, 8).toUpperCase(), 
  []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#003366" barStyle="light-content" />
      
      <View style={styles.ticketCard}>
        <View style={styles.header}>
          <Ionicons name="checkmark-circle" size={80} color="#34C759" />
          <Text style={styles.statusText}>PAGO EXITOSO</Text>
          <Text style={styles.companyName}>CIUDAD GUAYANA BUS</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.details}>
          <View style={styles.row}>
            <Text style={styles.label}>Unidad:</Text>
            <Text style={styles.value}>#{unidad || '---'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Monto Pagado:</Text>
            <Text style={styles.value}>Bs. {monto || '0.00'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Fecha y Hora:</Text>
            <Text style={styles.value}>{fecha || 'Cargando...'}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.tokenLabel}>CÓDIGO DE VALIDACIÓN</Text>
          <Text style={styles.tokenValue}>{codigoValidacion}</Text>
          <Text style={styles.instruction}>Muestra esta pantalla al colector al subir</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.button} 
        onPress={() => router.replace("/pages/Pasajero/Navigation")}
      >
        <Text style={styles.buttonText}>Entendido</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#003366', justifyContent: 'center', padding: 20 },
  ticketCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center', elevation: 10 },
  header: { alignItems: 'center', marginBottom: 20 },
  statusText: { fontSize: 22, fontWeight: 'bold', color: '#34C759', marginTop: 10 },
  companyName: { fontSize: 14, color: '#666', fontWeight: '600' },
  divider: { height: 1, width: '100%', backgroundColor: '#EEE', marginVertical: 20, borderStyle: 'dashed', borderWidth: 1, borderRadius: 1 },
  details: { width: '100%', marginBottom: 30 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  label: { color: '#999', fontSize: 14 },
  value: { color: '#333', fontSize: 16, fontWeight: 'bold' },
  footer: { alignItems: 'center', backgroundColor: '#F9F9F9', padding: 15, borderRadius: 10, width: '100%' },
  tokenLabel: { fontSize: 10, color: '#999' },
  tokenValue: { fontSize: 24, fontWeight: 'bold', letterSpacing: 5, color: '#003366' },
  instruction: { fontSize: 11, color: '#666', marginTop: 10 },
  button: { marginTop: 30, backgroundColor: 'rgba(255,255,255,0.3)', padding: 18, borderRadius: 15, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});