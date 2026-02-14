import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto'; // Esto ayuda a que no falle en el cel

// Aquí vamos a pegar las llaves que buscaremos en la web
const supabaseUrl = 'https://womjyefodulfukuasaia.supabase.co';
const supabaseKey = 'sb_publishable_N2mosTRijbD2io2_zw7ddQ_7Z3hGAtM';

export const supabase = createClient(supabaseUrl, supabaseKey);