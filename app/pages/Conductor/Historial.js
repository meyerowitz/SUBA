import React from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Volver from "../../Components/Botones_genericos/Volver";

export default function HistorialViajes() {
  const viajes = [
    {
      id: "1",
      ruta: "Ruta Principal - Centro",
      fecha: "Hoy, 08:30 AM",
      monto: "+ $45.00",
    },
    {
      id: "2",
      ruta: "Ruta 104 - Express",
      fecha: "Ayer, 02:15 PM",
      monto: "+ $38.50",
    },
    {
      id: "3",
      ruta: "Ruta Sur - Periférico",
      fecha: "23 En, 07:00 AM",
      monto: "+ $52.00",
    },
  ];

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons name="bus-clock" size={24} color="#003366" />
      </View>

      <View style={styles.infoText}>
        <Text style={styles.mainTitle}>{item.ruta}</Text>
        <Text style={styles.subLabel}>{item.fecha}</Text>
      </View>

      <View style={styles.amountBox}>
        <Text style={styles.priceText}>{item.monto}</Text>
        <Ionicons name="chevron-forward" size={18} color="#D1D1D1" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#F8F9FA" barStyle="dark-content" />

      <View style={styles.headerContainer}>
        <Volver
          route={"/pages/Conductor/Profile"}
          color={"black"}
          style={{ top: 20, left: 10 }}
        />
        <Text style={styles.headerTitle}>Historial de Viajes</Text>
      </View>

      <FlatList
        data={viajes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listArea}
        ListHeaderComponent={
          <Text style={styles.sectionTag}>VIAJES RECIENTES</Text>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },

  headerContainer: {
    paddingHorizontal: 15,
    marginTop: 10,
    flexDirection: "column",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2D3436",
    marginTop: 15,
    marginLeft: 30,
  },

  listArea: { paddingHorizontal: 20, paddingBottom: 30 },
  sectionTag: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B2BEC3",
    marginTop: 25,
    marginBottom: 15,
    letterSpacing: 1.5,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 18,
    borderRadius: 22,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F0F4F8",
    justifyContent: "center",
    alignItems: "center",
  },
  infoText: { flex: 1, marginLeft: 15 },
  mainTitle: { fontSize: 16, fontWeight: "700", color: "#2D3436" },
  subLabel: { fontSize: 13, color: "#636E72", marginTop: 2 },
  amountBox: { flexDirection: "row", alignItems: "center" },
  priceText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#4CAF50",
    marginRight: 8,
  },
});
