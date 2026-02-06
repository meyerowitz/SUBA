import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Volver from '../../Components/Botones_genericos/Volver';
import { useRouter } from 'expo-router';
import { useTheme } from '../../Components/Temas_y_colores/ThemeContext';

export default function Privacidad() {
  const router = useRouter();
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isPublicProfile, setIsPublicProfile] = useState(true);
  const { theme, isDark } = useTheme(); //temas oscuro y claro
  
  const handleEliminarCuenta = () => {
    Alert.alert(
      "Eliminar cuenta",
      "Esta acción es irreversible. ¿Realmente deseas borrar todos tus datos?",
      [{ text: "Cancelar", style: "cancel" }, { text: "Eliminar", style: "destructive" }]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background}}>
      <View style={styles.header}>
        <Text style={{fontSize: 28, fontWeight: 'bold', color: theme.text}}>Privacidad</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <Text style={styles.sectionTitle}>SEGURIDAD</Text>
        
        <TouchableOpacity style={styles.row} onPress={() => router.push('./CambiarContras')}>
          <View>
            <Text style={styles.rowText}>Cambiar Contraseña</Text>
            <Text style={styles.subText}>Se recomienda usar una clave fuerte</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        <View style={styles.row}>
          <View>
            <Text style={styles.rowText}>Face ID / Huella Digital</Text>
            <Text style={styles.subText}>Acceso rápido y seguro</Text>
          </View>
          <Switch 
            value={isBiometricEnabled} 
            onValueChange={setIsBiometricEnabled}
            trackColor={{ false: "#D1D1D1", true: "#D99015" }} 
          />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 25 }]}>DATOS PERSONALES</Text>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowText}>Perfil Público</Text>
            <Text style={styles.subText}>Permitir que conductores vean tu foto</Text>
          </View>
          <Switch 
            value={isPublicProfile} 
            onValueChange={setIsPublicProfile}
            trackColor={{ false: "#D1D1D1", true: "#D99015" }} 
          />
        </View>

        <TouchableOpacity style={[styles.row, { marginTop: 40, borderColor: '#FF7675', borderWidth: 1 }]} onPress={handleEliminarCuenta}>
          <Text style={[styles.rowText, { color: '#D63031' }]}>Eliminar mi cuenta</Text>
          <Ionicons name="trash-outline" size={20} color="#D63031" />
        </TouchableOpacity>

      </ScrollView>

      <Volver route={"./Profile"} color={theme.volver_button} style={{ top: 50, left: 10 }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { padding: 25, marginTop: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2D3436' },
  content: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#B2BEC3', marginBottom: 15, letterSpacing: 1.5 },
  row: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    backgroundColor: 'white', padding: 18, borderRadius: 15, marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5
  },
  rowText: { fontSize: 16, fontWeight: '600', color: '#2D3436' },
  subText: { fontSize: 12, color: '#636E72' }
});