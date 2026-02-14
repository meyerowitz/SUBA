import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '../../../lib/supabase'; // Ajusta la ruta si es necesario

// Importamos la pantalla que ya hicimos (El Estado 0)
import InvitacionTarjeta from './InvitacionTarjeta'; 

export default function MiTarjetaHub() {
  const [estadoUsuario, setEstadoUsuario] = useState('CARGANDO'); // CARGANDO, NO_TIENE, EN_REVISION, PARA_VINCULAR, ACTIVA
  const [datosTarjeta, setDatosTarjeta] = useState(null);

  useEffect(() => {
    revisarEstado();
  }, []);

  const revisarEstado = async () => {
    // Usamos el mismo ID falso para mantener la coherencia en la prueba
    const miUsuarioId = '11111111-1111-1111-1111-111111111111';

    try {
      // 1. ¿Ya tiene una tarjeta vinculada y activa?
      const { data: tarjeta } = await supabase
        .from('tarjetas_usuarios')
        .select('*')
        .eq('user_id', miUsuarioId)
        .single();

      if (tarjeta) {
        setDatosTarjeta(tarjeta);
        setEstadoUsuario('ACTIVA');
        return; // Si ya la tiene, no buscamos más
      }

      // 2. Si no tiene tarjeta, ¿hizo una solicitud?
      const { data: solicitud } = await supabase
        .from('solicitudes_tarjetas')
        .select('*')
        .eq('user_id', miUsuarioId)
        .order('created_at', { ascending: false }) // Buscamos la más reciente
        .limit(1)
        .single();

      if (!solicitud) {
        setEstadoUsuario('NO_TIENE');
      } else if (solicitud.estado === 'pendiente_revision') {
        setEstadoUsuario('EN_REVISION');
      } else if (solicitud.estado === 'aprobada_esperando_vinculacion') {
        setEstadoUsuario('PARA_VINCULAR');
      }

    } catch (error) {
      console.log("Error consultando estado:", error);
      // Si hay error porque no encontró nada (es normal en .single()), asumimos que es nuevo
      setEstadoUsuario('NO_TIENE'); 
    }
  };

  // --- RENDERIZADO CONDICIONAL MAGISTRAL ---
  switch (estadoUsuario) {
    case 'CARGANDO':
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FFA311" />
          <Text style={styles.text}>Consultando tu billetera SUBA...</Text>
        </View>
      );

    case 'NO_TIENE':
      // Mostramos la pantalla de Invitación que creamos en el paso anterior
      return <InvitacionTarjeta />;

    case 'EN_REVISION':
      return (
        <View style={styles.center}>
          <Text style={styles.title}>Solicitud en Proceso ⏳</Text>
          <Text style={styles.text}>Estamos validando tus datos y tu pago. Te avisaremos pronto.</Text>
        </View>
      );

    case 'PARA_VINCULAR':
      return (
        <View style={styles.center}>
          <Text style={styles.title}>¡Solicitud Aprobada! 🎉</Text>
          <Text style={styles.text}>Aquí pondremos el botón para escanear el NFC.</Text>
        </View>
      );

    case 'ACTIVA':
      return (
        <View style={styles.center}>
          <Text style={styles.title}>💳 Mi Tarjeta SUBA</Text>
          <Text style={styles.text}>Saldo: {datosTarjeta?.saldo} Bs</Text>
          <Text style={styles.text}>UID: {datosTarjeta?.uid_nfc}</Text>
          <Text style={styles.text}>Aquí irá el diseño final de la tarjeta y movimientos.</Text>
        </View>
      );

    default:
      return <InvitacionTarjeta />;
  }
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#023A73', marginBottom: 10 },
  text: { fontSize: 16, color: '#544F4F', textAlign: 'center' }
});