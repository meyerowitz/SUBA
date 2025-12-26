import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TextInput, TouchableOpacity, SafeAreaView, StatusBar, Image, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Destinos from "../../Components/Destinos.json";
import { Picker } from "@react-native-picker/picker";
import Feather from 'react-native-vector-icons/Feather';
import { useRouter } from 'expo-router';


export default function Home() {
  const [ubicacionActual, setUbicacionActual] = useState('');
  const [destinoInput, setDestinoInput] = useState('');
  const [selectedDestinationName, setSelectedDestinationName] = useState("");
  const [cargandoOrigen, setCargandoOrigen] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const [DolarBcv,setPrecioBCV ]=useState('');
  const [DolarBcvLoading,setPrecioBCVLoad ]=useState(true);

  const [TicketBs,setTicketBs]=useState();
  const [TicketBsLoad,setTicketBsLoad]=useState(true);

  const [TicketDolar,setTicketDolar]=useState('');
  const [TicketDolarLoad,setTicketDolarLoad]=useState(true);

  const[Load,SetLoad]=useState(false);

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

  const PreciodelTicketbs = async () => {
    setTicketBs(40);
    setTicketBsLoad(false);
    console.log("false setTicketBsLoad")
  };
  const PreciodelTicketdolar = async () => {
      if(TicketBsLoad === false){
        console.log("false setTicketDolarLoad false")
         const TicketDD= TicketBs/DolarBcv
          setTicketDolar(TicketDD.toFixed(2));
          setTicketDolarLoad(false)
      }
         
      
};

  useEffect(() => {
  obtenerUbicacionOrigen();
  
  // Ejecutamos la carga de datos financieros en orden
  const cargarDatosFinancieros = async () => {
    try {
      // 1. Obtener Dólar
      const respuesta = await fetch('https://ve.dolarapi.com/v1/dolares');
      const datos = await respuesta.json();
      const oficial = datos.find(d => d.fuente === 'oficial');
      const valorDolar = oficial.promedio;
      
      setPrecioBCV(valorDolar);
      setPrecioBCVLoad(false);

      // 2. Establecer Ticket BS (Hardcoded por ahora)
      const valorTicketBs = 40;
      setTicketBs(valorTicketBs);
      setTicketBsLoad(false);

      // 3. Calcular Dólar inmediatamente con los valores locales, no con el estado
      // porque el estado aún no se ha "refrescado" en esta vuelta del ciclo
      const calculoDolar = valorTicketBs / valorDolar;
      setTicketDolar(calculoDolar.toFixed(2));
      setTicketDolarLoad(false);

    } catch (error) {
      console.error("Error en carga financiera:", error);
    }
  };

  cargarDatosFinancieros();
}, []); // Solo se ejecuta al montar



const handleSearch = () => {
  
  SetLoad(true);

  setTimeout(()=>{
     if (!selectedDestinationName || selectedDestinationName === "") {
      Alert.alert("Atención", "Por favor selecciona un destino primero");
      return;
    }
  
    console.log("Navegando a WebMap con destino a", selectedDestinationName);
    SetLoad(false)
    router.replace({
      pathname: "./WebMap", 
      params: { destino: selectedDestinationName }
    });
  },3000)

 
};

  return (
  
      <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{  backgroundColor: "#ffffffff", width:'100%' }} 
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              bounces={false}
              >
      {/* SECCIÓN SUPERIOR AZUL */}
      <View style={styles.headerBackground}>
       
          <View style={styles.headerContent}>
            <Image style={{width:210, height:210, position:'absolute', top:10, left:110}} source={require("../../../assets/img/autobuss.png")}></Image>
            
            <View>
              <Text style={styles.userName}>¡Bienvenido!</Text>
              <Text style={styles.welcomeSub}>¡A Ciudad Guayana Bus!</Text>
            </View>
            <TouchableOpacity>
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
          <Text style={styles.statValue}>{DolarBcvLoading? (<ActivityIndicator size="small" color="#0022ffff" />): `Bs. ${DolarBcv}`}</Text>
        </View>
      </View>
        {/* TARJETA DE SALDO (NARANJA) */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Saldo actual</Text>
        <Text style={styles.balanceAmount}>Bs. 54.59</Text>
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
    fontSize: 28,
    color: 'white',
    fontWeight: 'bold',
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
    borderRadius: 10,
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