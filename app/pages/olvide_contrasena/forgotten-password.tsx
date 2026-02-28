import { Image } from "expo-image"
import { useRouter } from "expo-router"
import { useState } from "react"
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, ScrollView } from "react-native"
import { useRecovery } from "@/context/RecoveryContext"
import { sendVerificationCode } from "@/services/emailService"
import Volver from "../../Components/Botones_genericos/Volver"
import { SafeAreaView } from "react-native-safe-area-context"

// URL de Producción en Render
const API_URL = "https://subapp-api.onrender.com";

export default function ForgottenPassword() {
  const router = useRouter()
  const { setEmail, setVerificationCode } = useRecovery()
  const [emailInput, setEmailInput] = useState("")
  const [emailError, setEmailError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const handleEmailChange = (text: string) => {
    setEmailInput(text)
    if (text === "") {
      setEmailError("")
    } else if (!emailPattern.test(text)) {
      setEmailError("Correo electrónico inválido")
    } else {
      setEmailError("")
    }
  }

  const handleContinue = async () => {
    if (!emailInput) {
      Alert.alert("Error", "Por favor, ingresa tu correo electrónico")
      return
    }

    if (!emailPattern.test(emailInput)) {
      Alert.alert("Error", "Por favor, ingresa un correo electrónico válido")
      return
    }

    setIsLoading(true)
    try {
      // 1. Solicitar al BACKEND que genere el código y lo guarde en la BD
      const response = await fetch(`${API_URL}/auth/recuperar-contrasena`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailInput.toLowerCase().trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        // El backend nos devuelve el código que generó (según el controlador que corregimos)
        const codeFromServer = data.code;

        if (!codeFromServer) {
            // Caso de seguridad: el backend dice "OK" pero no mandó código (ej. usuario no existe pero no queremos dar pistas)
            Alert.alert("Aviso", "Si el correo está registrado, recibirás un código en breve.");
            return;
        }

        // 2. Enviar el código oficial a través de EmailJS
        const emailSent = await sendVerificationCode(emailInput, codeFromServer);
        
        if (emailSent) {
          // 3. Guardar en el contexto global para las siguientes pantallas
          setEmail(emailInput)
          setVerificationCode(codeFromServer)

          Alert.alert("Éxito", `Se ha enviado un código a ${emailInput}`)
          router.push("/pages/olvide_contrasena/verify-code")
        } else {
          Alert.alert("Error", "El servidor generó el código pero EmailJS falló al enviarlo.");
        }
      } else {
        Alert.alert("Error", data.error || "Hubo un problema en el servidor.");
      }
    } catch (error) {
      console.error(error)
      Alert.alert("Error de conexión", "No se pudo conectar con el servidor. Verifica tu conexión e IP.");
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SafeAreaView style={{flex: 1,backgroundColor: "#FFFFFF",}}>
       <ScrollView contentContainerStyle={{height:'110%'}}>
      <View style={styles.container}>
        {/* Botón de atrás */}
       <Volver style={{top:80, left:15}} color={'gray'} route={'/Login'}/>

        {/* Logo */}
        <View style={{width: 300,height: 82,marginTop: 0, marginBottom: 60,}}>
          <Image source={require("../../../assets/img/logo.png")} style={styles.wordmark} />
        </View>

        <Text style={styles.title}>Recuperar cuenta</Text>

        <Text style={styles.description}>
          Introduce tu correo electrónico para enviarte las instrucciones de recuperación.
        </Text>

        <View>
          <TextInput
            placeholder="Correo electrónico"
            value={emailInput}
            onChangeText={handleEmailChange}
            style={styles.input}
            keyboardType="email-address"
            placeholderTextColor="#BDBDBD"
            autoCapitalize="none"
            editable={!isLoading} 
          />
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        </View>

        {/* Botón de acción */}
        <TouchableOpacity 
          style={[styles.button, isLoading && { opacity: 0.7 }]} 
          onPress={handleContinue}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#023A73" />
          ) : (
            <Text style={styles.textButton}>CONTINUAR</Text>
          )}
        </TouchableOpacity>
      </View>
     </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    paddingHorizontal: 25,
    paddingTop: 60,
    alignItems: "center",
  },
  logo: {
    width: 300,height: 82,marginTop: 70, marginBottom: 60,
  },
  wordmark: {
    width: "100%",
    height: "100%",
  },
  title: {
    fontSize: 32,
    fontFamily: "roboto",
    fontWeight: "bold",
    color: "#212121",
    marginBottom: 15,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    fontFamily: "roboto",
    color: "#544F4F",
    textAlign: "center",
    marginBottom: 50,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  input: {
    width: 340,
    height: 65,
    paddingHorizontal: 25,
    borderWidth: 1,
    borderColor: "#DFDFDF",
    borderRadius: 100,
    fontFamily: "roboto",
    fontSize: 18,
    marginBottom: 20,
    color: "#212121",
  },
  errorText: {
    color: "#D32F2F",
    fontFamily: "roboto",
    fontSize: 13,
    marginTop: -15,
    marginBottom: 15,
    marginLeft: 20,
  },
  button: {
    width: 340,
    height: 65,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFA311",
    marginTop: 25,
  },
  textButton: {
    color: "#023A73",
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "roboto",
  },
})