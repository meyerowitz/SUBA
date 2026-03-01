import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StatusBar, StyleSheet, Dimensions } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import NetInfo from "@react-native-community/netinfo";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get('window');

const Offline = ({ children }) => {
  // Para probar, cámbialo a false manualmente. 
  // Pero NetInfo lo sobreescribirá en el useEffect si no lo comentas.
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      // Consideramos desconectado si isConnected es explícitamente false
      setIsConnected(state.isConnected !== false);
    });

    return () => unsubscribe();
  }, []);

  // --- TRUCO PARA PROBAR ---
  // Descomenta la línea de abajo para forzar la vista de error siempre:
  // return <ErrorView onRetry={() => {}} />; 

  if (isConnected) {
    return <>{children}</>;
  }

  return <ErrorView onRetry={() => NetInfo.fetch().then(s => setIsConnected(s.isConnected))} />;
};

// Separamos la vista para que sea más limpio
const ErrorView = ({ onRetry }) => (
  <SafeAreaView style={styles.errorContainer}>
    <StatusBar barStyle="dark-content" backgroundColor="white" />
    <View style={styles.iconContainer}>
      <Ionicons name="wifi-outline" size={100} color="#296aa8" />
      <View style={styles.alertDot}>
        <Text style={styles.alertBang}>!</Text>
      </View>
    </View>

    <Text style={styles.errorTitle}>Ooops!</Text>
    <Text style={styles.errorSubtitle}>
      No Internet connection found.{"\n"}Check your connection.
    </Text>

    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <Text style={styles.retryText}>Try Again</Text>
    </TouchableOpacity>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  errorContainer: {
    // IMPORTANTE: Posicionamiento absoluto para que tape TODO
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999, // Por encima de navegación y SafeAreas
  },
  iconContainer: {
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  alertDot: {
    position: 'absolute',
    backgroundColor: '#296aa8',
    width: 30,
    height: 60,
    borderRadius: 15,
    top: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  alertBang: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 40
  },
  errorTitle: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#296aa8',
    marginBottom: 10
  },
  errorSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#296aa8',
    marginBottom: 30
  },
  retryButton: {
    backgroundColor: '#296aa8',
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 30,
  },
  retryText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600'
  }
});

export default Offline;