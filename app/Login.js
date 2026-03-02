import { Image } from "expo-image";
import { Asset } from "expo-asset";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, StatusBar, ScrollView, KeyboardAvoidingView,Platform} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import userData from "./Components/Users.json";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from './Components/Temas_y_colores/ThemeContext';

export default function Login() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [state,setState] = useState({email: "",name:""})
  const [id,setId] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Estados para controlar la carga y qué GIF mostrar
  const [isLoading, setIsLoading] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const { theme, toggleTheme, isDark } = useTheme();

//-------------------------------------------------
//     UseEffect que limpia la sesion anterior
//-------------------------------------------------
useEffect(()=>{
  
  const cerrar_sesion_anterior = async () => {

    try {
    const valor = await AsyncStorage.getItem('@Sesion_usuario');

    if (valor !== null) {
      // Si hay datos, procedemos a borrar
      await AsyncStorage.removeItem('@Sesion_usuario');
      console.log("Existían datos y han sido borrados.");
    } else {
      // Si es null, el almacenamiento ya estaba vacío
      console.log("El almacenamiento ya está vacío, nada que borrar.");
    }
  } catch (e) {
    console.error("Error al verificar:", e);
  }
  }; cerrar_sesion_anterior()
  
},[])



//-------------------------------------------------
useEffect(() => {
  const cacheGifs = async () => {
    const images = [
      require("../assets/img/driver-loading.gif"),
      require("../assets/img/passenger-loading.gif"),
    ];

    // Mapea los recursos para que Expo los prepare en caché
    const cacheImages = images.map(image => {
      return Asset.fromModule(image).downloadAsync();
    });

    return Promise.all(cacheImages);
  };

  cacheGifs().catch(err => console.log("Error precargando GIFs:", err));
}, []);

//----------------------------------------------------------
//        handleLogin sin API solo el array userData
//----------------------------------------------------------
const handleLogin = async () => {
    // Buscamos al usuario (por email o nombre)
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
    // --- PASO 1: LOGIN ---
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: correo.toLowerCase().trim(),
        password: password,
      }),
    });

    const loginData = await response.json();
    
    // 🔍 RASTREO 1: ¿Qué responde el login?
    console.log("1. RESPUESTA LOGIN:", JSON.stringify(loginData, null, 2));

    if (!response.ok) {
      setIsLoading(false);
      Alert.alert("Error", loginData.message || "Credenciales incorrectas");
      return;
    }

    // Buscamos el token en diferentes lugares por si la API cambió
    const token = loginData.token || loginData.accessToken || (loginData.data && loginData.data.token);
    
    console.log("2. TOKEN EXTRAÍDO:", token ? "SÍ (empieza por " + token.substring(0,10) + "...)" : "NO SE ENCONTRÓ ❌");

    // --- PASO 2: OBTENER PERFIL ---
    const profileResponse = await fetch(`${API_URL}/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    const profileData = await profileResponse.json();
    
    // 🔍 RASTREO 2: ¿Qué responde el perfil?
    console.log("3. RESPUESTA PERFIL (/auth/me):", JSON.stringify(profileData, null, 2));

    if (profileData.success) {
      // 💡 LA CORRECCIÓN MÁGICA:
      // Combinamos los datos del perfil con el token que sacamos del login
      const usuarioAGuardar = { 
        ...profileData.data, 
        token: token // <--- Forzamos que el token entre al objeto
      };

      console.log("4. OBJETO FINAL A GUARDAR:", JSON.stringify(usuarioAGuardar, null, 2));

      await AsyncStorage.setItem("@Sesion_usuario", JSON.stringify(usuarioAGuardar));
      console.log()
      setUserRole(usuarioAGuardar.role);
      
      if (usuarioAGuardar.role === "driver") {
        router.replace("./pages/Conductor/Home2");
      } else {
        router.replace("./pages/Pasajero/Navigation");
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
          contentContainerStyle={{flexGrow: 1, backgroundColor: "#FFFFFF", width: "100%", height:'110%'}}
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

            <TouchableOpacity onPress={() => router.push("/pages/olvide_contrasena/forgotten-password")}>
              <Text style={styles.question}>¿Olvidaste tu contraseña? </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={handleLoginAPI}
              onLongPress={handleLogin}
              delayLongPress={2000}
            >
              <Text style={styles.textButton}>INICIAR SESIÓN</Text>
            </TouchableOpacity>

                <View style={styles.googleContainer}>
                  <TouchableOpacity 
                  style={styles.googleButton} 
                  /*onPress={() => signInA()}*/
                    >
                    <Image source={require("../assets/img/google.png")} style={styles.googleIcon} />
                    <Text style={styles.googleText}>Continuar con Google</Text>
                  </TouchableOpacity>
                </View>

                <View style={{width: 320,marginTop: 20,display: "flex",flexDirection: "row",justifyContent: "center",alignItems: "center",}}>
                  <Text style={{color: "#544F4F",fontFamily: "roboto",fontWeight: "bold",fontSize: 16,}}>¿No tienes cuenta? </Text>
                  <TouchableOpacity onPress={() => router.replace("/Register")}>
                    <Text style={{color: "#0661BC",fontFamily: "roboto",fontWeight: "bold",fontSize: 16, textDecorationLine: "underline",}}>Regístrate aquí</Text>
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
  container: { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 100 },
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