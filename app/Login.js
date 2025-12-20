import { Image } from "expo-image"
import { Asset } from 'expo-asset';
import { useRouter } from "expo-router"
import { useState , useEffect} from "react"
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View  } from "react-native"

import userData from "./Components/Users.json";

export default function Login() {
  const router = useRouter()
  const [correo, setCorreo] = useState("")
  const [password, setPassword] = useState("")

  // Estados para controlar la carga y qué GIF mostrar
  const [isLoading, setIsLoading] = useState(false)
  const [userRole, setUserRole] = useState(null)



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

const handleLogin = async () => {
    // Buscamos al usuario (por email o nombre)
    const user = userData.users.find(
      (u) =>
        (u.email.toLowerCase() === correo.toLowerCase() ||
         u.fullName.toLowerCase() === correo.toLowerCase()) &&
        u.password === password
    );

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

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <Image
  source={userRole === "driver" ? require("../assets/img/driver-loading.gif") : require("../assets/img/passenger-loading.gif")}
  style={styles.gif}
  contentMode="contain"
  cachePolicy="memory-disk" // Prioriza cargar desde la memoria RAM o disco
  priority="high"           // Le dice al sistema que este recurso es urgente
  placeholder={{ blurhash: "L6PZfSaD00jE.AyE_3t7t7Rj4n9w" }} // O simplemente una imagen estática
  transition={100}
/>
        <Text style={styles.loaderText}>
          {userRole === "driver" ? "Preparando tu ruta..." : "Buscando tu viaje..."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.container}>
        <View style={styles.logo}>
          <Image source={require("../assets/img/logo.png")} style={styles.wordmark} />
        </View>

        <Text style={styles.title}>¡Bienvenido de nuevo!</Text>

        <TextInput placeholder="Correo electrónico" value={correo} onChangeText={setCorreo} style={styles.input} />
        <TextInput
          textContentType="password"
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        <Text style={styles.question}>¿Olvidaste tu contraseña? </Text>

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
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
    </View>
  )
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  container: {
    height: "100%",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding:'10%'
  },
  logo: {
    alignItems: "center",
    justifyContent: "center",
    width: 320,
    height: 88.28,
    marginTop: 50,
    marginBottom: 50,
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
  },
  loaderText: {
    marginTop: 20,
    fontSize: 18,
    color: "#023A73",
    fontWeight: "bold",
    fontFamily: "roboto",
  },
})