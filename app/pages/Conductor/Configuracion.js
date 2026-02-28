import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Volver from "../../Components/Botones_genericos/Volver";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Configuracion() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isGpsOptimized, setIsGpsOptimized] = useState(true);
  const [profileImage, setProfileImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      const sessionData = await AsyncStorage.getItem("@Sesion_usuario");
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.profilePictureUrl) {
          setProfileImage(session.profilePictureUrl);
        }
      }
    };
    loadSession();
  }, []);

  const handleUploadImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso requerido", "Se necesita permiso para acceder a las imágenes.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled) return;

      const uri = result.assets[0].uri;
      setIsUploading(true);

      const sessionData = await AsyncStorage.getItem("@Sesion_usuario");
      if (!sessionData) {
        Alert.alert("Error", "No se encontró una sesión activa.");
        setIsUploading(false);
        return;
      }
      const session = JSON.parse(sessionData);
      const token = session.token;

      if (!token) {
        Alert.alert("Error", "Token de autenticación no encontrado.");
        setIsUploading(false);
        return;
      }

      const formData = new FormData();
      const fileName = uri.split("/").pop();
      const match = /\.(\w+)$/.exec(fileName || "");
      const type = match ? `image/${match[1]}` : `image`;

      formData.append("file", {
        uri: Platform.OS === "android" ? uri : uri.replace("file://", ""),
        name: fileName,
        type,
      });

      const API_URL = "https://subapp-api.onrender.com"; 
      console.log("📤 Subiendo a:", `${API_URL}/auth/foto-perfil`);
      const response = await fetch(`${API_URL}/auth/foto-perfil`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      console.log("📥 Status del servidor:", response.status);
      const data = await response.json();

      if (response.ok && data.url) {
        const updatedSession = { ...session, profilePictureUrl: data.url };
        await AsyncStorage.setItem("@Sesion_usuario", JSON.stringify(updatedSession));
        setProfileImage(data.url);
        Alert.alert("¡Éxito!", "Tu foto de perfil ha sido actualizada.");
      } else {
        throw new Error(data.error || "Error al subir la imagen");
      }
    } catch (e) {
      console.log("pickImage error", e);
      Alert.alert("Error", e.message || "No se pudo actualizar la foto.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Configuración</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>APARIENCIA</Text>

        <View style={styles.row}>
          <View>
            <Text style={styles.rowText}>Modo Oscuro</Text>
            <Text style={styles.subText}>Cambia el aspecto visual</Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={setIsDarkMode}
            trackColor={{ false: "#D1D1D1", true: "#D99015" }}
          />
        </View>

        <TouchableOpacity
          style={styles.row}
          onPress={handleUploadImage}
          disabled={isUploading}
        >
          <View>
            <Text style={styles.rowText}>Foto de Perfil</Text>
            <Text style={styles.subText}>Actualiza tu foto de perfil</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {isUploading ? (
              <ActivityIndicator
                size="small"
                color="#D99015"
                style={{ marginRight: 10 }}
              />
            ) : profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={{ width: 42, height: 42, borderRadius: 12 }}
              />
            ) : (
              <Ionicons name="person" size={20} color="#636E72" />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row}>
          <View>
            <Text style={styles.rowText}>Idioma</Text>
            <Text style={styles.subText}>Español (Latinoamérica)</Text>
          </View>
          <Ionicons name="language-outline" size={20} color="#636E72" />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 25 }]}>
          SISTEMA Y MAPAS
        </Text>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowText}>Optimización de GPS</Text>
            <Text style={styles.subText}>Mejora la precisión de las rutas</Text>
          </View>
          <Switch
            value={isGpsOptimized}
            onValueChange={setIsGpsOptimized}
            trackColor={{ false: "#D1D1D1", true: "#D99015" }}
          />
        </View>

        <TouchableOpacity style={styles.row}>
          <View>
            <Text style={styles.rowText}>Unidades de distancia</Text>
            <Text style={styles.subText}>Kilómetros (km)</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 25 }]}>SOPORTE</Text>

        <TouchableOpacity style={styles.row}>
          <View>
            <Text style={styles.rowText}>Centro de Ayuda</Text>
            <Text style={styles.subText}>Preguntas frecuentes y soporte</Text>
          </View>
          <Ionicons name="help-circle-outline" size={22} color="#D99015" />
        </TouchableOpacity>
      </ScrollView>

      <Volver
        route={"/pages/Conductor/Profile"}
        color={"#333"}
        style={{ top: 35, left: 10 }}
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
    fontSize: 11,
    fontWeight: "800",
    color: "#B2BEC3",
    marginBottom: 15,
    letterSpacing: 1.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    padding: 18,
    borderRadius: 20,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  rowText: { fontSize: 16, fontWeight: "600", color: "#2D3436" },
  subText: { fontSize: 12, color: "#636E72" },
});
