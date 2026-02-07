import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Aquí definimos las "tablas" de traducción
const resources = {
  en: {
    translation: {
      "configuracion": "Settings",
      "preferencias": "PREFERENCES",
      "modo_oscuro": "Dark Mode",
      "aspecto": "Change visual appearance",
      "foto_perfil": "Profile Picture",
      "foto": "Update your profile picture",
      "idioma": "Language",
      "espanol": "English", // Cuando esté en inglés, dirá "English"
      "sistema_mapas": "SYSTEM & MAPS",
      "ayuda": "Help Center"
    }
  },
  es: {
    translation: {
      "configuracion": "Configuración",
      "preferencias": "PREFERENCIAS",
      "modo_oscuro": "Modo Oscuro",
      "aspecto": "Cambia el aspecto visual",
      "foto_perfil": "Foto de Perfil",
      "foto": "Actualiza tu foto de perfil",
      "idioma": "Idioma",
      "espanol": "Español (Latinoamérica)",
      "sistema_mapas": "SISTEMA Y MAPAS",
      "ayuda": "Centro de Ayuda"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3', // Esto evita que falle en Android/Expo
    resources,
    lng: 'es', // Idioma inicial
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;