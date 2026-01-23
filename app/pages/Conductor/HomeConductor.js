import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useRouter } from 'expo-router';

export default function DriverHome() {
  const router = useRouter();
  // Estado para controlar si el conductor está activo o no
  const [isActive, setIsActive] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainCard}>
        
        {/* Encabezado Azul Oscuro */}
        <View style={styles.blueHeader}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greetingText}>Hola,</Text>
              <Text style={styles.userNameText}>Jose Perez</Text>
              <Text style={styles.welcomeText}>¡Bienvenido de nuevo!</Text>
            </View>
            <TouchableOpacity onPress={()=>{router.push("/pages/Conductor/Profile")}}>
            <Ionicons name="person-circle-outline" size={50} color="white" />
            </TouchableOpacity>
          </View>

          {/* Tarjeta de Saldo Naranja */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Saldo actual</Text>
            <Text style={styles.balanceAmount}>Bs. 54,59</Text>
          </View>
        </View>

        {/* Contenido Inferior */}
        <View style={styles.content}>
          
          {/* Fila de Estado del Conductor */}
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Estado del conductor</Text>
            <TouchableOpacity 
              style={[styles.statusBadge, { backgroundColor: isActive ? '#2E7D32' : '#D32F2F' }]} 
              onPress={() => setIsActive(!isActive)}
            >
              <Text style={styles.statusBadgeText}>
                {isActive ? 'Activo' : 'Desactivado'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Enlaces de Navegación */}
          <View style={styles.linksContainer}>
            
            <Link href="/pages/Conductor/Historial" asChild>
              <TouchableOpacity style={styles.linkItem}>
                <Text style={styles.linkText}>Ver historial de operaciones</Text>
                <Ionicons name="chevron-forward" size={18} color="#9E9E9E" />
              </TouchableOpacity>
            </Link>

            <Link href="/pages/Conductor/RutasAlternativas" asChild>
              <TouchableOpacity style={styles.linkItem}>
                <Text style={styles.linkText}>Ver alternativas de rutas</Text>
                <Ionicons name="chevron-forward" size={18} color="#9E9E9E" />
              </TouchableOpacity>
            </Link>

          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#a35e5eff', // Fondo gris de la pantalla
    justifyContent: 'center',
  },
  mainCard: {
    backgroundColor: 'white',

    height: '100%',
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  blueHeader: {
    backgroundColor: '#003B73', // Azul oscuro de la imagen
    height: '45%',
    padding: 25,
    borderBottomLeftRadius: 80, // Ligero quiebre visual
    borderBottomRightRadius: 80,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  greetingText: { color: 'white', fontSize: 26, fontWeight: 'bold' },
  userNameText: { color: 'white', fontSize: 26, fontWeight: 'bold' },
  welcomeText: { color: 'white', fontSize: 18, marginTop: 5, opacity: 0.9 },
  balanceCard: {
    backgroundColor: '#D98E04', // Naranja
    borderRadius: 20,
    padding: 20,
    marginTop: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
  },
  balanceLabel: { color: 'white', fontSize: 16, fontWeight: '600' },
  balanceAmount: { color: 'white', fontSize: 32, fontWeight: 'bold', marginTop: 20 },
  content: {
    padding: 25,
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 10,
  },
  statusLabel: { fontSize: 16, fontWeight: '700', color: '#333' },
  statusBadge: {
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 20,
  },
  statusBadgeText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  linksContainer: {
    marginTop: 10,
  },
  linkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  linkText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500', // Estilo de fuente de la referencia de configuración
  },
});