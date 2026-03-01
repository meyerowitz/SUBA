import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, Alert, TouchableOpacity, StatusBar, Image, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Picker } from "@react-native-picker/picker";
import Feather from 'react-native-vector-icons/Feather';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getuserid, getusername } from '../../Components/AsyncStorage';
import { useTheme } from '../../Components/Temas_y_colores/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute } from '../../Components/Providers/RouteContext';
import { SafeAreaView } from "react-native-safe-area-context";
import Offline from '../../Components/Offline'
import ModalTarjeta from '../../Components/Modales/ModalTarjeta'


const supabase = createClient('https://wkkdynuopaaxtzbchxgv.supabase.co', 'sb_publishable_S18aNBlyLP3-hV_mRMcehA_zbCDMSGP');

export default function Home({ navigation }) {
  const [ubicacionActual, setUbicacionActual] = useState('');
  const [selectedDestinationName, setSelectedDestinationName] = useState("");
  const { setSelectedRoute } = useRoute();
  const [cargandoOrigen, setCargandoOrigen] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const [DolarBcv, setPrecioBCV] = useState('1');
  const [DolarBcvLoading, setPrecioBCVLoad] = useState(true);

  // Rutas y Paradas
  const [activeRoutes, setActiveRoutes] = useState([]);
  const [allStops, setAllStops] = useState([]);
  const [selectedStop, setSelectedStop] = useState("");
  const [filteredRoutes, setFilteredRoutes] = useState([]);

  // Estados Financieros
  const [TicketBs, setTicketBs] = useState(1);
  const [TicketBsLoad, setTicketBsLoad] = useState(true);
  const [TicketDolar, setTicketDolar] = useState('');
  const [TicketDolarLoad, setTicketDolarLoad] = useState(true);
  const [saldo, setSaldo] = useState(0.00);

  // Modales visibilidad
  const [modalTarjeta, setModalTarjeta] = useState(false);

  const [Load, SetLoad] = useState(false);
  const [userImage, SetuserImage] = useState(null);
  const { theme } = useTheme();
  
  const router = useRouter();
  const API_URL = "https://subapp-api.onrender.com";
  const STOP_CACHE_KEY = "guayana_bus_stops_cache_v2";

  // REFERENCIAS PARA EVITAR ERRORES EN TIMEOUTS
  const selectedDestinationNameRef = useRef(selectedDestinationName);

  useEffect(() => {
    selectedDestinationNameRef.current = selectedDestinationName;
  }, [selectedDestinationName]);

  // --- CARGA DE DATOS INICIALES ---
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
    obtenerUbicacionOrigen();
    cargarRutas();
    cargarFinanzas();
  }, []);

  const cargarRutas = async () => {
    try {
      const res = await fetch(`${API_URL}/api/rutas/activas`);
      const json = await res.json();
      if (json.success) {
        const mapped = json.data.map(r => ({
          name: r.name,
          lat: r.endPoint.lat,
          lon: r.endPoint.lng,
          stops: r.stops 
        }));
        setActiveRoutes(mapped);

        // Extraer paradas únicas
        const uniqueStopsMap = new Map();
        mapped.forEach(route => {
          if (route.stops && Array.isArray(route.stops)) {
            route.stops.forEach(stop => {
              if (stop.name) uniqueStopsMap.set(stop.name, stop);
            });
          }
        });
        
        const stopsArray = Array.from(uniqueStopsMap.values())
          .sort((a, b) => a.name.localeCompare(b.name));
        setAllStops(stopsArray);
      }
    } catch (err) {
      console.error("Error cargando rutas:", err);
    }
  };

  const cargarFinanzas = async () => {
    try {
      // 1. Dólar
      const resDolar = await fetch('https://ve.dolarapi.com/v1/dolares');
      const jsonDolar = await resDolar.json();
      const oficial = jsonDolar.find(d => d.fuente === 'oficial');
      const valorDolarActual = oficial.promedio;

      // 2. Pasaje
      const valorPasajeBs = await obtenerDatoPasaje();

      // 3. Calculo
      let calculoDolar = 0;
      if (valorPasajeBs > 0 && valorDolarActual > 0) {
        calculoDolar = (valorPasajeBs / valorDolarActual).toFixed(2);
      }

      setPrecioBCV(valorDolarActual);
      setPrecioBCVLoad(false);
      setTicketBs(valorPasajeBs);
      setTicketBsLoad(false);
      setTicketDolar(calculoDolar);
      setTicketDolarLoad(false);
      
      obtenerSaldoReal();
    } catch (error) {
      console.error("Error finanzas:", error);
      setPrecioBCVLoad(false);
      setTicketBsLoad(false);
      setTicketDolarLoad(false);
    }
  };

  // --- LÓGICA DE GEOLOCALIZACIÓN ---
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
      if (error) throw error;
      return data ? data.pasaje : 0;
    } catch (error) {
      return 0;
    }
  };

  const obtenerSaldoReal = async () => {
    try {
      const userid = await getuserid();
      if (!userid) return;

      const { data, error } = await supabase
        .from('Saldo_usuarios')
        .select('saldo')
        .eq('external_user_id', userid.trim())
        .maybeSingle(); 

      if (data) setSaldo(data.saldo);
      else setSaldo(0.00);
    } catch (error) {
      console.log("Error saldo:", error);
    }
  };

  const handleStopChange = (stopName) => {
    setSelectedStop(stopName);
    setSelectedDestinationName(""); 
    
    if (stopName) {
        const routes = activeRoutes.filter(route => 
            route.stops && route.stops.some(s => s.name === stopName)
        );
        setFilteredRoutes(routes);
        if (routes.length === 1) {
            const routeName = routes[0].name;
            setSelectedDestinationName(routeName);
            setSelectedRoute({ name: routeName });
        }
    } else {
        setFilteredRoutes([]);
    }
  };

  // --- NAVEGACIÓN CORREGIDA AL MAPA ---
  const handleSearch = () => {
    SetLoad(true);

    setTimeout(() => {
      const currentDest = selectedDestinationNameRef.current;

      if (!currentDest || currentDest === "") {
        SetLoad(false); 
        Alert.alert("Atención", "Por favor selecciona un destino primero");
        return;
      }
    
      console.log("Navegando a Pestaña Map con destino:", currentDest);
      SetLoad(false);
      
      // USAMOS NAVIGATION.NAVIGATE PARA CAMBIAR DE TAB (NO PUSH)
      // Esto mantiene la barra de navegación visible
      navigation.navigate('Map', { destino: currentDest });
      
    }, 2000); // Reduje el tiempo a 2s para mejor UX
  };

  return (
    <Offline>
      <SafeAreaView style={{ backgroundColor: 'red'}}>
      <StatusBar barStyle="light-content" backgroundColor={"#003366"} />
 
      <ScrollView 
        style={{}} 
        contentContainerStyle={{ backgroundColor: theme.background_2, width:'100%', paddingBottom: 100, flexGrow:1, minHeight:'100%' }}
        
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        bounces={false}
      >

        {/* HEADER AZUL */}
        <LinearGradient 
          colors={['#003366','#3182d3']} 
          style={{height: 280, paddingHorizontal: 25, borderBottomLeftRadius: 50, borderBottomRightRadius: 50}}
        >
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 30}}>
            <Image 
              style={{width:210, height:210, position:'absolute', top:13, left:110}} 
              source={require("../../../assets/img/autobuss.png")} 
            />
            
            <View style={{marginTop: 23, marginLeft: 13}}>
              <Text style={{fontSize: 28, color: 'white', fontWeight: 'bold'}}>¡Bienvenido!</Text>
              <Text style={{fontSize: 22, color: 'white', fontWeight: '500', marginTop: 5}}>
                ¡A Ciudad Guayana Bus!
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/pages/Pasajero/Profile")}>
              {userImage ? (
                <Image source={{ uri: userImage }} style={{ width: 50, height: 50, borderRadius: 25 }} />
              ) : (
                <Ionicons name="person-circle-outline" size={50} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
  
        {/* TARJETA DE RUTA */}
        <View style={{
          backgroundColor: 'white', marginHorizontal: 20, marginTop: -85, 
          borderRadius: 15, padding: 15, elevation: 8, 
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5
        }}>
          <View style={{flexDirection: 'row'}}>
            
            {/* COLUMNA IZQUIERDA */}
            <View style={{ alignItems: 'center', justifyContent: 'space-around', paddingVertical: 10, width: 30 }}>
              <Ionicons name="location" size={20} color="#58A3B8" />
              <View style={{ width: 1, height: 40, backgroundColor: '#DDD', marginVertical: 4 }} />
              <Ionicons name="location" size={20} color="#1A2F35" />
            </View>

            {/* COLUMNA DERECHA */}
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

              {/* FILTRO DE PARADA */}
              <View style={{ height: 60, justifyContent: 'center' }}>
                <Text style={{ fontSize: 12, color: '#999' }}>Parada Destino (Filtro)</Text>
                <Picker 
                    selectedValue={selectedStop} 
                    onValueChange={handleStopChange} 
                    style={{ marginLeft: -15, width: '110%' }}
                  >
                      <Picker.Item label="Todas las paradas..." value="" color="#999" />
                      {allStops.map((stop, index) => (
                          <Picker.Item key={`${stop.name}-${index}`} label={stop.name} value={stop.name} />
                      ))}
                  </Picker>
              </View>

              <View style={{ height: 1, backgroundColor: '#EEE' }} />

              {/* SELECCIÓN DE RUTA */}
              <View style={{ height: 60, justifyContent: 'center' }}>
                <Text style={{ fontSize: 12, color: '#999' }}>Ruta a elegir</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Picker
                    selectedValue={selectedDestinationName}
                    onValueChange={(itemValue) => {
                      setSelectedDestinationName(itemValue);
                      setSelectedRoute(itemValue ? { name: itemValue } : null);
                    }}
                    style={{ flex: 1, marginLeft: -15 }}
                    enabled={!isSearching}
                  >
                    <Picker.Item 
                      label={selectedStop ? (filteredRoutes.length > 0 ? "Selecciona ruta..." : "Sin rutas disponibles") : "Selecciona una ruta..."} 
                      value="" 
                      color="#999" 
                    />
                    {(selectedStop ? filteredRoutes : activeRoutes).map((dest) => (
                      <Picker.Item key={dest.name} label={dest.name} value={dest.name} />
                    ))}
                  </Picker>
                  
                  <TouchableOpacity 
                    style={{ backgroundColor: '#007bff', width: 42, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }} 
                    onPress={handleSearch}
                    disabled={isSearching}
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
       
        {/* ESTADÍSTICAS */}
        <View style={{
          backgroundColor: 'white', flexDirection: 'row', padding: 20, marginHorizontal: 20, marginTop: 15,
          borderRadius: 15, elevation: 8, shadowOpacity: 0.2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }
        }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: '#666', fontWeight: '600' }}>Ticket $</Text>
            <Text style={{ fontWeight: 'bold', color: '#333', fontSize: 16 }}>
              {TicketDolarLoad ? <ActivityIndicator size="small" color={theme.ActivityIndicator} /> : `$. ${TicketDolar}`}
            </Text>
          </View>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: '#666', fontWeight: '600' }}>Ticket bs</Text>
            <Text style={{ fontWeight: 'bold', color: '#333', fontSize: 16 }}>
              {TicketBsLoad ? <ActivityIndicator size="small" color={theme.ActivityIndicator} /> : `Bs. ${TicketBs}`}
            </Text>
          </View>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: '#666', fontWeight: '600' }}>Dolar BCV</Text>
            <Text style={{ fontWeight: 'bold', color: '#333', fontSize: 16 }}>
              {DolarBcvLoading ? <ActivityIndicator size="small" color={theme.ActivityIndicator} /> : `Bs. ${DolarBcv.toFixed(2)}`}
            </Text>
          </View>
        </View>

        {/* SALDO */}
        <TouchableOpacity onPress={()=>{setModalTarjeta(true)}} style={{
          backgroundColor: '#E69500', marginHorizontal: 20, padding: 20, borderRadius: 20, marginTop: 15,
          elevation: 5, shadowColor: '#000', shadowOpacity: 0.3
        }}>
          <Text style={{color: 'white', fontSize: 18, fontWeight: 'bold'}}>Saldo actual</Text>
          <Text style={{color: 'white', fontSize: 38, fontWeight: 'bold', marginTop: 10}}>
            {saldo ? `Bs.${saldo.toFixed(1)}` : `Bs. ${saldo.toFixed(2)}` }
          </Text>
        </TouchableOpacity>
      </ScrollView>
      
      {/* PANTALLA DE CARGA */}
      {Load && (       
        <View style={{
          justifyContent: "center", alignItems: "center", backgroundColor: "#ffffff95", 
          height: '100%', position: 'absolute', width: '100%', zIndex: 999
        }}>
          <Image
            source={require("../../../assets/img/billete-electronico.gif")}
            style={{height: 300, width: 300, marginBottom: 20}}
            contentMode="contain"
          />
          <ActivityIndicator size={60} color="#313135ff" />
        </View>
      )}

      <ModalTarjeta
        visible={modalTarjeta} 
        onClose={() => setModalTarjeta(false)} 
        onConfirm={() => {
          setModalTarjeta(false);
          router.push('/pages/Pasajero/Tarjeta/FormularioPerfil'); // O la lógica de solicitud
        }}
      />

      </SafeAreaView>
    </Offline>
  );
}