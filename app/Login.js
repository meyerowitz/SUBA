import { Image } from "expo-image"
import { Asset } from 'expo-asset';
import { useRouter } from "expo-router"
import { useState , useEffect} from "react"
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View , StatusBar, ScrollView,KeyboardAvoidingView, 
  Platform} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import userData from "./Components/Users.json";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Login() {
  const router = useRouter()
  const [correo, setCorreo] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  // Estados para controlar la carga y qué GIF mostrar
  const [isLoading, setIsLoading] = useState(false)
  const [userRole, setUserRole] = useState(null)

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
 const handlePasswordChange = (text) => {
    setPassword(text)
    const validation = validatePassword(text)
    setPasswordStrength(validation.strength)
  }

const handleLogin = async () => {
    // Buscamos al usuario (por email o nombre)
    const user = userData.users.find(
      (u) =>
        (u.email.toLowerCase() === correo.toLowerCase() ||
         u.fullName.toLowerCase() === correo.toLowerCase()) &&
        u.password === password
    );
    try {
      const jsonValue = JSON.stringify(user);
      await AsyncStorage.setItem('@Sesion_usuario', jsonValue);
      console.log("Sesion guardada con éxito");
      const jsonValue2 = await AsyncStorage.getItem('@Sesion_usuario');
      console.log(jsonValue2);
    } catch (e) {
      console.error("Error al guardar:", e);
    }

    if (user) {
      setUserRole(user.role); // Guardamos el rol ('driver' o 'passenger')
      setIsLoading(true);     // Activamos la vista de carga

      // Simulamos un tiempo de carga para que se vea el GIF
      setTimeout(() => {
        if (user.role === "driver") {
          router.replace("./pages/Conductor/Home");
        } else {
          router.replace("./pages/Pasajero/Navigation");
        }
      }, 4000); // 4 segundos de animación
    } else {
      Alert.alert("Error", "Usuario o contraseña incorrectos");
    }
  }

  const handleLogin2 = async () => {
    console.log('consultando a la API principal')
  // 1. Validación inicial
  if (!correo || !password) {
    Alert.alert("Error", "Por favor, completa todos los campos");
    return;
  }

  try {
    setIsLoading(true); // Iniciamos el estado de carga (para ver tu GIF)

    // 2. Petición POST a la API
    const response = await fetch('https://subapp-api.onrender.com/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Enviamos 'correo' como email. Si tu API acepta nombre o email en el mismo campo,
        // asegúrate de que el backend esté preparado para recibirlo así.
        email: correo.toLowerCase(), 
        password: password,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      // 3. Si el login es exitoso, extraemos el usuario y el rol que devuelve tu API
      // Nota: Ajusta 'data.user' o 'data.role' según cómo responda tu servidor
      const role = 'passenger'; 
      setUserRole(role);

      // 4. Mantenemos tu simulación de carga de 4 segundos para el GIF
      setTimeout(() => {
        if (role === "driver") {
          router.replace("/pages/Conductor/Home");
        } else {
          router.replace("/Navigation");
        }
      }, 4000);

    } else {
      // 5. Si la API devuelve error (401, 404, etc.)
      setIsLoading(false);
      Alert.alert("Error", data.message || "Usuario o contraseña incorrectos");
    }
  } catch (error) {
    // Error de red o del servidor caído
    setIsLoading(false);
    Alert.alert("Error de conexión", "No se pudo conectar con el servidor. Inténtalo más tarde.");
    console.error(error);
  }

};

{!isLoading && (
  
        <View style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }}>
          <StatusBar translucent={true} backgroundColor="transparent" barStyle="dark-content"></StatusBar>
          <Image source={require("../assets/img/driver-loading.gif")} priority="high" />
          <Image source={require("../assets/img/passenger-loading.gif")} priority="high" />
        </View>
      )}

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar translucent={true} backgroundColor="transparent" barStyle="dark-content"></StatusBar>
        <Image
          source={userRole === "driver" ? require("../assets/img/driver-loading.gif") : require("../assets/img/passenger-loading.gif")}
          style={styles.gif}
          contentMode="contain"
          cachePolicy="memory-disk" // Prioriza cargar desde la memoria RAM o disco
          priority="high"           // Le dice al sistema que este recurso es urgente
          placeholder={{ blurhash: "L6PZfSaD00jE.AyE_3t7t7Rj4n9w" }} // O simplemente una imagen estática
          transition={10}
/>
        <Text style={styles.loaderText}>
          {userRole === "driver" ? "Preparando tu ruta..." : "Buscando tu viaje..."}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1,justifyContent: "center",alignItems: "center",backgroundColor: "rgb(255, 3, 3)",}}>
      <StatusBar translucent={true} backgroundColor="transparent" barStyle="dark-content"></StatusBar>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
           style={{ flex: 1, width: '100%', backgroundColor:'blue' }}
          >
            <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: "#ffffffff", width:'100%' }} 
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              >
             
                  <View style={styles.container}>
                  <View style={styles.logo}>
                    <Image source={require("../assets/img/logo.png")} style={styles.wordmark} />
                  </View>

          <Text style={styles.title}>¡Bienvenido de nuevo!</Text>

        <TextInput placeholder="Correo electrónico" autoCapitalize="none" keyboardType="email-address" value={correo} onChangeText={setCorreo} style={styles.input} />
        <View style={styles.passwordContainer}>
          <TextInput
            textContentType="password"
            placeholder="contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            style={styles.passwordInput}
          />
          <TouchableOpacity style={styles.toggleButton} onPress={() => setShowPassword(!showPassword)}>
            <FontAwesome6 name={showPassword ? "eye-slash" : "eye"} size={20} color="#023A73" />
          </TouchableOpacity>
        </View>

        <Text style={styles.question}>¿Olvidaste tu contraseña? </Text>

        <TouchableOpacity style={styles.button} onPress={handleLogin2} onLongPress={handleLogin} delayLongPress={1000} >
          <Text style={styles.textButton}>INICIAR SESIÓN</Text>
        </TouchableOpacity>

        <View style={styles.googleContainer}>
          <TouchableOpacity onPress={()=>{ router.replace("./pages/Pasajero/Navigation");}} style={styles.googleButton}>
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
  )
}

const styles = StyleSheet.create({
  page: {
    flex: 1,justifyContent: "center",alignItems: "center",backgroundColor: "#ffffffff",
  },
  container: {
    flex:1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
   
  },
  logo: {
    alignItems: "center",
    justifyContent: "center",
    width: 320,
    height: 88.28,
    marginTop: 50,
    marginBottom: 50,
  },
    passwordContainer: {
    position: "relative",
    width: 320,
    marginBottom: 20,
  },
   toggleButton: {
    position: "absolute",
    right: 15,
    top: 18,
    padding: 5,
  },
  wordmark: {
    width: 320,
    height: 88.28,
  },
  title: {
    fontSize: 30,
    fontFamily: "roboto",
    fontWeight: "bold",
    color: "#212121",
    marginBottom: 60,
  },
  input: {
    width: 320,
    height: 60,
    padding: 10,
    borderWidth: 1,
    borderColor: "#DFDFDF",
    borderRadius: 100,
    fontFamily: "roboto",
    fontSize: 18,
    marginBottom: 20,
  },
  question: {
    color: "#544F4F",
    fontFamily: "roboto",
    fontWeight: "bold",
    fontSize: 16,
  },
   passwordInput: {
    width: 320,
    height: 60,
    padding: 10,
    paddingRight: 50,
    borderWidth: 1,
    borderColor: "#DFDFDF",
    borderRadius: 100,
    fontFamily: "roboto",
    fontSize: 18,
  },
  button: {
    display: "flex",
    marginTop: 20,
    width: 320,
    height: 60,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFA311",
  },
  textButton: {
    color: "#023A73",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "roboto",
  },
  googleContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  googleButton: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: 320,
    height: 60,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#DFDFDF",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    gap: 10,
  },
  googleIcon: {
    width: 24,
    height: 24,
  },
  googleText: {
    fontSize: 16,
    fontFamily: "roboto",
    fontWeight: "bold",
    color: "#212121",
  },
  redirect: {
    width: 320,
    marginTop: 20,
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  register: {
    color: "#0661BC",
    fontFamily: "roboto",
    fontWeight: "bold",
    fontSize: 16,
    textDecorationLine: "underline",
  },

  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  gif: {
    width: 200,
    height: 200,
    borderRadius:20
  },
  loaderText: {
    marginTop: 20,
    fontSize: 18,
    color: "#023A73",
    fontWeight: "bold",
    fontFamily: "roboto",
  },
})