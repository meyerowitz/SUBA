import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, Image, Alert, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ==========================================
// 🔗 CONEXIÓN AL BACKEND Y STORAGE
// ==========================================
const supabase = createClient(
  "https://wkkdynuopaaxtzbchxgv.supabase.co",
  "sb_publishable_S18aNBlyLP3-hV_mRMcehA_zbCDMSGP",
);

const API_URL = "https://subapp-api.onrender.com";

export default function RecargarSaldo() {
  const router = useRouter();
  
  // --- ESTADOS DEL FORMULARIO ---
  const [rawMonto, setRawMonto] = useState('0'); 
  const [referencia, setReferencia] = useState('');
  const [captura, setCaptura] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const datosPagoSUBA = {
    banco: "0134 - Banesco",
    telefono: "04141234567",
    rif: "J-12345678-9"
  };

  const handleMontoChange = (text) => {
    const soloNumeros = text.replace(/[^0-9]/g, '');
    setRawMonto(soloNumeros === '' ? '0' : soloNumeros);
  };

  const montoFormateado = (parseInt(rawMonto || '0', 10) / 100).toFixed(2);
  const montoNumerico = parseFloat(montoFormateado);

  const copiarTodo = async () => {
    const textoCompleto = `Pago Móvil SUBA\nBanco: ${datosPagoSUBA.banco}\nTeléfono: ${datosPagoSUBA.telefono}\nRIF: ${datosPagoSUBA.rif}`;
    await Clipboard.setStringAsync(textoCompleto);
    
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const seleccionarCaptura = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // 💡 Evitamos el warning de Expo
      allowsEditing: true, 
      quality: 0.5,
    });
    if (!result.canceled) {
      setCaptura(result.assets[0].uri);
    }
  };

  const procesarRecarga = async () => {
    if (montoNumerico <= 0 || !referencia || !captura) {
      Alert.alert("Faltan datos", "Por favor ingresa un monto válido, la referencia y sube la captura de pantalla.");
      return;
    }
    if (referencia.length < 4) {
      Alert.alert("Referencia corta", "Ingresa al menos los últimos 4 dígitos de la referencia.");
      return;
    }

    setEnviando(true);
    try {
      // 1. Obtener Token
      const sessionString = await AsyncStorage.getItem("@Sesion_usuario");
      if (!sessionString) throw new Error("No hay sesión activa");
      const token = JSON.parse(sessionString).token;

      // 2. Subir imagen a Supabase (usando FormData para evitar error de red nativo)
      const ext = captura.substring(captura.lastIndexOf('.') + 1) || 'jpg';
      const fileName = `captures/${Date.now()}.${ext}`;
      
      const formData = new FormData();
      formData.append("file", { 
        uri: Platform.OS === "android" ? captura : captura.replace("file://", ""), 
        name: fileName, 
        type: `image/${ext === 'jpg' ? 'jpeg' : ext}` 
      });

      const { error: storageError } = await supabase.storage.from('comprobantes').upload(fileName, formData);
      if (storageError) throw storageError;
      
      const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(fileName);

      // 3. Enviar al Backend de SUBA
      const payload = {
        monto: montoNumerico,
        referencia: referencia,
        comprobanteUrl: urlData.publicUrl 
      };

      const response = await fetch(`${API_URL}/api/billetera/recarga`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Error procesando la recarga en el servidor");

      Alert.alert(
        "¡Recarga Enviada! 🚀", 
        "Tu pago está en revisión. El saldo se sumará a tu billetera apenas sea aprobado.", 
        [{ text: "Entendido", onPress: () => router.back() }]
      );
    } catch (error) {
      console.log("Error recarga:", error);
      Alert.alert("Error", error.message || "Hubo un problema enviando tu recarga. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        
        {/* --- ENCABEZADO --- */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome6 name="arrow-left" size={24} color="#023A73" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recargar Saldo</Text>
          <View style={{ width: 24 }} /> 
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          {/* --- TARJETA RESALTADA (Azul SUBA) --- */}
          <View style={styles.resumenCard}>
            <Text style={styles.cardTitle}>Datos de Pago</Text>

            <View style={styles.resumenFila}>
              <Text style={styles.resumenLabel}>Banco:</Text>
              <Text style={styles.resumenValor}>{datosPagoSUBA.banco}</Text>
            </View>
            <View style={styles.resumenFila}>
              <Text style={styles.resumenLabel}>Teléfono:</Text>
              <Text style={styles.resumenValor}>{datosPagoSUBA.telefono}</Text>
            </View>
            <View style={[styles.resumenFila, { marginBottom: 0 }]}>
              <Text style={styles.resumenLabel}>RIF:</Text>
              <Text style={styles.resumenValor}>{datosPagoSUBA.rif}</Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.btnCopiar, copiado && { backgroundColor: '#16A34A' }]} 
              onPress={copiarTodo}
              disabled={copiado}
            >
              <FontAwesome6 name={copiado ? "check" : "copy"} size={14} color={copiado ? "#FFFFFF" : "#023A73"} />
              <Text style={[styles.btnCopiarText, copiado && { color: '#FFFFFF' }]}>
                {copiado ? "¡DATOS COPIADOS!" : "COPIAR DATOS"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Realiza tu pago móvil y registra el comprobante aquí.</Text>

          {/* --- FORMULARIO --- */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Monto Depositado</Text>
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>N° de Referencia</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Últimos 4 o más dígitos" 
              keyboardType="numeric" 
              value={referencia} 
              onChangeText={setReferencia} 
              maxLength={15}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Captura de Pantalla</Text>
            <TouchableOpacity style={styles.fotoBtn} onPress={seleccionarCaptura}>
              {captura ? (
                <Image source={{ uri: captura }} style={styles.fotoPreview} />
              ) : (
                <View style={styles.fotoPlaceholder}>
                  <FontAwesome6 name="cloud-arrow-up" size={32} color="#999" />
                  <Text style={styles.fotoPlaceholderText}>Toca para adjuntar comprobante</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.button} onPress={procesarRecarga} disabled={enviando}>
            {enviando ? (
              <ActivityIndicator color="#023A73" size="small" />
            ) : (
              <Text style={styles.buttonText}>ENVIAR RECARGA</Text>
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
  cardTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', marginBottom: 20 },
  subtitle: { fontSize: 15, color: '#544F4F', textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  resumenCard: { backgroundColor: '#023A73', padding: 20, borderRadius: 15, marginBottom: 20, shadowColor: '#023A73', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  resumenFila: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  resumenLabel: { fontSize: 15, color: 'rgba(255, 255, 255, 0.7)' },
  resumenValor: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },
  btnCopiar: { flexDirection: 'row', backgroundColor: '#FFA311', paddingVertical: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 15 },
  btnCopiarText: { color: '#023A73', fontSize: 13, fontWeight: 'bold', marginLeft: 8 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#023A73', marginBottom: 8, marginLeft: 5 },
  input: { width: '100%', height: 60, padding: 15, borderWidth: 1, borderColor: '#DFDFDF', borderRadius: 15, fontSize: 16, color: '#212121', backgroundColor: '#FAFAFA' },
  montoContainer: { flexDirection: 'row', height: 60, borderWidth: 1, borderColor: '#DFDFDF', borderRadius: 15, backgroundColor: '#FAFAFA', overflow: 'hidden' },
  currencyPrefix: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRightWidth: 1, borderRightColor: '#DFDFDF', backgroundColor: '#F0F5FA', justifyContent: 'center' },
  currencyPrefixText: { fontSize: 16, fontWeight: 'bold', color: '#023A73' },
  montoInput: { flex: 1, paddingHorizontal: 15, fontSize: 18, fontWeight: 'bold', color: '#212121' },
  fotoBtn: { width: '100%', height: 160, borderRadius: 15, overflow: 'hidden', borderWidth: 2, borderColor: '#DFDFDF', backgroundColor: '#FAFAFA', borderStyle: 'dashed', marginTop: 5 },
  fotoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  fotoPlaceholderText: { color: '#666', fontSize: 14, fontWeight: '500' },
  fotoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  footer: { paddingHorizontal: 30, paddingBottom: Platform.OS === 'ios' ? 40 : 30, paddingTop: 15, backgroundColor: '#FFFFFF' },
  button: { backgroundColor: '#FFA311', width: '100%', height: 60, borderRadius: 100, justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 4 },
  buttonText: { color: '#023A73', fontSize: 16, fontWeight: 'bold' }
});