import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../lib/supabase';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';

export default function VincularTarjeta({ alCompletar }) {
  const [escaneando, setEscaneando] = useState(false);
  const [procesando, setProcesando] = useState(false);

  // 1. Inicializamos la antena al abrir la pantalla
  useEffect(() => {
    async function initNfc() {
      try {
        await NfcManager.start();
      } catch (e) {
        console.warn('Error iniciando NFC', e);
      }
    }
    initNfc();

    // Limpieza segura al salir
    return () => {
      NfcManager.cancelTechnologyRequest().catch(() => 0);
    };
  }, []);

  // 2. Función Real de Lectura
  const iniciarVinculacion = async () => {
    setEscaneando(true);

    try {
      // Pedimos al celular que encienda el lector
      await NfcManager.requestTechnology([NfcTech.NfcA, NfcTech.IsoDep]); 
      
      // Esperamos a que la tarjeta toque el teléfono
      const tag = await NfcManager.getTag();
      
      if (tag && tag.id) {
        const uidDetectado = tag.id.toUpperCase();
        
        // Apagamos el lector de inmediato por seguridad
        await NfcManager.cancelTechnologyRequest();
        
        // Pasamos a procesar en base de datos
        setEscaneando(false);
        guardarEnSupabase(uidDetectado);
      } else {
        throw new Error("No se pudo leer el ID de la tarjeta");
      }

    } catch (ex) {
      console.warn("Lectura cancelada o fallida", ex);
      setEscaneando(false);
      NfcManager.cancelTechnologyRequest().catch(() => 0);
      Alert.alert("⚠️ Lectura Fallida", "No pudimos leer la tarjeta. Intenta acercarla nuevamente al centro de tu teléfono.");
    }
  };

  // 3. Lógica de Base de Datos
  const guardarEnSupabase = async (uidNfc) => {
    setProcesando(true);
    try {
      const sessionString = await AsyncStorage.getItem('@Sesion_usuario');
      const sessionData = JSON.parse(sessionString);
      const userId = sessionData.id || sessionData._id;

      // Creamos la tarjeta oficial
      const { error: errorInsert } = await supabase.from('tarjetas_usuarios').insert({
        user_id: userId,
        uid_nfc: uidNfc,
        saldo: 0,
        estado: 'activa'
      });

      if (errorInsert) throw errorInsert;

      // Marcamos la solicitud como completada
      const { error: errorUpdate } = await supabase
        .from('solicitudes_tarjetas')
        .update({ estado: 'completada' }) 
        .eq('user_id', userId)
        .eq('estado', 'aprobada_esperando_vinculacion');

      if (errorUpdate) console.log("Advertencia actualizando solicitud:", errorUpdate);

      setProcesando(false);
      
      Alert.alert(
        "¡Tarjeta Vinculada! 🎉", 
        `El chip (${uidNfc}) se ha conectado a tu cuenta exitosamente.`,
        [{ text: "Ver mi Billetera", onPress: () => alCompletar() }]
      );

    } catch (error) {
      console.log(error);
      setProcesando(false);
      Alert.alert("Error de Sistema", "Hubo un problema guardando la tarjeta en la nube.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>¡Solicitud Aprobada!</Text>
        <Text style={styles.subtitle}>Es hora de vincular tu tarjeta física.</Text>
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
            <FontAwesome6 name="wifi" size={18} color="white" style={{ marginRight: 10 }} />
            <Text style={styles.buttonText}>Escanear Tarjeta Real</Text>
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