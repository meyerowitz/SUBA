import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TextInput, TouchableOpacity,  StatusBar, Image, ScrollView, Button } from 'react-native';
import * as Location from 'expo-location';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Destinos from "../../Components/Destinos.json";
import { Picker } from "@react-native-picker/picker";
import Feather from 'react-native-vector-icons/Feather';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getuserid,getusername} from '../../Components/AsyncStorage';
import { useTheme } from '../../Components/Temas_y_colores/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute } from '../../Components/Providers/RouteContext';

const supabase = createClient('https://wkkdynuopaaxtzbchxgv.supabase.co', 'sb_publishable_S18aNBlyLP3-hV_mRMcehA_zbCDMSGP');

export default function Home({ navigation }) {
  const [ubicacionActual, setUbicacionActual] = useState('');
  const [destinoInput, setDestinoInput] = useState('');
  const [selectedDestinationName, setSelectedDestinationName] = useState(""); const { setSelectedRoute ,setActiveTab} = useRoute();
  const [cargandoOrigen, setCargandoOrigen] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const [DolarBcv,setPrecioBCV ]=useState('1');
  const [DolarBcvLoading,setPrecioBCVLoad ]=useState(true);

  const [TicketBs,setTicketBs]=useState(1);
  const [TicketBsLoad,setTicketBsLoad]=useState(true);

  const [TicketDolar,setTicketDolar]=useState('');
  const [TicketDolarLoad,setTicketDolarLoad]=useState(true);

  const[Load,SetLoad]=useState(false);
  const [saldo, setSaldo] = useState(0.00);

  const [userImage, SetuserImage]= useState(null);
  const { theme, toggleTheme, isDark } = useTheme();

  const router= useRouter();

  useEffect(() => {
    const loadUserImage = async () => {
      const sessionData = await AsyncStorage.getItem('@Sesion_usuario');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.profilePictureUrl) {
          SetuserImage(session.profilePictureUrl);
        }
      }
    };
    loadUserImage();
  }, []);
  // === LÓGICA DE GEOLOCALIZACIÓN (Mantenemos tu lógica original) ===
  const obtenerUbicacionOrigen = async () => {
    setCargandoOrigen(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setUbicacionActual('Permiso denegado');
        return;
      }
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      let geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      if (geocode && geocode.length > 0) {
        const addr = geocode[0];
        setUbicacionActual(`${addr.street || ''} ${addr.city || ''}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCargandoOrigen(false);
    }
  };
const obtenerDatoPasaje = async () => {
    try {
      const { data, error } = await supabase
        .from('pasaje_y_tarifas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      console.log(data);
      if (error) throw error;
      return data ? data.pasaje : 0;
    } catch (error) {
      console.error("Error Supabase:", error);
      return 0;
    }
  };
// --- 1. NUEVA FUNCIÓN PARA OBTENER EL SALDO DESDE "Saldo_usuarios" ---
const obtenerSaldoReal = async () => {
  try {
    const userid = await getuserid();
    if (!userid) return;

    // Cambiamos .single() por .maybeSingle() para evitar el error de "0 o múltiples filas"
    const { data, error } = await supabase
      .from('Saldo_usuarios')
      .select('saldo')
      .eq('external_user_id', userid.trim())
      .maybeSingle(); 

    if (error) {
      console.log("Error consultando saldo:", error.message);
      return;
    }

    if (data) {
      // Si existe el registro, cargamos el saldo
      setSaldo(data.saldo);
    } else {
      // Si data es null, significa que el usuario no tiene fila en esa tabla todavía
      console.log("El usuario no tiene registro de saldo. Iniciando en 0.");
      setSaldo(0.00);
      
      // OPCIONAL: Podrías crear la fila automáticamente aquí si quieres
      /*
      await supabase.from('Saldo_usuarios').insert([
        { external_user_id: userid.trim(), saldo: 0.00 }
      ]);
      */
    }
  } catch (error) {
    console.log("Error crítico en obtenerSaldoReal:", error);
  }
};

 useEffect(() => {
    // A. Cargar Ubicación
    obtenerUbicacionOrigen();

    // B. Cargar Datos Financieros de forma secuencial
    const cargarFinanzas = async () => {
      try {
        // I. Obtener Dólar
        const resDolar = await fetch('https://ve.dolarapi.com/v1/dolares');
        const jsonDolar = await resDolar.json();
        const oficial = jsonDolar.find(d => d.fuente === 'oficial');
        const valorDolarActual = oficial.promedio;

        // II. Obtener Pasaje (Esperamos a Supabase)
        const valorPasajeBs = await obtenerDatoPasaje();

        // III. Calcular el equivalente en Dólares
        let calculoDolar = 0;
        if (valorPasajeBs > 0 && valorDolarActual > 0) {
          calculoDolar = (valorPasajeBs / valorDolarActual).toFixed(2);
        }

        // IV. ACTUALIZACIÓN ÚNICA DE ESTADOS (Evita el loop)
        setPrecioBCV(valorDolarActual);
        setPrecioBCVLoad(false);

        setTicketBs(valorPasajeBs);
        setTicketBsLoad(false);

        setTicketDolar(calculoDolar);
        setTicketDolarLoad(false);
        obtenerSaldoReal();

      } catch (error) {
        console.error("Fallo masivo en carga:", error);
        // Fallback para evitar loaders infinitos si falla el internet
        setPrecioBCVLoad(false);
        setTicketBsLoad(false);
        setTicketDolarLoad(false);
      }
    };

    cargarFinanzas();
    obtenerSaldoReal();
  }, []);


const handleSearch = () => {
  
  SetLoad(true);

  setTimeout(()=>{
     if (!selectedDestinationName || selectedDestinationName === "") {
      Alert.alert("Atención", "Por favor selecciona un destino primero");
      return;
    }
  
    console.log("Navegando a WebMap con destino a", selectedDestinationName);
    SetLoad(false)
    router.push({
      pathname: "/pages/Pasajero/WebMap", 
      params: { destino: selectedDestinationName }
    });
  },3000)

 
};


  const styles={
 
  balanceLabel: {
    color: 'white', fontSize: 18,fontWeight: 'bold',
  },
  balanceAmount: {
    color: 'white',fontSize: 38,fontWeight: 'bold',marginTop: 10,
  },

};
  return (
  
      <View style={{flex: 1, backgroundColor:theme.background,}}>
      <StatusBar barStyle="light-content" backgroundColor={"#003366"}  />
      {/* BOTÓN DE ESCÁNER FLOTANTE */}
 
      <ScrollView contentContainerStyle={{  backgroundColor: theme.background_2, width:'100%', height:'120%' }} 
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              bounces={false}
              >

      {/* SECCIÓN SUPERIOR AZUL */}
      <LinearGradient colors={['#003366','#3182d3']} style={{height: 280,paddingHorizontal: 25,borderBottomLeftRadius: 50, borderBottomRightRadius: 50,}}>

          <View style={{flexDirection: 'row',justifyContent: 'space-between', alignItems: 'center',marginTop: 30,}}>
            <Image style={{width:210, height:210, position:'absolute', top:13, left:110}} source={require("../../../assets/img/autobuss.png")}></Image>
            
            <View style={{marginTop:23, marginLeft:13}}>
              <Text style={{fontSize: 28, color: 'white',fontWeight: 'bold',}}>¡Bienvenido!</Text>
              <Text style={{fontSize: 22, color: 'white', fontWeight: '500', marginTop: 5}}>¡A Ciudad Guayana Bus!</Text>
            </View>
            <TouchableOpacity onPress={()=>{router.push("/pages/Pasajero/Profile")}}>
              {userImage ? (
                <Image source={{ uri: userImage }} style={{ width: 50, height: 50, borderRadius: 25 }} />
              ) : (
                <Ionicons name="person-circle-outline" size={50} color="white" />
              )}
            </TouchableOpacity>

          </View>

      </LinearGradient>
  
      {/* TARJETA DE RUTA (DISEÑO SOLICITADO) */}
      <View style={{backgroundColor: 'white', marginHorizontal: 20, marginTop: -85, borderRadius: 15, padding: 15,elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5}}>
        <View style={{flexDirection: 'row'}}>
          
          {/* COLUMNA IZQUIERDA: ICONOS Y LÍNEA */}
          <View style={{ alignItems: 'center', justifyContent: 'space-around', paddingVertical: 10, width: 30 }}>
            <Ionicons name="location" size={20} color="#58A3B8" />
            <View style={{ width: 1, height: 40, backgroundColor: '#DDD', marginVertical: 4 }} />
            <Ionicons name="location" size={20} color="#1A2F35" />
          </View>

          {/* COLUMNA DERECHA: SELECCIONADORES */}
          <View style={{ flex: 1, marginLeft: 10 }}>
            
            {/* ORIGEN */}
            <View style={{ height: 60, justifyContent: 'center' }}>
              <Text style={{ fontSize: 12, color: '#999' }}>Desde</Text>
              {cargandoOrigen ? (
                <ActivityIndicator size="small" color={theme.ActivityIndicator} style={{alignSelf: 'flex-start'}} />
              ) : (
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#333' }} numberOfLines={1}>
                  {ubicacionActual || "Ubicación desconocida"}
                </Text>
              )}
            </View>

            <View style={{ height: 1, backgroundColor: '#EEE' }} />

            {/* DESTINO CON PICKER */}
          <View style={{ height: 60, justifyContent: 'center' }}>
              <Text style={{ fontSize: 12, color: '#999' }}>Hacia</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Picker
                  selectedValue={selectedDestinationName}
                  onValueChange={(itemValue) =>{ 
                    setSelectedDestinationName(itemValue),
                    setSelectedRoute(itemValue ? { name: itemValue } : null);}}
                  style={{ flex: 1, marginLeft: -15 }}
                  enabled={!isSearching}
                >
                  <Picker.Item label="Selecciona un destino..." value="" color="#999" />
                  {Destinos.map((dest) => (
                    <Picker.Item key={dest.name} label={dest.name} value={dest.name} />
                  ))}
                </Picker>
                
                <TouchableOpacity 
                  style={{ backgroundColor: '#007bff', width: 42, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }} 
                  onPress={handleSearch}
                  disabled={isSearching || !selectedDestinationName}
                >
                  {isSearching ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Feather name="search" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </View>
      </View>
       
      {/* TARJETA DE ESTADÍSTICAS (Sustituye a la naranja) */}
      <View style={{backgroundColor: 'white', flexDirection: 'row', padding: 20, marginHorizontal: 20, marginTop: 15,borderRadius: 15, elevation: 8, shadowOpacity: 0.2,shadowColor: '#000', shadowOffset: { width: 0, height: 4 }}}>
       
        {/* Columna Balance */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: '#666', fontWeight: '600' }}>Ticket $</Text>
          <Text style={{ fontWeight: 'bold', color: '#333',fontSize: 16 }}>{TicketDolarLoad?  (<ActivityIndicator size="small" color={theme.ActivityIndicator} />):`$. ${TicketDolar}`}</Text>
        </View>

        {/* Columna Rewards */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: '#666', fontWeight: '600' }}>Ticket bs</Text>
          <Text style={{ fontWeight: 'bold', color: '#333',fontSize: 16 }}>{TicketBsLoad? (<ActivityIndicator size="small" color= {theme.ActivityIndicator} />):`Bs. ${TicketBs}`}</Text>
        </View>

        {/* Columna Total Trips */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: '#666', fontWeight: '600' }}>Dolar BCV</Text>
          <Text style={{ fontWeight: 'bold', color: '#333',fontSize: 16 }}>{DolarBcvLoading? (<ActivityIndicator size="small" color={theme.ActivityIndicator} />): `Bs. ${DolarBcv.toFixed(2)}`}</Text>
        </View>
      </View>
        {/* TARJETA DE SALDO (NARANJA) */}
      <View style={{backgroundColor: '#E69500', marginHorizontal: 20, padding: 20, borderRadius: 20, marginTop: 15,elevation: 5, shadowColor: '#000', shadowOpacity: 0.3}}>
        <Text style={{color: 'white', fontSize: 18,fontWeight: 'bold',}}>Saldo actual</Text>
        <Text style={{color: 'white',fontSize: 38,fontWeight: 'bold',marginTop: 10,}}>{saldo ? `Bs.${saldo.toFixed(1)}`:`Bs. ${saldo.toFixed(2)}` }</Text>
      </View>
      </ScrollView>
      
      {Load ? (       
        <View style={{justifyContent: "center",alignItems: "center",backgroundColor:"#ffffff95", height:'100%', position:'absolute', width:'100%'}}>
        <Image
            source={require("../../../assets/img/billete-electronico.gif")}
            style={{height:300, width:300, marginBottom:20}}
            contentMode="contain"
            cachePolicy="memory-disk" // Prioriza cargar desde la memoria RAM o disco
            priority="high"           // Le dice al sistema que este recurso es urgente
            placeholder={{ blurhash: "L6PZfSaD00jE.AyE_3t7t7Rj4n9w" }} // O simplemente una imagen estática
            transition={10}
          />
          <ActivityIndicator size={60} color="#313135ff" />
      </View>):(<></>)}
      </View>
  );
  
}

