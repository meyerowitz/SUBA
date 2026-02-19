import { init, send } from "@emailjs/react-native"

// Configuración de EmailJS - Datos de tu proyecto SUBA
const EMAIL_SERVICE_ID = "service_8j13z5p" 
const EMAIL_TEMPLATE_ID = "template_cvg7t8m" 
const EMAIL_PUBLIC_KEY = "2zcans5Wgxo4Vwi9m" 

// Inicializar EmailJS correctamente para React Native
init({
  publicKey: EMAIL_PUBLIC_KEY,
})

// Generar un código de 6 dígitos aleatorio
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Enviar código de verificación por email
export const sendVerificationCode = async (email: string, code: string): Promise<boolean> => {
  try {
    const response = await send(EMAIL_SERVICE_ID, EMAIL_TEMPLATE_ID, {
      to_email: email, // Debe coincidir con {{to_email}} en tu plantilla
      verification_code: code, // Debe coincidir con {{verification_code}} en tu plantilla
    })

    return response.status === 200
  } catch (error) {
    // Si persiste el error 403, recuerda activar "Allow API calls from non-browser applications" en el panel de EmailJS
    console.error("Error enviando email:", error)
    return false
  }
}

// Enviar email de confirmación de cambio de contraseña
export const sendPasswordResetConfirmation = async (email: string): Promise<boolean> => {
  try {
    // Nota: Si usas la misma plantilla, se enviará el diseño con el código vacío.
    // Lo ideal es crear una plantilla de "Éxito" sin el campo de código.
    const response = await send(EMAIL_SERVICE_ID, EMAIL_TEMPLATE_ID, {
      to_email: email,
      message: "Tu contraseña ha sido actualizada correctamente. Si no fuiste tú, por favor contáctanos.",
    })

    return response.status === 200
  } catch (error) {
    console.error("Error enviando email de confirmación:", error)
    return false
  }
}