import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

export default function InvitacionTarjeta() {
  const router = useRouter();

  const irAlRegistro = () => {
    // ¡Ahora sí navegamos de verdad a la pantalla del formulario!
    router.push('/pages/Pasajero/FormularioSolicitud'); 
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* Composición visual de la Tarjeta y el NFC */}
        <View style={styles.iconContainer}>
          <FontAwesome6 name="credit-card" size={100} color="#023A73" />
          <View style={styles.nfcBadge}>
            <FontAwesome6 name="nfc-symbol" size={24} color="#FFFFFF" />
          </View>
        </View>

        {/* El mensaje principal que definimos */}
        <Text style={styles.title}>
          USA TU NUEVA TARJETA SUBA PARA REALIZAR TUS PAGOS DE FORMA INMEDIATA
        </Text>

        {/* Un subtítulo de apoyo para reforzar la idea */}
        <Text style={styles.subtitle}>
          Olvídate del efectivo. Paga tu pasaje al instante de forma segura y sin depender de conexión a internet.
        </Text>

      </View>

      {/* Botón de Acción Principal */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={irAlRegistro}>
          <Text style={styles.buttonText}>SOLICITUD DE TARJETA</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  content: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 30 
  },
  iconContainer: { 
    marginBottom: 40, 
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  nfcBadge: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    backgroundColor: '#FFA311',
    borderRadius: 50,
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF'
  },
  title: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#212121', 
    textAlign: 'center', 
    marginBottom: 20, 
    lineHeight: 32 
  },
  subtitle: { 
    fontSize: 16, 
    color: '#544F4F', 
    textAlign: 'center', 
    lineHeight: 24 
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    width: '100%'
  },
  button: { 
    backgroundColor: '#FFA311', 
    width: '100%', 
    paddingVertical: 18, 
    borderRadius: 100, 
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4
  },
  buttonText: { 
    color: '#023A73', 
    fontSize: 16, 
    fontWeight: 'bold' 
  }
});