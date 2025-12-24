import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TextInput, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import * as Location from 'expo-location';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function Home2() {
  const [ubicacionActual, setUbicacionActual] = useState('');
  const [destinoInput, setDestinoInput] = useState('');
  const [cargandoOrigen, setCargandoOrigen] = useState(true);

  // === LÓGICA DE GEOLOCALIZACIÓN (Mantenemos tu lógica original) ===
  const obtenerUbicacionOrigen = async () => {
    setCargandoOrigen(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setUbicacionActual('Permiso denegado');
        return;
      }
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      let geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      if (geocode && geocode.length > 0) {
        const addr = geocode[0];
        setUbicacionActual(`${addr.street || ''} ${addr.city || ''}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCargandoOrigen(false);
    }
  };

  useEffect(() => {
    obtenerUbicacionOrigen();
  }, []);

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />
      
      {/* SECCIÓN SUPERIOR AZUL */}
      <View style={styles.headerBackground}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.welcomeText}>Hola,</Text>
              <Text style={styles.userName}>Miguel Gomez</Text>
              <Text style={styles.welcomeSub}>¡Bienvenido de nuevo!</Text>
            </View>
            <TouchableOpacity>
              <Ionicons name="person-circle-outline" size={50} color="white" />
            </TouchableOpacity>
          </View>

          {/* BARRA DE BÚSQUEDA SUPERIOR */}
          <View style={styles.searchSection}>
            <TextInput 
              style={styles.searchInput} 
              placeholder="Buscar..." 
              placeholderTextColor="#999"
            />
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          </View>
        </SafeAreaView>
      </View>

      {/* TARJETA DE SALDO (NARANJA) */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Saldo actual</Text>
        <Text style={styles.balanceAmount}>Bs. 54.59</Text>
      </View>

      {/* CONTENEDOR DE FORMULARIO (ORIGEN Y DESTINO) */}
      <View style={styles.formContainer}>
        
        {/* ORIGEN */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <Text style={styles.inputLabel}>Origen</Text>
          </View>
          <View style={styles.inputBox}>
            {cargandoOrigen ? (
              <ActivityIndicator size="small" color="#003366" />
            ) : (
              <Text style={styles.inputText} numberOfLines={1}>
                {ubicacionActual || "Cargando ubicación..."}
              </Text>
            )}
          </View>
        </View>

        {/* DESTINO */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Ionicons name="location" size={20} color="#666" />
            <Text style={styles.inputLabel}>Destino</Text>
          </View>
          <View style={styles.destinationRow}>
            <TextInput
              style={[styles.inputBox, { flex: 1, marginBottom: 0 }]}
              placeholder="¿A dónde vas?"
              value={destinoInput}
              onChangeText={setDestinoInput}
            />
            <TouchableOpacity style={styles.miniSearchBtn}>
              <Ionicons name="search" size={24} color="black" />
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBackground: {
    backgroundColor: '#003366', // Azul oscuro
    height: '40%',
    paddingHorizontal: 25,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  welcomeText: {
    fontSize: 28,
    color: 'white',
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 28,
    color: 'white',
    fontWeight: 'bold',
  },
  welcomeSub: {
    fontSize: 22,
    color: 'white',
    fontWeight: '500',
    marginTop: 5,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 25,
    marginTop: 30,
    paddingHorizontal: 15,
    height: 50,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  searchIcon: {
    marginLeft: 10,
  },
  balanceCard: {
    backgroundColor: '#E69500', // Naranja
    marginHorizontal: 30,
    padding: 20,
    borderRadius: 20,
    marginTop: -60, // Sube la tarjeta para que quede encima del azul
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  balanceLabel: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  balanceAmount: {
    color: 'white',
    fontSize: 38,
    fontWeight: 'bold',
    marginTop: 10,
  },
  formContainer: {
    paddingHorizontal: 30,
    marginTop: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 18,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  inputBox: {
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 15,
    height: 55,
    justifyContent: 'center',
    // Sombra suave para los inputs
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    elevation: 1,
  },
  inputText: {
    fontSize: 16,
    color: '#333',
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniSearchBtn: {
    backgroundColor: '#F0F0F0',
    padding: 12,
    borderRadius: 10,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#DDD',
  }
});