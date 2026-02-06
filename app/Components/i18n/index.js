// i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  es: {
    translation: {
      configuracion: "Configuración",
      apariencia: "APARIENCIA",
      modo_oscuro: "Modo Oscuro",
      idioma: "Idioma",
      espanol: "Español (Latinoamérica)"
    }
  },
  en: {
    translation: {
      configuracion: "Settings",
      apariencia: "APPEARANCE",
      modo_oscuro: "Dark Mode",
      idioma: "Language",
      espanol: "English"
    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'es', // idioma por defecto
  fallbackLng: 'es',
  interpolation: { escapeValue: false }
});

export default i18n;