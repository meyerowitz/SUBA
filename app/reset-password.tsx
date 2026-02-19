import { Image } from "expo-image"
import { useRouter } from "expo-router"
import { useState } from "react"
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from "react-native"
import FontAwesome6 from "@expo/vector-icons/FontAwesome6"
import { useRecovery } from "@/context/RecoveryContext"
import { SafeAreaView } from "react-native-safe-area-context"

// Ajusta según tu IP
const API_URL = "http://192.168.0.108:3500";

export default function ResetPassword() {
  const router = useRouter()
  const { email, verificationCode } = useRecovery()
  
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Lógica de validación (Igual que en Register)
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

  const passwordValidation = validatePassword(newPassword)
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword

  // Colores para la barra de fuerza
  const strengthColor = passwordValidation.strength === 3 ? "#4CAF50" : passwordValidation.strength >= 1 ? "#FFA311" : "#D32F2F"
  const strengthPercentage = (passwordValidation.strength / 3) * 100

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Error", "Por favor, completa todos los campos")
      return
    }

    if (passwordValidation.strength < 3) {
      Alert.alert("Error", "La nueva contraseña no cumple con los requisitos de seguridad")
      return
    }

    if (!passwordsMatch) {
      Alert.alert("Error", "Las contraseñas no coinciden")
      return
    }

    if (!email || !verificationCode) {
      Alert.alert("Error", "Sesión expirada. Inicia el proceso de nuevo.")
      router.replace("/forgotten-password")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/auth/restablecer-contrasena`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            email: email.toLowerCase().trim(), 
            token: verificationCode, 
            newPassword: newPassword 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Éxito", "Tu contraseña ha sido actualizada correctamente", [
          { text: "Ir al Login", onPress: () => router.push("/Login") }
        ])
      } else {
        Alert.alert("Error", data.error || "No se pudo actualizar")
      }
    } catch (error) {
      console.error("Error en reset-password:", error);
      Alert.alert("Error de conexión", "No se pudo conectar con el servidor")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.logo}>
            <Image source={require("../assets/img/logo.png")} style={styles.wordmark} />
          </View>

          <Text style={styles.title}>Nueva Contraseña</Text>

          {/* Nueva Contraseña */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Nueva Contraseña"
              placeholderTextColor="#999999"
              secureTextEntry={!showNewPassword}
              value={newPassword}
              onChangeText={setNewPassword}
              editable={!isLoading}
            />
            <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
              <FontAwesome6 name={showNewPassword ? "eye-slash" : "eye"} size={20} color="#023A73" />
            </TouchableOpacity>
          </View>

          {/* Barra de fuerza */}
          {newPassword.length > 0 && (
            <View style={{ width: 320, marginBottom: 15 }}>
              <View style={styles.strengthBarContainer}>
                <View style={[styles.strengthBar, { width: `${strengthPercentage}%`, backgroundColor: strengthColor }]} />
              </View>
              <View style={styles.requirementsContainer}>
                <Text style={[styles.reqText, passwordValidation.hasSpecialChar ? styles.reqMet : styles.reqUnmet]}>✓ Carácter especial (!@#$%)</Text>
                <Text style={[styles.reqText, passwordValidation.hasUpperCase ? styles.reqMet : styles.reqUnmet]}>✓ Una mayúscula</Text>
                <Text style={[styles.reqText, passwordValidation.hasMinLength ? styles.reqMet : styles.reqUnmet]}>✓ Mínimo 8 caracteres</Text>
              </View>
            </View>
          )}

          {/* Confirmar Contraseña */}
          <View style={[styles.inputContainer, passwordsMatch && newPassword.length > 0 ? { borderColor: '#4CAF50' } : null]}>
            <TextInput
              style={styles.input}
              placeholder="Confirmar Contraseña"
              placeholderTextColor="#999999"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!isLoading}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <FontAwesome6 name={showConfirmPassword ? "eye-slash" : "eye"} size={20} color="#023A73" />
            </TouchableOpacity>
          </View>
          
          {confirmPassword.length > 0 && (
             <Text style={[styles.matchText, passwordsMatch ? {color: '#4CAF50'} : {color: '#D32F2F'}]}>
                {passwordsMatch ? "✓ Las contraseñas coinciden" : "✗ Las contraseñas no coinciden"}
             </Text>
          )}

          <TouchableOpacity 
            style={[styles.button, (isLoading || !passwordsMatch || passwordValidation.strength < 3) && { opacity: 0.6 }]} 
            onPress={handleResetPassword}
            disabled={isLoading || !passwordsMatch || passwordValidation.strength < 3}
          >
            {isLoading ? <ActivityIndicator color="#023A73" /> : <Text style={styles.textButton}>GUARDAR CAMBIOS</Text>}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContainer: { alignItems: "center", paddingBottom: 40, paddingTop: 20 },
  backButton: { position: "absolute", top: 20, left: 20, width: 50, height: 50, borderRadius: 25, backgroundColor: "#FFA311", justifyContent: "center", alignItems: "center", zIndex: 10 },
  logo: { width: 280, height: 77, marginTop: 60, marginBottom: 40 },
  wordmark: { width: "100%", height: "100%" },
  title: { fontSize: 28, fontWeight: "bold", color: "#212121", marginBottom: 30 },
  inputContainer: { width: 320, height: 60, borderRadius: 30, borderWidth: 1, borderColor: "#DFDFDF", flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 10, backgroundColor: "#F5F5F5" },
  input: { flex: 1, fontSize: 16, color: "#212121" },
  strengthBarContainer: { height: 4, backgroundColor: "#E0E0E0", width: "100%", marginBottom: 8 },
  strengthBar: { height: "100%" },
  requirementsContainer: { width: "100%" },
  reqText: { fontSize: 12, marginBottom: 2 },
  reqMet: { color: "#4CAF50" },
  reqUnmet: { color: "#BDBDBD" },
  matchText: { fontSize: 13, marginBottom: 20, alignSelf: 'center' },
  button: { width: 320, height: 60, borderRadius: 100, justifyContent: "center", alignItems: "center", backgroundColor: "#FFA311", marginTop: 20 },
  textButton: { color: "#023A73", fontSize: 18, fontWeight: "bold" },
})