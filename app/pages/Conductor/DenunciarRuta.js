import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Volver from "../../Components/Botones_genericos/Volver";

const API_URL = "https://subapp-api.onrender.com/api";
const DRIVER_STATE_KEY = "@DriverState";

export default function DenunciarRuta() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [fetchingReasons, setFetchingReasons] = useState(true);

  // Datos del reporte
  const [motivos, setMotivos] = useState([]);
  const [motivoSeleccionado, setMotivoSeleccionado] = useState("");
  const [descripcionPersonalizada, setDescripcionPersonalizada] = useState("");
  const [notas, setNotas] = useState("");

  // Datos del contexto
  const [driverId, setDriverId] = useState(null);
  const [currentRouteId, setCurrentRouteId] = useState(null);
  const [currentRouteName, setCurrentRouteName] = useState("");

  useEffect(() => {
    const inicializar = async () => {
      try {
        // 1. Obtener sesión del conductor
        const sessionData = await AsyncStorage.getItem("@Sesion_usuario");
        if (sessionData) {
          const session = JSON.parse(sessionData);
          setDriverId(session._id || session.id);
        }

        // 2. Determinar Ruta (Params > AsyncStorage)
        if (params.routeId) {
          setCurrentRouteId(params.routeId);
          setCurrentRouteName(params.routeName || "Ruta Asignada");
        } else {
          // Intentar recuperar del estado persistido
          const savedState = await AsyncStorage.getItem(DRIVER_STATE_KEY);
          if (savedState) {
            const { route } = JSON.parse(savedState);
            if (route && route.id) {
              setCurrentRouteId(route.id);
              setCurrentRouteName(route.name);
            }
          }
        }

        // 3. Cargar motivos desde la API
        const response = await fetch(`${API_URL}/reportes/motivos`);
        const json = await response.json();
        if (json.success) {
          setMotivos(json.data);
        }
      } catch (error) {
        console.error("Error al inicializar denuncia:", error);
        Alert.alert("Error", "No se pudieron cargar los motivos de reporte.");
      } finally {
        setFetchingReasons(false);
      }
    };

    inicializar();
  }, []);

  const handleEnviarReporte = async () => {
    if (!currentRouteId) {
      Alert.alert(
        "Error de Ruta",
        "No tienes una ruta asignada. Por favor, inicia tu turno primero.",
      );
      return;
    }

    if (!motivoSeleccionado) {
      Alert.alert(
        "Campo requerido",
        "Por favor selecciona un motivo para el reporte.",
      );
      return;
    }

    if (motivoSeleccionado === "otro" && !descripcionPersonalizada.trim()) {
      Alert.alert(
        "Campo requerido",
        "Por favor describe el motivo personalizado.",
      );
      return;
    }

    setLoading(true);

    try {
      const payload = {
        routeId: currentRouteId,
        driverId: driverId,
        reason: motivoSeleccionado,
        customReason:
          motivoSeleccionado === "otro" ? descripcionPersonalizada : undefined,
        notes: notas,
      };

      const response = await fetch(`${API_URL}/reportes/crear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert(
          "Reporte Enviado",
          "La incidencia ha sido registrada. El equipo administrativo revisará la situación de la ruta.",
          [{ text: "Entendido", onPress: () => router.back() }],
        );
      } else {
        throw new Error(result.error || "No se pudo enviar el reporte.");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

      <View style={styles.header}>
        <Text style={styles.title}>Reportar Incidencia</Text>
        <Text style={styles.subtitle}>
          Informa sobre bloqueos o problemas en la vía para actualizar el
          sistema.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* INFO DE LA RUTA */}
        <View
          style={[
            styles.infoBox,
            !currentRouteId && {
              backgroundColor: "#FEE2E2",
              borderColor: "#FECACA",
            },
          ]}
        >
          <Ionicons
            name={currentRouteId ? "bus" : "warning"}
            size={20}
            color={currentRouteId ? "#003366" : "#EF4444"}
          />
          <Text
            style={[styles.infoText, !currentRouteId && { color: "#B91C1C" }]}
          >
            {currentRouteId
              ? `Ruta: ${currentRouteName}`
              : "Debes iniciar turno para reportar una ruta."}
          </Text>
        </View>

        <Text style={styles.label}>Motivo del Reporte</Text>
        <View style={styles.pickerContainer}>
          {fetchingReasons ? (
            <ActivityIndicator
              size="small"
              color="#003366"
              style={{ padding: 15 }}
            />
          ) : (
            <Picker
              selectedValue={motivoSeleccionado}
              onValueChange={(itemValue) => setMotivoSeleccionado(itemValue)}
              style={styles.picker}
            >
              <Picker.Item
                label="Selecciona un motivo..."
                value=""
                color="#999"
              />
              {motivos.map((m) => (
                <Picker.Item key={m.value} label={m.label} value={m.value} />
              ))}
            </Picker>
          )}
        </View>

        {motivoSeleccionado === "otro" && (
          <>
            <Text style={styles.label}>Especifica el motivo</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Accidente en la intersección X..."
              value={descripcionPersonalizada}
              onChangeText={setDescripcionPersonalizada}
              multiline
            />
          </>
        )}

        <Text style={styles.label}>Notas adicionales (Opcional)</Text>
        <TextInput
          style={[styles.input, { height: 100, textAlignVertical: "top" }]}
          placeholder="Detalles adicionales que puedan ayudar al equipo..."
          value={notas}
          onChangeText={setNotas}
          multiline
        />

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleEnviarReporte}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons
                name="send"
                size={20}
                color="white"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.submitButtonText}>Enviar Reporte</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Tu reporte será verificado por el centro de control. El mal uso de
          esta herramienta puede afectar tu calificación como conductor.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: { padding: 25, marginTop: 30 },
  title: { fontSize: 28, fontWeight: "bold", color: "#2D3436" },
  subtitle: { fontSize: 14, color: "#636E72", marginTop: 5 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },

  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    padding: 15,
    borderRadius: 15,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#BBDEFB",
  },
  infoText: { color: "#003366", fontSize: 14, marginLeft: 10, flex: 1 },

  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D3436",
    marginBottom: 10,
    marginTop: 10,
  },
  pickerContainer: {
    backgroundColor: "white",
    borderRadius: 15,
    marginBottom: 20,
    elevation: 2,
    overflow: "hidden",
  },
  picker: { height: 55, width: "100%" },

  input: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    fontSize: 16,
    color: "#2D3436",
    marginBottom: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#EEE",
  },

  submitButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 18,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    elevation: 4,
  },
  disabledButton: { backgroundColor: "#FCA5A5" },
  submitButtonText: { color: "white", fontSize: 18, fontWeight: "bold" },

  disclaimer: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 25,
    lineHeight: 18,
  },
});

