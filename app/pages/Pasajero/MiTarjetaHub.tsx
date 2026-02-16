import React, { useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { supabase } from '../../../lib/supabase';

// Componentes Hijos
import InvitacionTarjeta from './InvitacionTarjeta'; 
import VincularTarjeta from './VincularTarjeta'; // 👈 Importado correctamente aquí

export default function MiTarjetaHub() {
  const router = useRouter();
  const [estadoUsuario, setEstadoUsuario] = useState('CARGANDO'); 
  const [datosTarjeta, setDatosTarjeta] = useState<any>(null);

  // 🧠 useFocusEffect ejecuta esto CADA VEZ que la pantalla aparece frente al usuario
  useFocusEffect(
    useCallback(() => {
      revisarEstado();
    }, [])
  );

  const revisarEstado = async () => {
    setEstadoUsuario('CARGANDO'); 
    
    try {
      // 🧠 Leemos la memoria directamente
      const sessionString = await AsyncStorage.getItem('@Sesion_usuario');
      if (!sessionString) {
        setEstadoUsuario('NO_TIENE');
        return;
      }

      const sessionData = JSON.parse(sessionString);
      const miUsuarioId = sessionData.id || sessionData._id;

      if (!miUsuarioId) {
        setEstadoUsuario('NO_TIENE');
        return;
      }

      const { data: tarjetas } = await supabase.from('tarjetas_usuarios').select('*').eq('user_id', miUsuarioId.trim());

      if (tarjetas && tarjetas.length > 0) {
        setDatosTarjeta(tarjetas[0]);
        setEstadoUsuario('ACTIVA');
        return; 
      }

      const { data: solicitudes } = await supabase.from('solicitudes_tarjetas').select('*').eq('user_id', miUsuarioId.trim()).order('created_at', { ascending: false });

      if (solicitudes && solicitudes.length > 0) {
        const ultimaSolicitud = solicitudes[0];
        if (ultimaSolicitud.estado === 'pendiente_revision' || ultimaSolicitud.estado === 'PENDIENTE') {
          setEstadoUsuario('EN_REVISION');
        } else if (ultimaSolicitud.estado === 'aprobada_esperando_vinculacion') {
          setEstadoUsuario('PARA_VINCULAR');
        } else {
          setEstadoUsuario('NO_TIENE');
        }
      } else {
        setEstadoUsuario('NO_TIENE'); 
      }
    } catch (error) {
      console.log("Error crítico consultando estado:", error);
      setEstadoUsuario('NO_TIENE'); 
    }
  };

  switch (estadoUsuario) {
    case 'CARGANDO':
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FFA311" />
          <Text style={[styles.text, {marginTop: 15}]}>Consultando tu billetera SUBA...</Text>
        </View>
      );

    case 'NO_TIENE':
      return <InvitacionTarjeta />;

    case 'EN_REVISION':
      return (
        <View style={styles.center}>
          <FontAwesome6 name="hourglass-half" size={60} color="#FFA311" style={{marginBottom: 20}} />
          <Text style={styles.title}>Solicitud en Proceso</Text>
          <Text style={styles.text}>Estamos validando tus datos y tu pago. Te avisaremos cuando tu tarjeta sea aprobada.</Text>
          
          {/* Botón para no quedar atrapados */}
          <TouchableOpacity style={styles.btnVolver} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={16} color="#023A73" />
            <Text style={styles.btnVolverText}>Volver al Inicio</Text>
          </TouchableOpacity>
        </View>
      );

    case 'PARA_VINCULAR':
      return (
        <VincularTarjeta 
          alCompletar={() => {
            // Cuando termine de escanear, volvemos a consultar la base de datos
            revisarEstado(); 
          }} 
        />
      );

    case 'ACTIVA':
      return (
        <View style={styles.center}>
          <Text style={styles.title}>💳 Mi Tarjeta SUBA</Text>
          <Text style={styles.text}>Saldo: {datosTarjeta?.saldo} Bs</Text>
          <Text style={styles.text}>UID: {datosTarjeta?.uid_nfc}</Text>
        </View>
      );

    default:
      return <InvitacionTarjeta />;
  }
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#F9FBFF' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#023A73', marginBottom: 15, textAlign: 'center' },
  text: { fontSize: 16, color: '#544F4F', textAlign: 'center', lineHeight: 24, marginBottom: 30 },
  btnVolver: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E5F0FF', paddingVertical: 15, paddingHorizontal: 25, borderRadius: 100, gap: 10 },
  btnVolverText: { fontSize: 16, fontWeight: 'bold', color: '#023A73' }
});