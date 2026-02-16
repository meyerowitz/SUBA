import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

// IMPORTACIONES DE BASE DE DATOS
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabase = createClient(
  'https://wkkdynuopaaxtzbchxgv.supabase.co', 
  'sb_publishable_S18aNBlyLP3-hV_mRMcehA_zbCDMSGP'
);

export default function PaymentNFC() {
  const [isReading, setIsReading] = useState(false);
  const [hasNfc, setHasNfc] = useState(null); 
  const [procesando, setProcesando] = useState(false); // Estado para la transacción DB
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
        setHasNfc(false);
      }
    };
    checkNfc();
    return () => {
      NfcManager.cancelTechnologyRequest().catch(() => 0);
    };
  }, []);

  // --- OBTENER DATOS DE SESIÓN ---
  const getSessionData = async () => {
    const session = await AsyncStorage.getItem('@Sesion_usuario');
    return session ? JSON.parse(session) : null;
  };

  // --- LÓGICA DE TRANSACCIÓN ---
  const ejecutarPagoNFC = async (tagId, fechaEmision, fechaCaducidad) => {
    setProcesando(true);
    const MONTO_PAGO = 60.00;
    const targetId = String(tagId).trim(); // El ID de la tarjeta actúa como ID de destino

    try {
      const session = await getSessionData();
      if (!session) throw new Error("Sesión no encontrada.");
      
      const myId = session._id.trim();
      const myName = session.fullName || "Usuario NFC";
      const referenciaUnica = `NFC-${Date.now().toString().slice(-6)}`;

      // 1. CONSULTAR MI SALDO
      const { data: myData, error: myError } = await supabase
        .from('Saldo_usuarios')
        .select('saldo')
        .eq('external_user_id', myId)
        .maybeSingle();

      if (myError) throw myError;
      const miSaldoActual = myData ? myData.saldo : 0;

      if (miSaldoActual < MONTO_PAGO) {
        Alert.alert("Saldo insuficiente", `Necesitas Bs. 60.00 y tienes Bs. ${miSaldoActual.toFixed(2)}`);
        return;
      }

      // 2. DESCONTAR MI SALDO
      const { error: errorResta } = await supabase
        .from('Saldo_usuarios')
        .update({ saldo: miSaldoActual - MONTO_PAGO })
        .eq('external_user_id', myId);

      if (errorResta) throw errorResta;

      // 3. SUMAR AL DESTINATARIO (UPSERT)
      const { data: destData } = await supabase
        .from('Saldo_usuarios')
        .select('saldo')
        .eq('external_user_id', targetId)
        .maybeSingle();

      const saldoActualDest = destData ? destData.saldo : 0;
      
      const { error: errorSuma } = await supabase
        .from('Saldo_usuarios')
        .upsert(
          { external_user_id: targetId, saldo: saldoActualDest + MONTO_PAGO },
          { onConflict: 'external_user_id' }
        );

      if (errorSuma) throw errorSuma;

      // 4. REGISTRAR HISTORIAL DOBLE
      await supabase.from('validaciones_pago').insert([
        {
          external_user_id: myId,
          referencia: referenciaUnica,
          monto_informado: MONTO_PAGO,
          evidencia_url: `Pago NFC Tarjeta: ${targetId}`,
          estado: 'completado'
        },
        {
          external_user_id: targetId,
          referencia: referenciaUnica,
          monto_informado: MONTO_PAGO,
          evidencia_url: `Ingreso NFC: ${myName}`,
          estado: 'completado'
        }
      ]);

      // 5. NAVEGAR AL TICKET
      router.replace({
        pathname: "/Components/TicketVirtual",
        params: {
          monto: "60.00",
          unidad: targetId.slice(-6).toUpperCase(),
          fecha: fechaEmision,
          vence: fechaCaducidad,
          conductor: "Cobro NFC Integrado"
        }
      });

    } catch (error) {
      Alert.alert("Error en el pago", error.message);
    } finally {
      setProcesando(false);
    }
  };

  const handleReadNfc = async () => {
    try {
      setIsReading(true);
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      if (tag) {
        confirmarPagoNFC(tag.id || "NFC-001245");
      }
    } catch (ex) {
      console.warn("Lectura cancelada");
    } finally {
      setIsReading(false);
      NfcManager.cancelTechnologyRequest().catch(() => 0);
    }
  };

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
    const tiempoCaducidad = new Date(ahora.getTime() + 15 * 60000);
    const fechaCaducidad = tiempoCaducidad.toLocaleString();

    Alert.alert(
      "Tarjeta Detectada",
      `¿Deseas pagar Bs. 60.00 con la tarjeta ${tagId}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Confirmar Pago", 
          onPress: () => ejecutarPagoNFC(tagId, fechaEmision, fechaCaducidad) 
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

        <View style={[styles.iconContainer, (isReading || procesando) && styles.iconActive]}>
          {procesando ? (
             <ActivityIndicator size="large" color="#34C759" />
          ) : (
            <MaterialCommunityIcons 
              name={isReading ? "nfc-search-variant" : "nfc"} 
              size={120} 
              color="white" 
            />
          )}
        </View>

        <TouchableOpacity 
          style={[styles.scanButton, (isReading || procesando) && styles.scanning]} 
          onPress={hasNfc ? handleReadNfc : handleSimulatedRead}
          disabled={isReading || procesando}
        >
          <Text style={styles.buttonText}>
            {procesando ? "PROCESANDO PAGO..." : isReading ? "ESPERANDO SEÑAL..." : "INICIAR COBRO"}
          </Text>
        </TouchableOpacity>

        {!hasNfc && (
          <View style={styles.debugBadge}>
            <Text style={styles.debugText}>EXPO GO / EMULADOR DETECTADO</Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          disabled={procesando}
        >
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
  },
  scanning: { backgroundColor: '#27AE60', opacity: 0.7 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
  debugBadge: { marginTop: 20, backgroundColor: '#F39C12', padding: 5, borderRadius: 5 },
  debugText: { color: 'black', fontSize: 10, fontWeight: 'bold' },
  backButton: { marginTop: 30 },
  backText: { color: 'white', opacity: 0.6, fontSize: 16, textDecorationLine: 'underline' }
});