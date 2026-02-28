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
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const supabase = createClient('https://wkkdynuopaaxtzbchxgv.supabase.co', 'sb_publishable_S18aNBlyLP3-hV_mRMcehA_zbCDMSGP');

export default function Home({ navigation }) {
  const insets = useSafeAreaInsets(); // 💡 EL SECRETO PARA QUE QUEDE PERFECTO
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

  const [Load, SetLoad] = useState(false);
  const [userImage, SetuserImage] = useState(null);
  const [UserName, setUserName] = useState(''); // 💡 NUEVO ESTADO
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
    const loadUserData = async () => {
      // Cargamos el nombre
      const name = await getusername();
      if (name) {
        setUserName(name.split(' ')[0]); // Tomamos solo el primer nombre para que no se vea amontonado
      }

      // Cargamos la imagen
      const sessionData = await AsyncStorage.getItem('@Sesion_usuario');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.profilePictureUrl) {
          SetuserImage(session.profilePictureUrl);
        }
      }
    };
    loadUserData();
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
    <View style={{flex: 1, backgroundColor: theme.background}}>
      
      {/* 💡 1. STATUS BAR TRANSPARENTE */}
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      
      {/* 💡 2. EL ESCUDO MÁGICO DE TU COMPAÑERO */}
      <View style={{ 
        position: 'absolute', 
        top: 0, left: 0, right: 0, 
        backgroundColor: '#003366', 
        height: insets.top, // Toma la altura exacta de la barra de notificaciones del teléfono
        zIndex: 9999 
      }} />

      <ScrollView 
        contentContainerStyle={{ backgroundColor: theme.background_2, width:'100%', paddingBottom: 100 }} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        bounces={false}
      >

{/* HEADER AZUL - 100% RESPONSIVO (A PRUEBA DE MAMÁS) */}
        <LinearGradient 
          colors={['#003366','#3182d3']} 
          style={{
            // 💡 1. ELIMINAMOS la altura fija (height)
            // 💡 2. AGREGAMOS paddingBottom: 60 para que siempre haya espacio sin importar cuánto crezca el texto
            paddingBottom: 60, 
            paddingHorizontal: 25, 
            paddingTop: insets.top + 15, 
            borderBottomLeftRadius: 50, 
            borderBottomRightRadius: 50, 
            overflow: 'hidden'
          }}
        >
          {/* Autobús de fondo */}
          <Image 
            style={{width:220, height:220, position:'absolute', top: insets.top - 35, right: -70, opacity: 0.9}} 
            source={require("../../../assets/img/autobuss.png")} 
          />
          
          {/* FILTRO DE CONTRASTE */}
          <LinearGradient
            colors={['rgba(0,51,102,0.6)', 'rgba(0,51,102,0.3)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '80%', zIndex: 1 }}
          />

          {/* Contenedor de Textos */}
          <View style={{zIndex: 2}}>
            
            {/* 1. Bloque de Perfil */}
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <TouchableOpacity onPress={() => router.push("/pages/Pasajero/Profile")}>
                {userImage ? (
                  <Image source={{ uri: userImage }} style={{ width: 55, height: 55, borderRadius: 27.5, borderWidth: 2, borderColor: 'white' }} />
                ) : (
                  <Ionicons name="person-circle" size={55} color="white" />
                )}
              </TouchableOpacity>
              
              <View style={{marginLeft: 12, flex: 1}}>
                <Text style={{ 
                  color: 'white', 
                  fontSize: 20, 
                  fontWeight: 'bold',
                  textShadowColor: 'rgba(0,51,102,0.9)', 
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 3
                }} numberOfLines={1}>
                  Hola, {UserName || "Pasajero"}
                </Text>
                
                <Text style={{ 
                  color: 'rgba(255,255,255,0.9)', 
                  fontSize: 13, 
                  marginTop: 2,
                  textShadowColor: 'rgba(0,51,102,0.8)',
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 3
                }}>
                  ¡Vamos por tu siguiente viaje!
                </Text>
              </View>
            </View>

            {/* 2. Texto Explicativo (DENTRO DEL NUEVO RECUADRO) */}
            <View style={{
              marginTop: 16,
              backgroundColor: 'rgba(0,51,102,0.8)', 
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 12, 
              alignSelf: 'flex-start', 
              maxWidth: '70%'
            }}>
              <Text style={{
                fontSize: 14, 
                color: 'white', 
                fontWeight: '500', 
                lineHeight: 18
              }}>
                Selecciona tu destino y visualiza tu bus más cercano.
              </Text>
            </View>

          </View>
        </LinearGradient>
  
        {/* TARJETA DE RUTA */}
        <View style={{
          backgroundColor: 'white', marginHorizontal: 20, 
          // 💡 Ajuste de margen para montarse sobre los 60px de paddingBottom que dejamos arriba
          marginTop: -35, 
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

{/* SALDO - DISEÑO FINAL BLANCO/AZUL CON ESPACIADO CORREGIDO */}
        <View style={{
          backgroundColor: '#E69500', 
          marginHorizontal: 20, 
          padding: 25, 
          borderRadius: 24, 
          marginTop: 15,
          elevation: 5, 
          shadowColor: '#000', 
          shadowOpacity: 0.3,
        }}>
          
          <Text style={{color: 'rgba(255,255,255,0.7)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8}}>
            Saldo disponible
          </Text>
          
          <Text style={{color: 'white', fontSize: 34, fontWeight: 'bold', marginBottom: 2}}>
            Bs. {saldo ? saldo.toFixed(2) : "0.00"}
          </Text>
          
          {/* 💡 Le damos marginBottom: 20 aquí para separar el botón de los dólares */}
          <Text style={{color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '600', marginBottom: 20}}>
            $ ~ {(saldo / (DolarBcv > 0 ? DolarBcv : 1)).toFixed(2)} USD
          </Text>

          <TouchableOpacity 
            style={{ 
              backgroundColor: '#fff', 
              flexDirection: 'row', 
              alignItems: 'center', 
              justifyContent: 'center', 
              paddingVertical: 14, 
              borderRadius: 14, 
              elevation: 3, 
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 3
            }}
            onPress={() => router.push('/pages/Pasajero/Wallet')}
          >
            <FontAwesome6 name="wallet" size={18} color="#007bff" style={{ marginRight: 10 }} />
            <Text style={{ color: '#007bff', fontSize: 15, fontWeight: 'bold' }}>
              Mi Billetera
            </Text>
          </TouchableOpacity>

        </View>
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
    </View>
  );
}