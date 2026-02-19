import { Image } from "expo-image"
import { useRouter } from "expo-router"
import { useState } from "react"
import { Alert, StyleSheet, Text, TouchableOpacity, View, Clipboard } from "react-native"
import FontAwesome6 from "@expo/vector-icons/FontAwesome6"
import { useRecovery } from "@/context/RecoveryContext"
import { sendVerificationCode, generateVerificationCode } from "@/services/emailService"
import { CodeField, Cursor, useBlurOnFulfill, useClearByFocusCell,} from "react-native-confirmation-code-field"

const CELL_COUNT = 6

export default function VerifyCode() {
  const router = useRouter()
  const { email, verificationCode, setVerificationCode } = useRecovery()
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const ref = useBlurOnFulfill({ value: code, cellCount: CELL_COUNT })
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value: code,
    setValue: setCode,
  })

  const handleVerifyCode = async () => {
    if (code.length !== CELL_COUNT) {
      Alert.alert("Error", "Por favor, ingresa los 6 dígitos del código")
      return
    }

    if (code !== verificationCode) {
      Alert.alert("Error", "El código ingresado es incorrecto")
      return
    }

    setIsLoading(true)
    try {
      Alert.alert("Éxito", "Código verificado correctamente", [
        {
          text: "Continuar",
          onPress: () => router.push("/reset-password"),
        },
      ])
    } catch (error) {
      console.error(error)
      Alert.alert("Error", "Error al verificar el código")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasteCode = async () => {
    try {
      const clipboardContent = await Clipboard.getString()
      const numericCode = clipboardContent.replace(/\D/g, "").substring(0, CELL_COUNT)

      if (numericCode.length === 0) {
        Alert.alert("Error", "No hay código en el portapapeles")
        return
      }

      setCode(numericCode)
    } catch (error) {
      console.error("Error al pegar código:", error)
      Alert.alert("Error", "No se pudo acceder al portapapeles")
    }
  }

  const handleResendCode = async () => {
    setIsLoading(true)
    try {
      const newCode = generateVerificationCode()
      const emailSent = await sendVerificationCode(email, newCode)

      if (emailSent) {
        setVerificationCode(newCode)
        setCode("")
        ref.current?.focus()
        Alert.alert("Éxito", "Se ha reenviado el código a tu correo electrónico")
      } else {
        Alert.alert("Error", "No se pudo reenviar el código. Intenta de nuevo.")
      }
    } catch (error) {
      console.error(error)
      Alert.alert("Error", "Error al reenviar el código")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View style={styles.page}>
      <View style={styles.container}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome6 name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Logo */}
        <View style={styles.logo}>
          <Image source={require("../assets/img/logo.png")} style={styles.wordmark} />
        </View>

        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <FontAwesome6 name="check" size={80} color="#023A73" />
        </View>

        {/* Title */}
        <Text style={styles.title}>Correo Enviado</Text>

        {/* Description */}
        <Text style={styles.description}>
          ¡Revisa tu bandeja de entrada! Hemos enviado un código a {email} para que restablezcas tu contraseña. 
          {"\n"/* Salto de línea */}
          <Text style={{fontWeight: 'bold'}}>Este código expirará en 15 minutos.</Text>
        </Text>

        {/* Code Input Fields with Paste Button */}
        <View style={styles.codeSection}>
          <CodeField
            ref={ref}
            {...props}
            value={code}
            onChangeText={setCode}
            cellCount={CELL_COUNT}
            rootStyle={styles.codeFieldRoot}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            testID="my-code-input"
            renderCell={({ index, symbol, isFocused }) => (
              <View
                key={index}
                style={[styles.cellRoot, isFocused && styles.focusCell]}
                onLayout={getCellOnLayoutHandler(index)}
              >
                <Text style={styles.cellText}>
                  {symbol || (isFocused ? <Cursor /> : null)}
                </Text>
              </View>
            )}
          />

          {/* Paste Button */}
          <TouchableOpacity
            style={styles.pasteButton}
            onPress={handlePasteCode}
            disabled={isLoading}
          >
            <FontAwesome6 name="clipboard" size={16} color="#023A73" />
            <Text style={styles.pasteButtonText}>Pegar código</Text>
          </TouchableOpacity>
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleVerifyCode}
          disabled={isLoading}
        >
          <Text style={styles.textButton}>INGRESAR CODIGO</Text>
        </TouchableOpacity>

        {/* Resend Link */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>¿NO RECIBISTE EL CÓDIGO? </Text>
          <TouchableOpacity onPress={handleResendCode} disabled={isLoading}>
            <Text style={styles.resendLink}>REENVIAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 40,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFA311",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  logo: {
    alignItems: "center",
    justifyContent: "center",
    width: 280,
    height: 77,
    marginTop: 30,
    marginBottom: 40,
  },
  wordmark: {
    width: 280,
    height: 77,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#023A73",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontFamily: "roboto",
    fontWeight: "bold",
    color: "#212121",
    marginBottom: 20,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    fontFamily: "roboto",
    color: "#544F4F",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  codeSection: {
    width: "100%",
    alignItems: "center",
    marginBottom: 40,
  },
  codeFieldRoot: {
    marginVertical: 20,
  },
  cellRoot: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#DFDFDF",
    borderRadius: 8,
    marginHorizontal: 5,
    backgroundColor: "#FAFAFA",
  },
  focusCell: {
    borderBottomColor: "#023A73",
    backgroundColor: "#F5FAFB",
  },
  cellText: {
    color: "#212121",
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "roboto",
    textAlign: "center",
  },
  pasteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#023A73",
    backgroundColor: "#FFF8F0",
    marginTop: 10,
  },
  pasteButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#023A73",
    fontFamily: "roboto",
  },
  button: {
    width: 320,
    height: 60,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFA311",
    marginTop: 20,
    marginBottom: 30,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  textButton: {
    color: "#023A73",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "roboto",
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  resendText: {
    fontSize: 14,
    fontFamily: "roboto",
    color: "#212121",
  },
  resendLink: {
    fontSize: 14,
    fontFamily: "roboto",
    color: "#023A73",
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
})