import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useRouter } from 'expo-router';

// 💡 IMPORTAMOS EL SIMULADOR
import { MOCK_BACKEND } from '../../../lib/SimuladorBackend';

// ==========================================
// 🎭 SIMULACRO DE API (Endpoint /api/billetera/retirar)
// ==========================================
const mockRetirarSaldo = async (datosRetiro) => {
  return new Promise((resolve) => {
    console.log("Enviando solicitud de retiro al backend:", datosRetiro);
    setTimeout(() => {
      resolve({ success: true });
    }, 1500);
  });
};

// 🏦 LISTA DE BANCOS VENEZOLANOS
const LISTA_BANCOS = [
  "0102 - Banco de Venezuela",
  "0104 - Venezolano de Crédito",
  "0105 - Banco Mercantil",
  "0108 - Banco Provincial",
  "0114 - Bancaribe",
  "0115 - Banco Exterior",
  "0134 - Banesco",
  "0151 - Banco Fondo Común (BFC)",
  "0156 - 100% Banco",
  "0171 - Banco Activo",
  "0172 - Bancamiga",
  "0191 - Banco Nacional de Crédito (BNC)"
];

export default function RetirarSaldo() {
  const router = useRouter();
  const saldoDisponible = MOCK_BACKEND.saldo;

  // --- ESTADOS ---
  const [cedula, setCedula] = useState('');
  const [cuenta, setCuenta] = useState(''); // 💡 Cambiado de teléfono a cuenta
  const [rawMonto, setRawMonto] = useState('0'); 
  const [enviando, setEnviando] = useState(false);

  // Estados de los Selectores (Modales)
  const [banco, setBanco] = useState('');
  const [modalBancoVisible, setModalBancoVisible] = useState(false);
  
  const [tipoDoc, setTipoDoc] = useState('V');
  const [modalDocVisible, setModalDocVisible] = useState(false);

  // --- LÓGICA DE TECLADO BANCARIO ---
  const handleMontoChange = (text) => {
    const soloNumeros = text.replace(/[^0-9]/g, '');
    setRawMonto(soloNumeros === '' ? '0' : soloNumeros);
  };

  const montoFormateado = (parseInt(rawMonto || '0', 10) / 100).toFixed(2);
  const montoNumerico = parseFloat(montoFormateado);

  // --- PROCESAR RETIRO ---
  const procesarRetiro = async () => {
    if (!cedula || !banco || !cuenta) {
      Alert.alert("Faltan datos", "Por favor completa todos los datos de la cuenta destino.");
      return;
    }
    if (cuenta.length < 20) {
      Alert.alert("Cuenta inválida", "El número de cuenta debe tener 20 dígitos.");
      return;
    }
    if (montoNumerico <= 0) {
      Alert.alert("Monto inválido", "El monto a retirar debe ser mayor a Bs. 0.00.");
      return;
    }
    if (montoNumerico > saldoDisponible) {
      Alert.alert("Saldo insuficiente", `No puedes retirar más de los Bs. ${saldoDisponible.toFixed(2)} que tienes disponibles.`);
      return;
    }

    setEnviando(true);
    try {
      const documentoCompleto = `${tipoDoc}-${cedula.trim()}`;
      
      // 🧠 Payload en el orden que le gusta al backend
      const payload = {
        banco: banco.split(' - ')[1], 
        cedula: documentoCompleto,     
        cuenta: cuenta.trim(),      
        monto: montoNumerico
      };

      await mockRetirarSaldo(payload);
      
      Alert.alert(
        "¡Retiro en Proceso! 🏦", 
        `Hemos recibido tu solicitud por Bs. ${montoNumerico.toFixed(2)}. El dinero se reflejará en tu cuenta en las próximas horas hábiles.`, 
        [{ text: "Entendido", onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert("Error", "No se pudo procesar tu retiro. Intenta de nuevo más tarde.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome6 name="arrow-left" size={24} color="#023A73" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Retirar Saldo</Text>
          <View style={{ width: 24 }} /> 
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <FontAwesome6 name="building-columns" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={styles.balanceTitle}>Saldo Disponible</Text>
            </View>
            <Text style={styles.balanceAmount}>Bs. {saldoDisponible.toFixed(2)}</Text>
            <Text style={styles.balanceInfo}>Monto máximo a retirar</Text>
          </View>

          <Text style={styles.title}>Datos de la Cuenta</Text>
          <Text style={styles.subtitle}>Recibe el dinero de tu cuenta SUBA a una cuenta bancaria de tu pertenencia.</Text>
          {/* 1. CÉDULA */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cédula del Titular</Text>
            <View style={styles.cedulaContainer}>
              <TouchableOpacity style={styles.cedulaPrefix} onPress={() => setModalDocVisible(true)}>
                <Text style={styles.cedulaPrefixText}>{tipoDoc}</Text>
                <FontAwesome6 name="chevron-down" size={12} color="#023A73" style={{marginLeft: 5}} />
              </TouchableOpacity>
              <TextInput 
                style={styles.cedulaInput} 
                placeholder="Ej: 28123456" 
                keyboardType={tipoDoc === 'P' ? 'default' : 'numeric'} 
                autoCapitalize="characters"
                value={cedula} 
                onChangeText={setCedula} 
              />
            </View>
          </View>

          {/* 2. BANCO */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Banco Destino</Text>
            <TouchableOpacity style={styles.selectorContainer} onPress={() => setModalBancoVisible(true)}>
              <Text style={banco ? styles.selectorText : styles.selectorPlaceholder}>
                {banco || "Selecciona un banco..."}
              </Text>
              <FontAwesome6 name="chevron-down" size={14} color="#023A73" />
            </TouchableOpacity>
          </View>

          {/* 3. NÚMERO DE CUENTA */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Número de Cuenta</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ej: 01020000000000000000" 
              keyboardType="numeric" 
              maxLength={20} // 💡 20 dígitos obligatorios en Venezuela
              value={cuenta} 
              onChangeText={setCuenta} 
            />
          </View>

          {/* 4. MONTO */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Monto a Retirar</Text>
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

        <View style={styles.footer}>
          <TouchableOpacity style={styles.button} onPress={procesarRetiro} disabled={enviando}>
            {enviando ? (
              <ActivityIndicator color="#023A73" size="small" />
            ) : (
              <Text style={styles.buttonText}>SOLICITAR RETIRO</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* =========================================
          MODALES
      ========================================= */}

      {/* 1. Modal Banco */}
      <Modal visible={modalBancoVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecciona un Banco</Text>
              <TouchableOpacity onPress={() => setModalBancoVisible(false)}>
                <FontAwesome6 name="xmark" size={20} color="#999" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {LISTA_BANCOS.map((item, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.modalOption} 
                  onPress={() => { setBanco(item); setModalBancoVisible(false); }}
                >
                  <Text style={styles.modalOptionText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 2. Modal Tipo de Documento */}
      <Modal visible={modalDocVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.modalContentSmall}>
            <Text style={styles.modalTitle}>Documento</Text>
            <TouchableOpacity style={styles.modalOption} onPress={() => { setTipoDoc('V'); setModalDocVisible(false); }}>
              <Text style={styles.modalOptionText}>V - Venezolano</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => { setTipoDoc('E'); setModalDocVisible(false); }}>
              <Text style={styles.modalOptionText}>E - Extranjero</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalOption, {borderBottomWidth: 0}]} onPress={() => { setTipoDoc('P'); setModalDocVisible(false); }}>
              <Text style={styles.modalOptionText}>P - Pasaporte</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 10, backgroundColor: '#FFFFFF', zIndex: 10 },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#023A73' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 30, paddingTop: 20, paddingBottom: 30 },
  
  balanceCard: { backgroundColor: '#023A73', borderRadius: 20, padding: 25, marginBottom: 30, shadowColor: '#023A73', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8, alignItems: 'center' },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  balanceTitle: { fontSize: 14, fontWeight: '600', color: 'rgba(255, 255, 255, 0.7)', marginLeft: 8, textTransform: 'uppercase', letterSpacing: 1 },
  balanceAmount: { fontSize: 36, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  balanceInfo: { fontSize: 13, color: '#FFA311', fontWeight: '500' },

  title: { fontSize: 24, fontWeight: 'bold', color: '#212121', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 15, color: '#544F4F', textAlign: 'center', marginBottom: 25, lineHeight: 22 },

  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#023A73', marginBottom: 8, marginLeft: 5 },
  input: { width: '100%', height: 60, padding: 15, borderWidth: 1, borderColor: '#DFDFDF', borderRadius: 15, fontSize: 16, color: '#212121', backgroundColor: '#FAFAFA' },
  
  selectorContainer: { flexDirection: 'row', height: 60, paddingHorizontal: 15, borderWidth: 1, borderColor: '#DFDFDF', borderRadius: 15, backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'space-between' },
  selectorText: { fontSize: 16, color: '#212121' },
  selectorPlaceholder: { fontSize: 16, color: '#999' },

  montoContainer: { flexDirection: 'row', height: 60, borderWidth: 1, borderColor: '#DFDFDF', borderRadius: 15, backgroundColor: '#FAFAFA', overflow: 'hidden' },
  currencyPrefix: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRightWidth: 1, borderRightColor: '#DFDFDF', backgroundColor: '#F0F5FA', justifyContent: 'center' },
  currencyPrefixText: { fontSize: 16, fontWeight: 'bold', color: '#023A73' },
  montoInput: { flex: 1, paddingHorizontal: 15, fontSize: 20, fontWeight: 'bold', color: '#212121' },

  cedulaContainer: { flexDirection: 'row', height: 60, borderWidth: 1, borderColor: '#DFDFDF', borderRadius: 15, backgroundColor: '#FAFAFA', overflow: 'hidden' },
  cedulaPrefix: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRightWidth: 1, borderRightColor: '#DFDFDF', backgroundColor: '#F0F5FA', justifyContent: 'center' },
  cedulaPrefixText: { fontSize: 16, fontWeight: 'bold', color: '#023A73' },
  cedulaInput: { flex: 1, paddingHorizontal: 15, fontSize: 16, color: '#212121' },

  footer: { paddingHorizontal: 30, paddingBottom: Platform.OS === 'ios' ? 40 : 30, paddingTop: 15, backgroundColor: '#FFFFFF' },
  button: { backgroundColor: '#FFA311', width: '100%', height: 60, borderRadius: 100, justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 4 },
  buttonText: { color: '#023A73', fontSize: 16, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContentLarge: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 10 },
  
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContentSmall: { backgroundColor: '#FFFFFF', borderRadius: 20, width: '80%', padding: 20, alignItems: 'center' },
  
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#023A73' },
  modalOption: { width: '100%', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', justifyContent: 'center' },
  modalOptionText: { fontSize: 16, color: '#212121', textAlign: 'center' }
});