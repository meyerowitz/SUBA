import React, { useState, useEffect } from "react";
import {StyleSheet,Text,View,TouchableOpacity,StatusBar,ScrollView, Alert,
} from "react-native";
import {
  Ionicons,
  FontAwesome5,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Volver from "../../Components/Botones_genericos/Volver";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Profile() {
     const handleLogout = () => {
  Alert.alert(
    "Cerrar Sesión",
    "¿Estás segura de que quieres salir?",
    [
      { text: "Cancelar", style: "cancel" },
      { 
        text: "Sí, salir", 
        onPress: async () => {
          await AsyncStorage.removeItem('@Sesion_usuario');
          router.replace('/Login');
        } 
      }
    ]
  );}
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#D99015" barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* FONDO NARANJA SUPERIOR */}
        <View style={styles.orangeHeader} />

        {/* TARJETA PRINCIPAL BLANCA */}
        <View style={styles.profileBox}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={55} color="#003366" />
          </View>

          <Text style={styles.userName}>Juan Pérez</Text>
          <Text style={styles.userEmail}>cheyerowitzrebeca@gmail.com</Text>

          {/* CÁPSULA GRIS DE INFO - ESTILO EXACTO IMAGEN */}
          <View style={styles.infoCapsule}>
            <View style={styles.infoItem}>
              <View style={[styles.miniIcon, { backgroundColor: "#003366" }]}>
                <MaterialCommunityIcons
                  name="steering"
                  size={14}
                  color="white"
                />
              </View>
              <Text style={styles.infoText}>Conductor Activo</Text>
            </View>

            <View style={styles.infoItem}>
              <View style={[styles.miniIcon, { backgroundColor: "#4CAF50" }]}>
                <FontAwesome5 name="bus" size={12} color="white" />
              </View>
              <Text style={styles.infoText}>Unidad: #104</Text>
            </View>
          </View>
        </View>

        {/* SECCIÓN GENERAL */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionLabel}>GENERAL</Text>

          <MenuButton
            icon="settings"
            title="Configuración"
            sub="Actualiza tu perfil y preferencias"
            iconColor="#1976D2"
            bgColor="#E3F2FD"
            onPress={() => {
              router.push("/pages/Conductor/Configuracion");
            }}
          />

          <MenuButton
            icon="notifications"
            title="Notificaciones"
            sub="Cambiar tus preferencias de notificación"
            iconColor="#FFA311"
            bgColor="#FFF9C4"
            onPress={() => {
              router.push("/pages/Conductor/Notificaciones");
            }}
          />
          <MenuButton
            icon="shield-checkmark"
            title="Privacidad"
            sub="Cambia tu contraseña"
            iconColor="#2E7D32"
            bgColor="#E8F5E9"
            e
            onPress={() => {
              router.push("/pages/Conductor/Privacidad");
            }}
          />

          {/* SECCIÓN OPERACIONES */}
          <Text style={[styles.sectionLabel, { marginTop: 25 }]}>
            OPERACIONES
          </Text>

          <MenuButton
            icon="time-outline"
            title="Historial de Viajes"
            sub="Revisa tus rutas y ganancias pasadas"
            iconColor="#023A73"
            bgColor="#E1F5FE"
            onPress={() => router.push("/pages/Conductor/Historial")}
          />
        </View>

        {/* BOTÓN CERRAR SESIÓN ESTILO IMAGEN */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>CERRAR SESIÓN</Text>
        </TouchableOpacity>
      </ScrollView>

      <Volver route={"./Home2"} color={"white"} style={styles.btnVolver} />
    </SafeAreaView>
  );
}

const MenuButton = ({ icon, title, sub, iconColor, bgColor, onPress }) => (
  <TouchableOpacity style={styles.menuRow} onPress={onPress}>
    <View style={[styles.iconBox, { backgroundColor: bgColor }]}>
      <Ionicons name={icon} size={22} color={iconColor} />
    </View>
    <View style={styles.textColumn}>
      <Text style={styles.mainText}>{title}</Text>
      <Text style={styles.subText}>{sub}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#D1D1D1" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { paddingBottom: 40 },
  orangeHeader: {
    backgroundColor: "#D99015",
    height: 160,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  profileBox: {
    backgroundColor: "white",
    width: "92%",
    alignSelf: "center",
    marginTop: -80,
    borderRadius: 35,
    padding: 25,
    alignItems: "center",
    elevation: 15,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  avatarCircle: {
    width: 95,
    height: 95,
    borderRadius: 50,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#003366",
    marginBottom: 10,
  },
  userName: { fontSize: 26, fontWeight: "bold", color: "#212121" },
  userEmail: { fontSize: 14, color: "#757575", marginBottom: 20 },

  infoCapsule: {
    flexDirection: "row",
    backgroundColor: "#F0F4F8",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: "100%",
    justifyContent: "space-between",
  },
  infoItem: { flexDirection: "row", alignItems: "center" },
  miniIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  infoText: { fontSize: 13, fontWeight: "bold", color: "#212121" },

  menuSection: { paddingHorizontal: 25, marginTop: 30 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#BDBDBD",
    marginBottom: 15,
    letterSpacing: 1,
  },

  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 18,
    borderRadius: 25,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  iconBox: {
    width: 45,
    height: 45,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  textColumn: { flex: 1, marginLeft: 15 },
  mainText: { fontSize: 18, fontWeight: "bold", color: "#212121" },
  subText: { fontSize: 13, color: "#9E9E9E" },

  logoutButton: {
    backgroundColor: "#D99015",
    marginHorizontal: 25,
    marginTop: 35,
    height: 65,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  logoutText: { color: "#003366", fontWeight: "900", fontSize: 17 },
  btnVolver: {
    position: "absolute",
    top: 25,
    left: 15,
    zIndex: 10,
    padding: 5,
  },
});
