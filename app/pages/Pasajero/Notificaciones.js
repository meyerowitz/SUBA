import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Volver from '../../Components/Botones_genericos/Volver';
import { useTheme } from '../../Components/Temas_y_colores/ThemeContext';

export default function Notificaciones() {
  const [isAllEnabled, setIsAllEnabled] = useState(true);
  const [isPromosEnabled, setIsPromosEnabled] = useState(false);
  const { theme, isDark } = useTheme(); //temas oscuro y claro
  
  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.background}}>
      <View style={styles.header}>
        <Text style={{fontSize: 28, fontWeight: 'bold', color: theme.text}}>Notificaciones</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONFIGURACIÓN PRINCIPAL</Text>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowText}>Permitir Notificaciones</Text>
              <Text style={styles.subText}>Activar alertas en el dispositivo</Text>
            </View>
            <Switch 
              value={isAllEnabled} 
              onValueChange={setIsAllEnabled}
              trackColor={{ false: "#D1D1D1", true: "#D99015" }}
            />
          </View>
        </View>

        <View style={[styles.section, { opacity: isAllEnabled ? 1 : 0.6 }]}>
          <Text style={styles.sectionTitle}>CATEGORÍAS</Text>
          
          <NotificationItem 
            title="Alertas de Viaje" 
            sub="Cambios en el estado de tu ruta" 
            value={isAllEnabled} 
          />
          
          <NotificationItem 
            title="Promociones" 
            sub="Nuevos descuentos y beneficios" 
            value={isPromosEnabled} 
            onToggle={setIsPromosEnabled} 
          />
        </View>
      </ScrollView>

      <Volver route={"./Profile"} color={theme.volver_button} style={{ top: 50, left: 10 }} />
    </SafeAreaView>
  );
}

// Sub-componente para ahorrar espacio
const NotificationItem = ({ title, sub, value, onToggle }) => (
  <View style={styles.row}>
    <View style={{ flex: 1 }}>
      <Text style={styles.rowText}>{title}</Text>
      <Text style={styles.subText}>{sub}</Text>
    </View>
    <Switch 
        value={value} 
        onValueChange={onToggle}
        trackColor={{ false: "#D1D1D1", true: "#D99015" }} 
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { padding: 25, marginTop: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2D3436' },
  content: { paddingHorizontal: 20 },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#B2BEC3', marginBottom: 15, letterSpacing: 1 },
  row: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 10,
    elevation: 2
  },
  rowText: { fontSize: 16, fontWeight: '600', color: '#2D3436' },
  subText: { fontSize: 12, color: '#636E72' }
});