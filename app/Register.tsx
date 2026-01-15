import FontAwesome6 from "@expo/vector-icons/FontAwesome6"
import { Image } from "expo-image"
import { useRouter } from "expo-router"
import { useState } from "react"
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, StatusBar ,ScrollView } from "react-native"
import Volver from './Components/Botones_genericos/Volver'
import { SafeAreaView } from "react-native-safe-area-context";

export default function Register() {
  const router = useRouter()
  const [mail, setMail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [nameError, setNameError] = useState("")
  const [emailError, setEmailError] = useState("")
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [showPassword, setShowPassword] = useState(false)

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

  const handleLogin = async () => {
    if (!mail || !password || !fullName) {
      Alert.alert("Error", "Por favor, complete todos los campos.")
      return
    }
    if (!namePattern.test(fullName)) {
      Alert.alert("Error", "El nombre solo debe contener letras")
      return
    }
    if (!emailPattern.test(mail)) {
      Alert.alert("Error", "Por favor, ingresa un correo electrónico válido")
      return
    }
    const validation = validatePassword(password)
    if (!validation.hasSpecialChar || !validation.hasUpperCase || !validation.hasMinLength) {
      Alert.alert("Error", "La contraseña no cumple con los requisitos")
      return
    }
    try {
      /*const response = await fetch(`DIRECCION DEL SERVIDOR`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mail,fullName, password }),
      });

      const data = await response.json();*/ //habilitar cuando el back este listo

      if (true) {
        //reemplazar por data.success cuando el back este listo revisar heilper para ver configuaracion del contexto
        //setCorreoUsuario(data.mail); activar cuando el back este listo
        router.replace("./Login") // Redirigir al home
      } else {
      }
    } catch (error) {
      console.error(error)
      Alert.alert("Error de red")
    }
  }

  const handleLogin2 = async () => {
    // 1. Validaciones locales (mismas que ya tenías)
    if (!mail || !password || !fullName) {
      Alert.alert("Error", "Por favor, complete todos los campos.");
      return;
    }
    if (!namePattern.test(fullName)) {
      Alert.alert("Error", "El nombre solo debe contener letras");
      return;
    }
    if (!emailPattern.test(mail)) {
      Alert.alert("Error", "Por favor, ingresa un correo electrónico válido");
      return;
    }
    
    const validation = validatePassword(password);
    if (!validation.hasSpecialChar || !validation.hasUpperCase || !validation.hasMinLength) {
      Alert.alert("Error", "La contraseña no cumple con los requisitos");
      return;
    }

    try {
      // 2. Petición POST a tu API de Render
      const response = await fetch('https://subapp-api.onrender.com/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: fullName,
          email: mail.toLowerCase(),
          password: password,
          role: "passenger" // O el rol por defecto que desees asignar
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // 3. Éxito: Registro completado
        Alert.alert("¡Éxito!", "Cuenta creada correctamente", [
          { text: "OK", onPress: () => router.replace("./Login") }
        ]);
        router.replace("./Login")
      } else {
        // 4. Error del servidor (ej: el correo ya existe)
        Alert.alert("Error de registro", data.message || "No se pudo crear la cuenta");
      }
    } catch (error) {
      // 5. Error de red
      console.error(error);
      Alert.alert("Error de red", "Asegúrate de estar conectado a internet o que el servidor esté activo.");
    }
  };

  const passwordValidation = validatePassword(password)
  const strengthColor =
    passwordStrength === 0
      ? "#D32F2F"
      : passwordStrength === 1
        ? "#FFA311"
        : passwordStrength === 2
          ? "#FFA311"
          : "#4CAF50"
  const strengthPercentage = (passwordStrength / 3) * 100

  return (
    <SafeAreaView style={styles.page}>
      <StatusBar translucent={true} backgroundColor="transparent" barStyle="dark-content"></StatusBar>
      
      <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: "#ffffff", width:'100%' }} 
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              >
      <View style={styles.container}>
        
        <View style={styles.logo}>
          <Image source={require("../assets/img/logo.png")} style={styles.wordmark} />
        </View>

        <Text style={styles.title}>¡Registrate!</Text>

        <View>
          <TextInput
            placeholder="Nombre Completo"
            value={fullName}
            onChangeText={handleNameChange}
            style={styles.input}
          />
          {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
        </View>

        <View>
          <TextInput
            placeholder="Correo electrónico"
            value={mail}
            onChangeText={handleEmailChange}
            style={styles.input}
            keyboardType="email-address"
          />
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        </View>

        <View style={styles.passwordContainer}>
          <TextInput
            textContentType="password"
            placeholder="Introduce tu contraseña"
            value={password}
            onChangeText={handlePasswordChange}
            secureTextEntry={!showPassword}
            style={styles.passwordInput}
          />
          <TouchableOpacity style={styles.toggleButton} onPress={() => setShowPassword(!showPassword)}>
            <FontAwesome6 name={showPassword ? "eye-slash" : "eye"} size={20} color="#023A73" />
          </TouchableOpacity>
        </View>

        {password.length > 0 && (
          <View>
            <View style={styles.strengthBarContainer}>
              <View style={[styles.strengthBar, { width: `${strengthPercentage}%`, backgroundColor: strengthColor }]} />
            </View>

            <View style={styles.requirementsContainer}>
              <View style={styles.requirementRow}>
                <Text
                  style={[
                    styles.requirementText,
                    passwordValidation.hasSpecialChar ? styles.requirementMet : styles.requirementUnmet,
                  ]}
                >
                  ✓ Carácter especial (!@#$%^&*)
                </Text>
              </View>
              <View style={styles.requirementRow}>
                <Text
                  style={[
                    styles.requirementText,
                    passwordValidation.hasUpperCase ? styles.requirementMet : styles.requirementUnmet,
                  ]}
                >
                  ✓ Una mayúscula
                </Text>
              </View>
              <View style={styles.requirementRow}>
                <Text
                  style={[
                    styles.requirementText,
                    passwordValidation.hasMinLength ? styles.requirementMet : styles.requirementUnmet,
                  ]}
                >
                  ✓ Mínimo 8 caracteres
                </Text>
              </View>
            </View>
          </View>
        )}

        <Text style={styles.question}>O registrate con redes sociales </Text>

        <TouchableOpacity style={styles.button} onPress={handleLogin2} onLongPress={handleLogin}>
          <Text style={styles.textButton}>CREAR CUENTA</Text>
        </TouchableOpacity>

        <View style={styles.googleContainer}>
          <TouchableOpacity style={styles.googleButton}>
            <Image source={require("../assets/img/google.png")} style={styles.googleIcon} />
            <Text style={styles.googleText}>Continuar con Google</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.redirect}>
          <Text style={styles.question}>Ya tienes cuenta? </Text>
          <TouchableOpacity onPress={() => router.replace("/Login")}>
            <Text style={styles.register}>Inicia sesión aquí</Text>
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>

      <Volver route="/Login" color={null} style={{top:50, left:10}}/>
    </SafeAreaView>
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
  },
  logo: {
    alignItems: "center",
    justifyContent: "center",
    width: 320,
    height: 88.28,
    marginTop: 50,
    marginBottom: 40,
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
    marginBottom: 30,
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
  passwordContainer: {
    position: "relative",
    width: 320,
    marginBottom: 20,
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
  toggleButton: {
    position: "absolute",
    right: 15,
    top: 18,
    padding: 5,
  },
  toggleButtonText: {
    fontSize: 20,
  },
  errorText: {
    color: "#D32F2F",
    fontFamily: "roboto",
    fontSize: 14,
    marginTop: -16,
    marginBottom: 12,
  },
  strengthBarContainer: {
    width: 320,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 12,
    marginTop: -16,
  },
  strengthBar: {
    height: "100%",
    borderRadius: 2,
  },
  requirementsContainer: {
    width: 320,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  requirementRow: {
    marginBottom: 6,
  },
  requirementText: {
    fontFamily: "roboto",
    fontSize: 12,
  },
  requirementMet: {
    color: "#4CAF50",
  },
  requirementUnmet: {
    color: "#BDBDBD",
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
})