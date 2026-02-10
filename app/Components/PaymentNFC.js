import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PaymentNFC() {
  const [isReading, setIsReading] = useState(false);
  const [hasNfc, setHasNfc] = useState(null); // null: cargando, true: ok, false: no nativo
  const router = useRouter();

  useEffect(() => {
    const checkNfc = async () => {
      try {
        const supported = await NfcManager.isSupported();
        if (supported) {
          await NfcManager.start();
          setHasNfc(true);
        } else {
          setHasNfc(false);
        }
      } catch (err) {
        console.log("NFC no disponible (Modo simulación activado)");
        setHasNfc(false);
      }
    };

    checkNfc();

    return () => {
      NfcManager.cancelTechnologyRequest().catch(() => 0);
    };
  }, []);

  // Función para manejar la lectura real
  const handleReadNfc = async () => {
    try {
      setIsReading(true);
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      
      if (tag) {
        confirmarPagoNFC(tag.id || "NFC-001245");
      }
    } catch (ex) {
      console.warn("Lectura cancelada o error");
    } finally {
      setIsReading(false);
      NfcManager.cancelTechnologyRequest().catch(() => 0);
    }
  };

  // Función para simular (Solo para pruebas en Expo Go/Emulador)
  const handleSimulatedRead = () => {
    setIsReading(true);
    setTimeout(() => {
      setIsReading(false);
      confirmarPagoNFC("SIM-882941");
    }, 2000);
  };

  const confirmarPagoNFC = (tagId) => {
    const ahora = new Date();
    const fechaEmision = ahora.toLocaleString();
    
    // Sumamos 15 minutos
    const tiempoCaducidad = new Date(ahora.getTime() + 15 * 60000);
    const fechaCaducidad = tiempoCaducidad.toLocaleString();

    Alert.alert(
      "Tarjeta Detectada",
      `Detalles del Ticket:\n\n` +
      `🆔 Chip ID: ${tagId}\n` +
      `📅 Emisión: ${fechaEmision}\n` +
      `⏳ Caduca: ${fechaCaducidad}\n\n` +
      `¿Deseas proceder con el pago de Bs. 60.00?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Confirmar Pago", 
          onPress: () => {
            router.replace({
              pathname: "/Components/TicketVirtual",
              params: {
                monto: "60.00",
                unidad: tagId.slice(-6).toUpperCase(),
                fecha: fechaEmision,
                vence: fechaCaducidad,
                conductor: "Lector NFC Integrado"
              }
            });
          } 
        }
      ]
    );
  };

  if (hasNfc === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Pago sin Contacto</Text>
        <Text style={styles.subtitle}>
          {hasNfc 
            ? "Acerque su tarjeta o teléfono al lector" 
            : "Modo Simulación (Sensor NFC no detectado)"}
        </Text>

        <View style={[styles.iconContainer, isReading && styles.iconActive]}>
          <MaterialCommunityIcons 
            name={isReading ? "nfc-search-variant" : "nfc"} 
            size={120} 
            color="white" 
          />
        </View>

        <TouchableOpacity 
          style={[styles.scanButton, isReading && styles.scanning]} 
          onPress={hasNfc ? handleReadNfc : handleSimulatedRead}
          disabled={isReading}
        >
          <Text style={styles.buttonText}>
            {isReading ? "ESPERANDO SEÑAL..." : "INICIAR COBRO"}
          </Text>
        </TouchableOpacity>

        {/* Badge Informativo */}
        {!hasNfc && (
          <View style={styles.debugBadge}>
            <Text style={styles.debugText}>EXPO GO / EMULADOR DETECTADO</Text>
          </View>
        )}

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>Volver al menú</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#003366' },
  centered: { flex: 1, backgroundColor: '#003366', justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  title: { fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#BDC3C7', textAlign: 'center', marginBottom: 50 },
  iconContainer: { 
    width: 200, 
    height: 200, 
    borderRadius: 100, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: 60,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  iconActive: { borderColor: '#34C759', backgroundColor: 'rgba(52, 199, 89, 0.2)' },
  scanButton: { 
    backgroundColor: '#34C759', 
    paddingVertical: 18, 
    paddingHorizontal: 40, 
    borderRadius: 15, 
    width: '100%', 
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  scanning: { backgroundColor: '#27AE60', opacity: 0.7 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
  debugBadge: { marginTop: 20, backgroundColor: '#F39C12', padding: 5, borderRadius: 5 },
  debugText: { color: 'black', fontSize: 10, fontWeight: 'bold' },
  backButton: { marginTop: 30 },
  backText: { color: 'white', opacity: 0.6, fontSize: 16, textDecorationLine: 'underline' }
});