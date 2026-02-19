import FontAwesome6 from "@expo/vector-icons/FontAwesome6"
import { Image } from "expo-image"
import { useRouter } from "expo-router"
import { useState } from "react"
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, StatusBar, KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator } from "react-native"
import Volver from './Components/Botones_genericos/Volver'
import { SafeAreaView } from "react-native-safe-area-context";

// ⚠️ Ajusta esta URL a tu servidor de Render o IP Local
// const API_URL = "https://subapp-api.onrender.com";
const API_URL = "http://192.168.0.108:3500";

export default function Register() {
  const router = useRouter()
  
  // Estados de los campos
  const [mail, setMail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  
  // Estados de validación y UI
  const [nameError, setNameError] = useState("")
  const [emailError, setEmailError] = useState("")
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const validatePassword = (pwd: string) => {
    let strength = 0
    const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)
    const hasUpperCase = /[A-Z]/.test(pwd)
    const hasMinLength = pwd.length >= 8

    if (hasSpecialChar) strength++
    if (hasUpperCase) strength++
    if (hasMinLength) strength++

    return { strength, hasSpecialChar, hasUpperCase, hasMinLength }
  }

  // Manejadores de cambio
  const handleNameChange = (text: string) => {
    if (text === "" || namePattern.test(text)) {
      setFullName(text)
      setNameError("")
    } else {
      setNameError("Solo se permiten letras")
    }
  }

  const handleEmailChange = (text: string) => {
    setMail(text)
    if (text === "") {
      setEmailError("")
    } else if (!emailPattern.test(text)) {
      setEmailError("Correo electrónico inválido")
    } else {
      setEmailError("")
    }
  }

  const handlePasswordChange = (text: string) => {
    setPassword(text)
    const validation = validatePassword(text)
    setPasswordStrength(validation.strength)
  }

  // FUNCIÓN DE REGISTRO UNIFICADA
  const handleRegister = async () => {
    // 1. Validaciones previas en el Front
    if (!mail || !password || !fullName) {
      Alert.alert("Error", "Por favor, complete todos los campos.")
      return
    }
    if (emailError || nameError) {
      Alert.alert("Error", "Por favor, corrija los errores en el formulario.")
      return
    }
    if (passwordStrength < 3) {
      Alert.alert("Error", "La contraseña debe cumplir todos los requisitos de seguridad.")
      return
    }

    setIsLoading(true)
    try {
      // 2. Llamada al Backend
      const response = await fetch(`${API_URL}/auth/registrarse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fullName: fullName.trim(),
          email: mail.toLowerCase().trim(), // El back espera 'email'
          password: password,
          role: "passenger" 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Registro exitoso (Status 201)
        Alert.alert("¡Éxito!", "Cuenta creada correctamente.", [
          { text: "OK", onPress: () => router.replace("/Login") }
        ]);
      } else if (response.status === 409) {
        // Error de correo duplicado manejado en tu controlador
        Alert.alert("Registro fallido", data.message || "Este correo ya está en uso.");
      } else {
        // Otros errores (400, 500)
        Alert.alert("Error", data.message || "No se pudo crear la cuenta.");
      }
    } catch (error) {
      console.error(error)
      Alert.alert("Error de red", "Verifica tu conexión a internet.");
    } finally {
      setIsLoading(false)
    }
  }

  const passwordValidation = validatePassword(password)
  const strengthColor = passwordStrength === 3 ? "#4CAF50" : passwordStrength >= 1 ? "#FFA311" : "#D32F2F"
  const strengthPercentage = (passwordStrength / 3) * 100

  return (
    <SafeAreaView style={styles.page}>
      <StatusBar translucent={true} backgroundColor="transparent" barStyle="dark-content" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1, width: '100%' }}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, backgroundColor: "#ffffff", width: '100%' }} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.container}>
            
            <View style={styles.logo}>
              <Image source={require("../assets/img/logo.png")} style={styles.wordmark} />
            </View>

            <Text style={styles.title}>¡Regístrate!</Text>

            {/* Input Nombre */}
            <View>
              <TextInput
                placeholder="Nombre Completo"
                placeholderTextColor="rgba(0, 0, 0, 0.31)" 
                value={fullName}
                onChangeText={handleNameChange}
                style={styles.input}
              />
              {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
            </View>

            {/* Input Email */}
            <View>
              <TextInput
                placeholder="Correo electrónico"
                placeholderTextColor="rgba(0, 0, 0, 0.31)" 
                value={mail}
                onChangeText={handleEmailChange}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>

            {/* Input Password */}
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Introduce tu contraseña"
                placeholderTextColor="rgba(0, 0, 0, 0.31)" 
                value={password}
                onChangeText={handlePasswordChange}
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
              />
              <TouchableOpacity style={styles.toggleButton} onPress={() => setShowPassword(!showPassword)}>
                <FontAwesome6 name={showPassword ? "eye-slash" : "eye"} size={20} color="#023A73" />
              </TouchableOpacity>
            </View>

            {/* Barra de Fuerza */}
            {password.length > 0 && (
              <View style={{ width: 320 }}>
                <View style={styles.strengthBarContainer}>
                  <View style={[styles.strengthBar, { width: `${strengthPercentage}%`, backgroundColor: strengthColor }]} />
                </View>

                <View style={styles.requirementsContainer}>
                  <Text style={[styles.requirementText, passwordValidation.hasSpecialChar ? styles.requirementMet : styles.requirementUnmet]}>✓ Carácter especial (!@#$%)</Text>
                  <Text style={[styles.requirementText, passwordValidation.hasUpperCase ? styles.requirementMet : styles.requirementUnmet]}>✓ Una mayúscula</Text>
                  <Text style={[styles.requirementText, passwordValidation.hasMinLength ? styles.requirementMet : styles.requirementUnmet]}>✓ Mínimo 8 caracteres</Text>
                </View>
              </View>
            )}

            {/* Botón Principal con Loader */}
            <TouchableOpacity 
              style={[styles.button, isLoading && { opacity: 0.7 }]} 
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#023A73" />
              ) : (
                <Text style={styles.textButton}>CREAR CUENTA</Text>
              )}
            </TouchableOpacity>

            <View style={styles.redirect}>
              <Text style={styles.question}>¿Ya tienes cuenta? </Text>
              <TouchableOpacity onPress={() => router.replace("/Login")}>
                <Text style={styles.register}>Inicia sesión aquí</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.question, {marginTop: 30}]}>O regístrate con redes sociales</Text>
  
            <View style={styles.googleContainer}>
              <TouchableOpacity style={styles.googleButton}>
                <Image source={require("../assets/img/google.png")} style={styles.googleIcon} />
                <Text style={styles.googleText}>Continuar con Google</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Volver route="/Login" color={null} style={{top:50, left:10}}/>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { flex: 1, alignItems: "center", paddingBottom: 40 },
  logo: { width: 320, height: 88, marginTop: 60, marginBottom: 30 },
  wordmark: { width: "100%", height: "100%" },
  title: { fontSize: 30, fontWeight: "bold", color: "#212121", marginBottom: 30 },
  input: { width: 320, height: 60, paddingHorizontal: 20, borderWidth: 1, borderColor: "#DFDFDF", borderRadius: 100, fontSize: 16, marginBottom: 20 },
  passwordContainer: { position: "relative", width: 320, marginBottom: 20 },
  passwordInput: { width: "100%", height: 60, paddingHorizontal: 20, borderWidth: 1, borderColor: "#DFDFDF", borderRadius: 100, fontSize: 16 },
  toggleButton: { position: "absolute", right: 20, top: 18 },
  errorText: { color: "#D32F2F", fontSize: 13, marginTop: -15, marginBottom: 15, marginLeft: 15, alignSelf: 'flex-start' },
  strengthBarContainer: { width: "100%", height: 4, backgroundColor: "#E0E0E0", borderRadius: 2, marginBottom: 10 },
  strengthBar: { height: "100%", borderRadius: 2 },
  requirementsContainer: { width: "100%", marginBottom: 15 },
  requirementText: { fontSize: 12, marginBottom: 4 },
  requirementMet: { color: "#4CAF50" },
  requirementUnmet: { color: "#BDBDBD" },
  button: { width: 320, height: 60, backgroundColor: "#FFA311", borderRadius: 100, justifyContent: "center", alignItems: "center", marginTop: 20 },
  textButton: { color: "#023A73", fontSize: 18, fontWeight: "bold" },
  googleContainer: { marginTop: 20 },
  googleButton: { flexDirection: "row", width: 320, height: 60, borderWidth: 1, borderColor: "#DFDFDF", borderRadius: 100, justifyContent: "center", alignItems: "center", gap: 10 },
  googleIcon: { width: 24, height: 24 },
  googleText: { fontSize: 16, fontWeight: "bold", color: "#212121" },
  redirect: { flexDirection: "row", marginTop: 20 },
  question: { color: "#544F4F", fontSize: 15 },
  register: { color: "#0661BC", fontWeight: "bold", textDecorationLine: "underline" },
})