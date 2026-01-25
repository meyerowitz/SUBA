import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Volver from "../../Components/Botones_genericos/Volver";

export default function Privacidad() {
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isPublicProfile, setIsPublicProfile] = useState(true);

  const handleEliminarCuenta = () => {
    Alert.alert(
      "Eliminar Cuenta",
      "Esta acción es irreversible. ¿Realmente deseas borrar todos tus datos?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive" },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Privacidad</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>SEGURIDAD</Text>

        <TouchableOpacity style={styles.row}>
          <View>
            <Text style={styles.rowText}>Cambiar Contraseña</Text>
            <Text style={styles.subText}>
              Se recomienda usar una clave fuerte
            </Text>
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
            trackColor={{ false: "#D1D1D1", true: "#2E7D32" }}
          />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 25 }]}>
          DATOS PERSONALES
        </Text>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowText}>Perfil Público</Text>
            <Text style={styles.subText}>
              Permitir que conductores vean tu foto
            </Text>
          </View>
          <Switch
            value={isPublicProfile}
            onValueChange={setIsPublicProfile}
            trackColor={{ false: "#D1D1D1", true: "#2E7D32" }}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.row,
            { marginTop: 40, borderColor: "#FF7675", borderWidth: 1 },
          ]}
          onPress={handleEliminarCuenta}
        >
          <Text style={[styles.rowText, { color: "#D63031" }]}>
            Eliminar mi cuenta
          </Text>
          <Ionicons name="trash-outline" size={20} color="#D63031" />
        </TouchableOpacity>
      </ScrollView>

      <Volver
        route={"/pages/Conductor/Profile"}
        color={"#333"}
        style={{ top: 50, left: 10 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: { padding: 25, marginTop: 40 },
  title: { fontSize: 28, fontWeight: "bold", color: "#2D3436" },
  content: { paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B2BEC3",
    marginBottom: 15,
    letterSpacing: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    padding: 18,
    borderRadius: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  rowText: { fontSize: 16, fontWeight: "600", color: "#2D3436" },
  subText: { fontSize: 12, color: "#636E72" },
});
