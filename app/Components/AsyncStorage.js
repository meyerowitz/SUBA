  const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
  // --- FUNCIONES DE APOYO ---
  export const getuserid = async () => {
    const session = await AsyncStorage.getItem('@Sesion_usuario');
    if (!session) return null;
    return JSON.parse(session)._id;
  };

 export const getusername = async () => {
    const session = await AsyncStorage.getItem('@Sesion_usuario');
    if (!session) return "";
    return JSON.parse(session).fullName;
  };

   export const getuseremail = async () => {
    const session = await AsyncStorage.getItem('@Sesion_usuario');
    if (!session) return "";
    return JSON.parse(session).email;
  };