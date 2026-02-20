import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useRouter } from 'expo-router';

// 💡 IMPORTAMOS EL SIMULADOR PARA LEER EL SALDO ACTUAL
import { MOCK_BACKEND } from '../../../lib/SimuladorBackend';

// ==========================================
// 🎭 SIMULACRO DE API (Endpoint /api/billetera/transferir)
// ==========================================
const mockTransferirP2P = async (datosTransferencia) => {
  return new Promise((resolve) => {
    console.log("Enviando transferencia al backend:", datosTransferencia);
    setTimeout(() => {
      resolve({ success: true });
    }, 1500);
  });
};

export default function TransferirSaldo() {
  const router = useRouter();
  
  // Leemos el saldo real del simulador
  const saldoDisponible = MOCK_BACKEND.saldo;

  // --- ESTADOS ---
  const [email, setEmail] = useState('');
  const [rawMonto, setRawMonto] = useState('0'); // Lógica de teclado bancario
  const [enviando, setEnviando] = useState(false);

  // --- LÓGICA DE TECLADO BANCARIO ---
  const handleMontoChange = (text) => {
    const soloNumeros = text.replace(/[^0-9]/g, '');
    setRawMonto(soloNumeros === '' ? '0' : soloNumeros);
  };

  const montoFormateado = (parseInt(rawMonto || '0', 10) / 100).toFixed(2);
  const montoNumerico = parseFloat(montoFormateado);

  // --- PROCESAR TRANSFERENCIA ---
  const procesarTransferencia = async () => {
    if (!email) {
      Alert.alert("Falta el destinatario", "Por favor ingresa el correo electrónico del pasajero.");
      return;
    }
    if (!email.includes('@')) {
      Alert.alert("Correo inválido", "Asegúrate de escribir un correo electrónico válido.");
      return;
    }
    if (montoNumerico <= 0) {
      Alert.alert("Monto inválido", "El monto a transferir debe ser mayor a Bs. 0.00.");
      return;
    }
    if (montoNumerico > saldoDisponible) {
      Alert.alert("Saldo insuficiente", `No puedes enviar más de los Bs. ${saldoDisponible.toFixed(2)} que tienes en tu billetera.`);
      return;
    }

    setEnviando(true);
    try {
      // 🧠 Payload exacto que pide el backend para Transferencia P2P
      const payload = {
        destinatarioEmail: email.trim().toLowerCase(),
        monto: montoNumerico
      };

      await mockTransferirP2P(payload);
      
      Alert.alert(
        "¡Transferencia Exitosa! 💸", 
        `Has enviado Bs. ${montoNumerico.toFixed(2)} a ${payload.destinatarioEmail}.`, 
        [{ text: "Volver a Billetera", onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert("Error", "No se pudo realizar la transferencia. Verifica el correo e intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        
        {/* --- ENCABEZADO PEGAJOSO --- */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome6 name="arrow-left" size={24} color="#023A73" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transferir Saldo</Text>
          <View style={{ width: 24 }} /> 
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          {/* --- TARJETA DE SALDO PREMIUM (Azul SUBA) --- */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <FontAwesome6 name="wallet" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={styles.balanceTitle}>Saldo Disponible</Text>
            </View>
            <Text style={styles.balanceAmount}>Bs. {saldoDisponible.toFixed(2)}</Text>
            <Text style={styles.balanceInfo}>Solo puedes enviar hasta este monto.</Text>
          </View>

          <Text style={styles.title}>Datos del Destinatario</Text>
          <Text style={styles.subtitle}>Envía saldo instantáneo a cualquier otro pasajero de SUBA.</Text>

          {/* --- FORMULARIO --- */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo Electrónico</Text>
            <View style={styles.emailContainer}>
              <View style={styles.iconPrefix}>
                <FontAwesome6 name="at" size={16} color="#023A73" />
              </View>
              <TextInput 
                style={styles.emailInput} 
                placeholder="ejemplo@correo.com" 
                keyboardType="email-address" 
                autoCapitalize="none"
                value={email} 
                onChangeText={setEmail} 
              />
            </View>
            <Text style={styles.helperText}>El usuario debe estar registrado en la aplicación.</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Monto a Enviar</Text>
            <View style={styles.montoContainer}>
              <View style={styles.currencyPrefix}>
                <Text style={styles.currencyPrefixText}>Bs.</Text>
              </View>
              <TextInput 
                style={styles.montoInput} 
                keyboardType="numeric" 
                value={montoFormateado} 
                onChangeText={handleMontoChange} 
                maxLength={10}
              />
            </View>
          </View>

        </ScrollView>

        {/* --- BOTÓN INFERIOR --- */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.button} onPress={procesarTransferencia} disabled={enviando}>
            {enviando ? (
              <ActivityIndicator color="#023A73" size="small" />
            ) : (
              <Text style={styles.buttonText}>TRANSFERIR DINERO</Text>
            )}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 10, backgroundColor: '#FFFFFF', zIndex: 10 },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#023A73' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 30, paddingTop: 20, paddingBottom: 30 },
  
  // 💡 TARJETA AZUL PREMIUM PARA EL SALDO
  balanceCard: { backgroundColor: '#023A73', borderRadius: 20, padding: 25, marginBottom: 30, shadowColor: '#023A73', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8, alignItems: 'center' },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  balanceTitle: { fontSize: 14, fontWeight: '600', color: 'rgba(255, 255, 255, 0.7)', marginLeft: 8, textTransform: 'uppercase', letterSpacing: 1 },
  balanceAmount: { fontSize: 36, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  balanceInfo: { fontSize: 13, color: '#FFA311', fontWeight: '500' },

  title: { fontSize: 24, fontWeight: 'bold', color: '#212121', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 15, color: '#544F4F', textAlign: 'center', marginBottom: 25, lineHeight: 22 },

  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#023A73', marginBottom: 8, marginLeft: 5 },
  helperText: { fontSize: 13, color: '#999', marginTop: 5, marginLeft: 5 },
  
  // 💡 ESTILOS DE INPUTS (Unificados con el resto de la app)
  emailContainer: { flexDirection: 'row', height: 60, borderWidth: 1, borderColor: '#DFDFDF', borderRadius: 15, backgroundColor: '#FAFAFA', overflow: 'hidden' },
  iconPrefix: { width: 50, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#DFDFDF', backgroundColor: '#F0F5FA' },
  emailInput: { flex: 1, paddingHorizontal: 15, fontSize: 16, color: '#212121' },

  montoContainer: { flexDirection: 'row', height: 60, borderWidth: 1, borderColor: '#DFDFDF', borderRadius: 15, backgroundColor: '#FAFAFA', overflow: 'hidden' },
  currencyPrefix: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRightWidth: 1, borderRightColor: '#DFDFDF', backgroundColor: '#F0F5FA', justifyContent: 'center' },
  currencyPrefixText: { fontSize: 16, fontWeight: 'bold', color: '#023A73' },
  montoInput: { flex: 1, paddingHorizontal: 15, fontSize: 20, fontWeight: 'bold', color: '#212121' },

  footer: { paddingHorizontal: 30, paddingBottom: Platform.OS === 'ios' ? 40 : 30, paddingTop: 15, backgroundColor: '#FFFFFF' },
  button: { backgroundColor: '#FFA311', width: '100%', height: 60, borderRadius: 100, justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 4 },
  buttonText: { color: '#023A73', fontSize: 16, fontWeight: 'bold' }
});