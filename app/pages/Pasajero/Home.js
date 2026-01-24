import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TextInput, TouchableOpacity, SafeAreaView, StatusBar, Image, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Destinos from "../../Components/Destinos.json";
import { Picker } from "@react-native-picker/picker";
import Feather from 'react-native-vector-icons/Feather';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import {getuserid,getusername} from '../../Components/AsyncStorage';


const supabase = createClient('https://wkkdynuopaaxtzbchxgv.supabase.co', 'sb_publishable_S18aNBlyLP3-hV_mRMcehA_zbCDMSGP');

export default function Home() {
  const [ubicacionActual, setUbicacionActual] = useState('');
  const [destinoInput, setDestinoInput] = useState('');
  const [selectedDestinationName, setSelectedDestinationName] = useState("");
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

  const router= useRouter();
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

  const obtenerPrecioDolar = async () => {
  try {
    const respuesta = await fetch('https://ve.dolarapi.com/v1/dolares');
    const datos = await respuesta.json();
    
    // Suponiendo que quieres el oficial (BCV) y el paralelo
    const oficial = datos.find(d => d.fuente === 'oficial');
    const paralelo = datos.find(d => d.fuente === 'paralelo');
    
    setPrecioBCV(oficial.promedio);
    setPrecioBCVLoad(false);
  } catch (error) {
    console.error("Error obteniendo el dólar:", error);
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

const PreciodelTicketbs = async () => {
  try {
    const { data, error } = await supabase
      .from('pasaje_y_tarifas')
      .select('pasaje')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      setTicketBs(data.pasaje);
      setTicketBsLoad(false);
      return data.pasaje; // Retornamos el número
    }
    return 0;
  } catch (error) {
    console.error("Error en Supabase:", error);
    setTicketBsLoad(false);
    return 0;
  }
};

  const PreciodelTicketdolar = async () => {
      if(TicketBsLoad === false){
        console.log("false setTicketDolarLoad false")
         const TicketDD= TicketBs/DolarBcv
          setTicketDolar(TicketDD.toFixed(2));
          setTicketDolarLoad(false)
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

  return (
  
      <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />
      {/* BOTÓN DE ESCÁNER FLOTANTE */}
 
      <ScrollView contentContainerStyle={{  backgroundColor: "#ffffffff", width:'100%' }} 
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              bounces={false}
              >

      {/* SECCIÓN SUPERIOR AZUL */}
      <View style={styles.headerBackground}>

            <TouchableOpacity 
              style={{position: 'absolute',top: 45,left: 15,zIndex: 100}} 
              onPress={() => console.log("Abrir Escáner")}
            >
              <Ionicons name="barcode-outline" size={23} color="white" />
            </TouchableOpacity>
            
          <View style={styles.headerContent}>
            <Image style={{width:210, height:210, position:'absolute', top:13, left:110}} source={require("../../../assets/img/autobuss.png")}></Image>
            
            <View style={{marginTop:23, marginLeft:13}}>
              <Text style={styles.userName}>¡Bienvenido!</Text>
              <Text style={styles.welcomeSub}>¡A Ciudad Guayana Bus!</Text>
            </View>
            <TouchableOpacity onPress={()=>{router.push("/pages/Pasajero/Profile")}}>
              <Ionicons name="person-circle-outline" size={50} color="white" />
            </TouchableOpacity>

          </View>

      </View>

  
      {/* TARJETA DE RUTA (DISEÑO SOLICITADO) */}
      <View style={styles.routeCard}>
        <View style={styles.routeContent}>
          
          {/* COLUMNA IZQUIERDA: ICONOS Y LÍNEA */}
          <View style={styles.indicatorColumn}>
            <Ionicons name="location" size={20} color="#58A3B8" />
            <View style={styles.verticalLine} />
            <Ionicons name="location" size={20} color="#1A2F35" />
          </View>

          {/* COLUMNA DERECHA: SELECCIONADORES */}
          <View style={styles.inputsColumn}>
            
            {/* ORIGEN */}
            <View style={styles.inputWrapper}>
              <Text style={styles.labelTitle}>Desde</Text>
              {cargandoOrigen ? (
                <ActivityIndicator size="small" color="#58A3B8" style={{alignSelf: 'flex-start'}} />
              ) : (
                <Text style={styles.locationText} numberOfLines={1}>
                  {ubicacionActual || "Ubicación desconocida"}
                </Text>
              )}
            </View>

            <View style={styles.horizontalDivider} />

            {/* DESTINO CON PICKER */}
            <View style={styles.inputWrapper}>
              <Text style={styles.labelTitle}>Hacia</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedDestinationName}
                  onValueChange={(itemValue) => setSelectedDestinationName(itemValue)}
                  style={styles.pickerStyle}
                  enabled={!isSearching}
                >
                  <Picker.Item label="Selecciona un destino..." value={selectedDestinationName} color="#999" />
                  {Destinos.map((dest) => (
                    <Picker.Item key={dest.name} label={dest.name} value={dest.name} />
                  ))}
                </Picker>
                
                <TouchableOpacity 
                  style={styles.actionBtn} 
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
      <View style={styles.statsCard}>
       
        {/* Columna Balance */}
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Ticket $</Text>
          <Text style={styles.statValue}>{TicketDolarLoad?  (<ActivityIndicator size="small" color="#0022ffff" />):`$. ${TicketDolar}`}</Text>
        </View>

        {/* Columna Rewards */}
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Ticket bs</Text>
          <Text style={styles.statValue}>{TicketBsLoad? (<ActivityIndicator size="small" color="#0022ffff" />):`Bs. ${TicketBs}`}</Text>
        </View>

        {/* Columna Total Trips */}
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Dolar BCV</Text>
          <Text style={styles.statValue}>{DolarBcvLoading? (<ActivityIndicator size="small" color="#0022ffff" />): `Bs. ${DolarBcv.toFixed(2)}`}</Text>
        </View>
      </View>
        {/* TARJETA DE SALDO (NARANJA) */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Saldo actual</Text>
        <Text style={styles.balanceAmount}>{saldo ? `Bs.${saldo.toFixed(1)}`:`Bs. ${saldo.toFixed(2)}` }</Text>
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

const styles = StyleSheet.create({
  scannerButton: {
    position: 'absolute',top: 45,left: 15,zIndex: 100
  },
  loaderFull: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff95",
    height: '100%',
    position: 'absolute',
    width: '100%',
    zIndex: 200
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBackground: {
    backgroundColor: '#003366', // Azul oscuro
    height: '50%',
    paddingHorizontal: 25,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
  },
  welcomeText: {
    fontSize: 28,color: 'white',fontWeight: 'bold',
  },
  userName: {
    fontSize: 28,
    color: 'white',
    fontWeight: 'bold',
  },
  welcomeSub: {
    fontSize: 22,
    color: 'white',
    fontWeight: '500',
    marginTop: 5,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 25,
    marginTop: 30,
    paddingHorizontal: 15,
    height: 50,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  searchIcon: {
    marginLeft: 10,
  },
  balanceCard: {
    backgroundColor: '#E69500', // Naranja
    marginHorizontal: 20,
    padding: 20,
    height:120,
    borderRadius: 20,
    marginTop: 15, // Sube la tarjeta para que quede encima del azul
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  balanceLabel: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  balanceAmount: {
    color: 'white',
    fontSize: 38,
    fontWeight: 'bold',
    marginTop: 10,
  },
  formContainer: {
    paddingHorizontal: 30,
    marginTop: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 18,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  inputBox: {
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 15,
    height: 55,
    justifyContent: 'center',
    // Sombra suave para los inputs
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    elevation: 1,
  },
  inputText: {
    fontSize: 16,
    color: '#333',
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniSearchBtn: {
    backgroundColor: '#F0F0F0',
    padding: 12,
    borderRadius: 10,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#DDD',
  },


  // ESTILOS DE LA TARJETA TIPO "TIMELINE"
  routeCard: {
    backgroundColor: 'white',marginHorizontal: 20,marginTop: -20,borderRadius: 15,padding: 15,elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  routeContent: {
    flexDirection: 'row',
  },
  indicatorColumn: {
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    width: 30,
  },
  verticalLine: {
    width: 1,
    flex: 1,
    backgroundColor: '#DDD',
    marginVertical: 4,
  },
  inputsColumn: {
    flex: 1,
    marginLeft: 10,
  },
  inputWrapper: {
    height: 60,
    justifyContent: 'center',
  },
  labelTitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: '#EEE',
    width: '100%',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerStyle: {
    flex: 1,
    height: 50,
    marginLeft: -5, // Compensa el padding interno del Picker
  },
  actionBtn: {
    backgroundColor: '#007bff',
    width: 40,
    height: 40,
    borderRadius: 10, //alguien insensato lo coloco en 20 , rompe por completo la armonia del componente
    justifyContent: 'center',
    alignItems: 'center',
  },

  statsCard: {
    backgroundColor: 'white',
    flexDirection: 'row', // Alinea los elementos en fila
    justifyContent: 'space-around', // Distribuye espacio equitativo entre columnas
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 10, // Ajusta esto según qué tan arriba quieras que flote
    paddingVertical: 20,
    borderRadius: 15,
    // Sombras para que se vea elevado como en la imagen
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    zIndex: 10, // Asegura que esté por encima de otros elementos
  },
  statItem: {
    alignItems: 'center', // Centra el texto dentro de cada columna
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 5,
    textTransform: 'capitalize',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});