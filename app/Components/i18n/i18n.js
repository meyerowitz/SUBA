import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

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
      "espanol": "English",
      "sistema_mapas": "SYSTEM & MAPS",
      "ayuda": "Help Center",
      "cancelar": "Cancel", // ¡No olvides añadir estas para el modal!
      "rutas_preferidas": "Favorite Routes"
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
      "ayuda": "Centro de Ayuda",
      "cancelar": "Cancelar",
      "rutas_preferidas": "Rutas Preferidas"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources,
    lng: 'es',
    fallbackLng: 'es',
    // --- AÑADE ESTO ---
    partialBundledLanguages: true, // Ayuda si los recursos son locales
    react: {
      useSuspense: false, // React Native no maneja bien Suspense por defecto
    },
    // ------------------
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;