import { Image } from "expo-image";
import { Asset } from "expo-asset";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, StatusBar, ScrollView, KeyboardAvoidingView,Platform} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import userData from "./Components/Users.json";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Login() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const cerrar_sesion_anterior = async () => {
      try {
        const valor = await AsyncStorage.getItem("@Sesion_usuario");
        if (valor !== null) {
          await AsyncStorage.removeItem("@Sesion_usuario");
        }
      } catch (e) {
        console.error("Error al limpiar AsyncStorage:", e);
      }
    };
    cerrar_sesion_anterior();
  }, []);

  useEffect(() => {
    const cacheGifs = async () => {
      const images = [
        require("../assets/img/driver-loading.gif"),
        require("../assets/img/passenger-loading.gif"),
      ];
      const cacheImages = images.map((image) => Asset.fromModule(image).downloadAsync());
      return Promise.all(cacheImages);
    };
    cacheGifs().catch((err) => console.log("Error precargando GIFs:", err));
  }, []);

  const handleLoginLocal = async () => {
    const user = userData.users.find(
      (u) =>
        (u.email.toLowerCase() === correo.toLowerCase() ||
          u.fullName.toLowerCase() === correo.toLowerCase()) &&
        u.password === password,
    );

    if (user) {
      try {
        await AsyncStorage.setItem("@Sesion_usuario", JSON.stringify(user));
        setUserRole(user.role);
        setIsLoading(true);
        setTimeout(() => {
          // Cambio por if/else
          if (user.role === "driver") {
            router.replace("./pages/Conductor/Home2");
          } else {
            router.replace("./pages/Pasajero/Navigation");
          }
        }, 4000);
      } catch (e) {
        console.error("Error al guardar sesión local:", e);
      }
    } else {
      Alert.alert("Error", "Usuario o contraseña incorrectos");
    }
  };

  const handleLoginAPI = async () => {
    if (!correo || !password) {
      Alert.alert("Error", "Por favor, completa todos los campos");
      return;
    }

    setIsLoading(true);
    const API_URL = "https://subapp-api.onrender.com";

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: correo.toLowerCase().trim(),
          password: password,
        }),
      });

      const loginData = await response.json();

      if (!response.ok) {
        setIsLoading(false);
        Alert.alert("Error", loginData.message || "Credenciales incorrectas");
        return;
      }

      const token = loginData.token || loginData.accessToken;

      const profileResponse = await fetch(`${API_URL}/auth/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      const profileData = await profileResponse.json();

      if (profileData.success) {
        const usuarioAGuardar = { ...profileData.data, token };
        if (usuarioAGuardar) {
            await AsyncStorage.setItem("@Sesion_usuario", JSON.stringify(usuarioAGuardar));
            setUserRole(usuarioAGuardar.role);
            
            //Cambio  por if/else
            if (usuarioAGuardar.role === "driver") {
              router.replace("./pages/Conductor/Home2");
            } else {
              router.replace("./pages/Pasajero/Navigation");
            }
        }
      } else {
        setIsLoading(false);
        Alert.alert("Error", "No se pudieron obtener los datos del perfil.");
      }
    } catch (error) {
      setIsLoading(false);
      console.error("Error Login API:", error);
      Alert.alert("Error de conexión", "No se pudo conectar con el servidor.");
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
        <Image
          source={
            userRole === "driver"
              ? require("../assets/img/driver-loading.gif")
              : require("../assets/img/passenger-loading.gif")
          }
          style={styles.gif}
          contentMode="contain"
        />
        <Text style={styles.loaderText}>
          {userRole === "driver" ? "Preparando tu ruta..." : "Buscando tu viaje..."}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "height" : "padding"}
        style={{ flex: 1, width: "100%" }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.logo}>
              <Image source={require("../assets/img/logo.png")} style={styles.wordmark} />
            </View>

            <Text style={styles.title}>¡Bienvenido de nuevo!</Text>

            <TextInput
              placeholder="Correo electrónico"
              placeholderTextColor="rgba(0, 0, 0, 0.31)"
              autoCapitalize="none"
              keyboardType="email-address"
              value={correo}
              onChangeText={setCorreo}
              style={styles.input}
            />

            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Contraseña"
                placeholderTextColor="rgba(0, 0, 0, 0.31)"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                autoCapitalize="none"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <FontAwesome6 name={showPassword ? "eye-slash" : "eye"} size={20} color="#023A73" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => router.push("/forgotten-password")}>
              <Text style={styles.question}>¿Olvidaste tu contraseña? </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={handleLoginAPI}
              onLongPress={handleLoginLocal}
              delayLongPress={2000}
            >
              <Text style={styles.textButton}>INICIAR SESIÓN</Text>
            </TouchableOpacity>

            <View style={styles.googleContainer}>
              <TouchableOpacity style={styles.googleButton}>
                <Image source={require("../assets/img/google.png")} style={styles.googleIcon} />
                <Text style={styles.googleText}>Continuar con Google</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.redirect}>
              <Text style={styles.question}>¿No tienes cuenta? </Text>
              <TouchableOpacity onPress={() => router.replace("/Register")}>
                <Text style={styles.register}>Regístrate aquí</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { flexGrow: 1, backgroundColor: "#FFFFFF", width: "100%" },
  container: { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 30 },
  logo: { width: 320, height: 88, marginTop: 50, marginBottom: 50 },
  wordmark: { width: "100%", height: "100%" },
  title: { fontSize: 30, fontWeight: "bold", color: "#212121", marginBottom: 60 },
  input: { width: 320, height: 60, padding: 15, borderWidth: 1, borderColor: "#DFDFDF", borderRadius: 100, fontSize: 18, marginBottom: 20, color: "black" },
  passwordContainer: { position: "relative", width: 320 },
  toggleButton: { position: "absolute", right: 20, top: 18 },
  question: { color: "#544F4F", fontWeight: "bold", fontSize: 16 },
  button: { marginTop: 30, width: 320, height: 60, borderRadius: 100, justifyContent: "center", alignItems: "center", backgroundColor: "#FFA311" },
  textButton: { color: "#023A73", fontSize: 18, fontWeight: "bold" },
  googleContainer: { marginTop: 20 },
  googleButton: { flexDirection: "row", width: 320, height: 60, borderRadius: 100, borderWidth: 1, borderColor: "#DFDFDF", justifyContent: "center", alignItems: "center", gap: 10 },
  googleIcon: { width: 24, height: 24 },
  googleText: { fontSize: 16, fontWeight: "bold", color: "#212121" },
  redirect: { flexDirection: "row", marginTop: 25 },
  register: { color: "#0661BC", fontWeight: "bold", fontSize: 16, textDecorationLine: "underline" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" },
  gif: { width: 200, height: 200, borderRadius: 20 },
  loaderText: { marginTop: 20, fontSize: 18, color: "#023A73", fontWeight: "bold" },
});