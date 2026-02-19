import React, { useRef, useEffect, useState } from "react";
import { 
  View, Text, StyleSheet, ActivityIndicator, Alert, 
  TouchableOpacity, StatusBar, Image, Animated, Dimensions 
} from "react-native";
import WebView from "react-native-webview";
import { Picker } from "@react-native-picker/picker";
import { Feather, Ionicons } from "@expo/vector-icons"; 
import { Asset } from "expo-asset";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../Components/Temas_y_colores/ThemeContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import { getuserid, getusername } from '../../Components/AsyncStorage';
import { useRoute } from '../../Components/Providers/RouteContext';

import mqtt from "mqtt"; // <-- IMPORTANTE: Asegúrate de tener instalado 'mqtt'
import Destinos from "../../Components/Destinos.json";
import Volver from '../../Components/Botones_genericos/Volver';

const supabase = createClient('https://wkkdynuopaaxtzbchxgv.supabase.co', 'sb_publishable_S18aNBlyLP3-hV_mRMcehA_zbCDMSGP');

const { height } = Dimensions.get('window');
const STOP_CACHE_KEY = "guayana_bus_stops_cache_v2";
const GUAYANA_BBOX = "8.21,-62.88,8.39,-62.60";
const FETCH_BUSES_INTERVAL = 5000; // Refrescar buses en el mapa cada 5 seg
const API_URL = "https://subapp-api.onrender.com";

// --- VARIABLES GLOBALES (Persisten fuera del ciclo de vida de React) ---
let hasCenteredSession = false; 
let globalBuses = []; 

const fetchGuayanaBusStops = async () => {
  try {
    const cached = await AsyncStorage.getItem(STOP_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      // 24 horas de expiración
      if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) return parsed.data;
    }
  } catch (e) {}

  try {
    console.log("📥 Obteniendo paradas desde API Propia...");
    const response = await fetch(`${API_URL}/api/paradas/activas`);
    const json = await response.json();

    if (json.success && json.data) {
        const stops = json.data.map(stop => ({
            lat: stop.location.lat,
            lon: stop.location.lng,
            name: stop.name
        }));
        AsyncStorage.setItem(STOP_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: stops }));
        console.log(`✅ ${stops.length} paradas obtenidas.`);
        return stops;
    }
  } catch (error) {
    console.error("Error fetching stops:", error);
  }
  return [];
};

export default function UnifiedHome() {
  const webviewRef = useRef(null);
  const [mapHtmlContent, setMapHtmlContent] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);
  const [stopsInjected, setStopsInjected] = useState(false);
  
  const [userLocation, setUserLocation] = useState(null);
  const [ubicacionTexto, setUbicacionTexto] = useState("Detectando ubicación...");
  
  const [isSearchExpanded, setIsSearchExpanded] = useState(false); 
  const [username, setUsername] = useState("Pasajero");
  
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDestinationName, setSelectedDestinationName] = useState(""); const { setSelectedRoute } = useRoute();
  
  const [saldo, setSaldo] = useState(0.00);
  const [tasaBCV, setTasaBCV] = useState(382.63); 
  const [loadingSaldo, setLoadingSaldo] = useState(true);
  const { destino } = useLocalSearchParams();

  const [ShowEta, setShowEta]= useState(true); 
  const [Eta, SetEta]= useState("-- min");
  const [Distancia, SetDistancia]= useState("-- Km");
  const [RouteName, SetRouteName]= useState("");
  
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(height)).current;

  // --- LÓGICA MQTT ---
  const createOrUpdateBusData = (busData) => {
    // Buscamos si el bus ya existe por su _id (o bus_id según envíe tu broker)
    const exists = globalBuses.some(bus => bus._id === busData._id);
    if (exists) {
      const index = globalBuses.findIndex(bus => bus._id === busData._id);
      globalBuses[index] = busData;
    } else {
      globalBuses.push(busData);
    }
  };

  useEffect(() => {
    console.log("Conectando al broker MQTT...");
    const mqttClient = mqtt.connect(
      "wss://3ef878324832459c8b966598a4c58112.s1.eu.hivemq.cloud:8884/mqtt",
      { username: "testeo", password: "123456Abc" }
    );

    mqttClient.on("connect", () => {
      console.log("✅ Conectado al broker MQTT");
      mqttClient.subscribe("subapp/passenger");
    });

    mqttClient.on("message", (topic, message) => {
      try {
        const datos = JSON.parse(message.toString());
        createOrUpdateBusData(datos);
      } catch (e) {
        console.error("Error parseando mensaje MQTT:", e);
      }
    });

    mqttClient.on("error", (err) => console.error("Error MQTT:", err));

    return () => {
      if (mqttClient) mqttClient.end();
      console.log("MQTT desconectado");
    };
  }, []);

  // --- RENDERIZADO DE BUSES EN EL MAPA ---
  useEffect(() => {
    const renderLoop = setInterval(() => {
      if (isMapReady && webviewRef.current && globalBuses.length > 0) {
        const transformedData = globalBuses.map((bus) => ({
          bus_id: bus._id || "Desconocido",
          lat: bus.latitude,
          lon: bus.longitude,
        }));

        const busDataString = JSON.stringify(transformedData);
        webviewRef.current.injectJavaScript(`renderBusLocations(${busDataString}); true;`);
      }
    }, FETCH_BUSES_INTERVAL);

    return () => clearInterval(renderLoop);
  }, [isMapReady]);

  // 1. Cargar Datos Iniciales
  useEffect(() => {
    const cargarDatos = async () => {
        const name = await getusername();
        if(name) setUsername(name);
        obtenerSaldoReal();
    };
    cargarDatos();
  }, []);

  const obtenerSaldoReal = async () => {
    try {
      const userid = await getuserid();
      if (!userid) return;
      const { data } = await supabase.from('Saldo_usuarios').select('saldo').eq('external_user_id', userid.trim()).maybeSingle(); 
      if (data) setSaldo(data.saldo);
    } catch (error) { console.log(error); } 
    finally { setLoadingSaldo(false); }
  };

  // 2. Mapa y GPS
  useEffect(() => {
    const loadHTML = async () => {
      try {
        const asset = Asset.fromModule(require("../../../assets/map.html"));
        await asset.downloadAsync();
        const htmlString = await FileSystem.readAsStringAsync(asset.localUri || asset.uri);
        setMapHtmlContent(htmlString);
      } catch (e) { console.error(e); } 
      finally { setMapLoading(false); }
    };
    loadHTML();
  }, []);

  useEffect(() => {
    let sub = null;
    const startLoc = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return setUbicacionTexto("Sin GPS");
      
      let curr = await Location.getCurrentPositionAsync({});
      let geo = await Location.reverseGeocodeAsync({ latitude: curr.coords.latitude, longitude: curr.coords.longitude });
      if (geo?.[0]) setUbicacionTexto(`${geo[0].street || ''} ${geo[0].city || 'Guayana'}`);

      sub = await Location.watchPositionAsync({ accuracy: 4, timeInterval: 5000, distanceInterval: 5 }, (loc) => {
          setUserLocation(loc.coords);
          if (webviewRef.current && isMapReady) {
            webviewRef.current.injectJavaScript(`updateUserMarker(${loc.coords.latitude}, ${loc.coords.longitude}); true;`);
          }
      });
    };
    startLoc();
    return () => sub?.remove();
  }, [isMapReady]);

  // 3. Auto-centrado
  useEffect(() => {
    if (userLocation && isMapReady && !hasCenteredSession && webviewRef.current) {
        webviewRef.current.injectJavaScript(`moveTo(${userLocation.latitude}, ${userLocation.longitude}); true;`);
        hasCenteredSession = true; 
    }
  }, [userLocation, isMapReady]);

  // 4. Inyectar Paradas
  useEffect(() => {
    if (isMapReady && webviewRef.current && !stopsInjected) {
        fetchGuayanaBusStops().then(stops => {
            if (stops && stops.length > 0) {
                webviewRef.current.injectJavaScript(`renderBusStops(${JSON.stringify(stops)}); true;`);
                setStopsInjected(true);
            }
        });
    }
  }, [isMapReady, stopsInjected]);

  // 5. Animación ETA
  useEffect(() => {
    Animated.spring(slideAnim, { toValue: ShowEta ? height : 0, useNativeDriver: true, friction: 8 }).start();
  }, [ShowEta]);

  // 6. Manejador Mensajes WebView
  const handleWebViewMessage = (event) => {
    const msg = event.nativeEvent.data;
    if (msg === "MAP_LOADED") { setIsMapReady(true); setStopsInjected(false); }
    try {
        const data = JSON.parse(msg);
        if (data.type === 'ROUTE_INFO') {
           SetEta(`${data.duration} min`); 
           SetDistancia(`${data.distance} Km`); 
           SetRouteName(data.name || "Ruta");
           setShowEta(false); 
           setIsSearchExpanded(false); 
        }
    } catch(e) {}
  };

  const handleSearch = () => {
    if (!selectedDestinationName || !userLocation) return;
    setIsSearching(true);
    const dest = Destinos.find(d => d.name === selectedDestinationName);
    if (dest) {
      webviewRef.current.injectJavaScript(`drawRouteAndAnimate(${userLocation.latitude}, ${userLocation.longitude}, ${dest.lat}, ${dest.lon}); true;`);
    }
    setTimeout(() => setIsSearching(false), 1500);
  };

  const centrar = () => {
      if(userLocation && webviewRef.current) {
        webviewRef.current.injectJavaScript(`moveTo(${userLocation.latitude}, ${userLocation.longitude}); true;`);
      }
  }

  if (mapLoading) return <ActivityIndicator size="large" color="#003366" style={{flex:1}} />;

  const isRouteActive = !ShowEta; 

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={"#003366"} />

      {/* FONDO MAPA */}
      <View style={StyleSheet.absoluteFillObject}>
        <WebView 
          ref={webviewRef} 
          source={{ html: mapHtmlContent }} 
          onMessage={handleWebViewMessage} 
          style={{ flex: 1 }} 
          javaScriptEnabled={true} 
        />
      </View>

      <View>
        <Volver route="/pages/Pasajero/Navigation" color={"black"} style={{top:70, left:5}}/>
        
        {/* BUSCADOR */}
        {!isSearchExpanded ? (
            <TouchableOpacity 
              style={styles.searchBarCompact} 
              activeOpacity={0.9}
              onPress={() => setIsSearchExpanded(true)}
            >
                <Text style={[styles.searchPlaceholder, selectedDestinationName && {color: '#003366', fontWeight:'bold'}]}>
                    {selectedDestinationName ? `📍 ${selectedDestinationName}` : "¿A dónde vamos?"}
                </Text>
                <View style={styles.searchIconCircle}>
                    <Feather name="search" size={20} color="white" />
                </View>
            </TouchableOpacity>
        ) : (
            <View style={styles.searchPanelExpanded}>
                <View style={styles.panelHeader}>
                    <Text style={styles.panelTitle}>Planifica tu viaje</Text>
                    <TouchableOpacity onPress={() => setIsSearchExpanded(false)}>
                        <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>
                </View>
                <View style={styles.inputRow}>
                    <Ionicons name="radio-button-on" size={20} color="#003366" />
                    <Text style={styles.locationText} numberOfLines={1}>{ubicacionTexto}</Text>
                </View>
                <View style={styles.verticalLine} />
                <View style={styles.inputRow}>
                    <Ionicons name="location" size={20} color="#E69500" />
                    <View style={{flex: 1, marginLeft: 5}}>
                      <Picker selectedValue={selectedDestinationName} onValueChange={(v) => {setSelectedDestinationName(v),setSelectedRoute(v ? rutaCompleta || { name: v } : null);}} style={{ height: 50, width: '100%' }}>
                          <Picker.Item label="Selecciona destino..." value="" color="#999" />
                          {Destinos.map((d) => (<Picker.Item key={d.name} label={d.name} value={d.name} />))}
                      </Picker>
                    </View>
                </View>
                <TouchableOpacity style={styles.searchBtnLarge} onPress={handleSearch} disabled={isSearching}>
                    {isSearching ? <ActivityIndicator color="#003366" /> : <Text style={styles.searchBtnText}>Buscar Ruta</Text>}
                </TouchableOpacity>
            </View>
        )}
      </View>

      {/* BOTONES FLOTANTES */}
      <TouchableOpacity 
        style={[styles.gpsBtn, isRouteActive ? { bottom: 250 } : { bottom: 140 }]} 
        onPress={centrar}
      >
         <Ionicons name="locate" size={24} color="#003366" />
      </TouchableOpacity>

      {/* TARJETA SALDO */}
      {!isSearchExpanded && (
        isRouteActive ? (
            <View style={styles.miniBalanceCard}>
                 <Text style={styles.miniBalanceText}>Bs. {saldo.toFixed(2)}</Text>
                 <TouchableOpacity style={styles.miniAddBtn} onPress={() => router.push('/pages/Pasajero/Wallet')}>
                    <Ionicons name="add" size={20} color="white" />
                 </TouchableOpacity>
            </View>
        ) : (
            <View style={styles.bottomCard}>
                 <View style={{flex: 1}}>
                     <Text style={styles.saldoLabel}>Saldo disponible</Text>
                     <Text style={styles.saldoValue}>Bs. {saldo.toFixed(2)}</Text>
                     <Text style={styles.saldoSub}>≈ ${(saldo / (tasaBCV || 1)).toFixed(2)}</Text>
                 </View>
                 <TouchableOpacity style={styles.walletBtn} onPress={() => router.push('/pages/Pasajero/Wallet')}> 
                     <Text style={styles.walletBtnText}>Recargar</Text>
                     <Ionicons name="wallet-outline" size={20} color="#003366" style={{marginLeft: 5}}/>
                 </TouchableOpacity>
            </View>
        )
      )}

      {/* TARJETA ETA */}
      <Animated.View style={[styles.etaCard, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.etaHeader}>
              <Text style={styles.etaRouteName}>{RouteName}</Text>
              <TouchableOpacity onPress={() => setShowEta(true)}>
                  <Ionicons name="close-circle" size={24} color="#999" />
              </TouchableOpacity>
          </View>
          <View style={styles.etaDetails}>
              <View style={{alignItems:'center'}}>
                  <Text style={styles.etaValue}>{Eta}</Text>
                  <Text style={styles.etaLabel}>Tiempo</Text>
              </View>
              <View style={{width:1, height:30, backgroundColor:'#ddd'}}/>
              <View style={{alignItems:'center'}}>
                  <Text style={styles.etaValue}>{Distancia}</Text>
                  <Text style={styles.etaLabel}>Distancia</Text>
              </View>
              <Image source={require("../../../assets/img/autobus.png")} style={{width: 60, height: 40, resizeMode:'contain'}} />
          </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f2' },
  searchBarCompact: {
    position: 'absolute', top: 60, left: 40, right: 20,
    backgroundColor: 'white', borderRadius: 25, height: 50,
    flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 5,
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.15
  },
  searchPlaceholder: { flex: 1, fontSize: 16, fontWeight: '600', color: '#666' },
  searchIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#003366', justifyContent: 'center', alignItems: 'center' },

  searchPanelExpanded: { position: 'absolute', top: 60, left: 40, right: 20, backgroundColor: 'white', borderRadius: 20, padding: 20, elevation: 15 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  panelTitle: { fontSize: 16, fontWeight: 'bold', color: '#003366' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  locationText: { marginLeft: 10, color: '#555', fontSize: 14, flex: 1 },
  verticalLine: { width: 1, height: 20, backgroundColor: '#ddd', marginLeft: 9 },
  searchBtnLarge: { marginTop: 15, backgroundColor: '#E69500', borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center' },
  searchBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  gpsBtn: {
    position: 'absolute', right: 20, 
    backgroundColor: 'white', width: 50, height: 50, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center', elevation: 5, zIndex: 999 
  },

  bottomCard: {
    position: 'absolute', bottom: 30, left: 20, right: 20,
    backgroundColor: 'white', borderRadius: 20, padding: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    elevation: 10
  },
  saldoLabel: { fontSize: 12, color: '#666' },
  saldoValue: { fontSize: 24, fontWeight: 'bold', color: '#003366' },
  saldoSub: { fontSize: 13, color: '#888', marginTop: 2, fontWeight: '500' }, 
  walletBtn: { backgroundColor: '#bde0fe', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  walletBtnText: { color: '#003366', fontWeight: 'bold' },

  miniBalanceCard: {
    position: 'absolute', bottom: 250, left: 20, 
    backgroundColor: 'white', borderRadius: 30, paddingLeft: 15, paddingRight: 5, paddingVertical: 5,
    flexDirection: 'row', alignItems: 'center', elevation: 5, height: 50
  },
  miniBalanceText: { fontSize: 16, fontWeight: 'bold', color: '#003366', marginRight: 10 },
  miniAddBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E69500', justifyContent: 'center', alignItems: 'center' },

  etaCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30,
    padding: 25, elevation: 25, height: 230, zIndex: 100
  },
  etaHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  etaRouteName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  etaDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  etaValue: { fontSize: 24, fontWeight: 'bold', color: '#003366' },
  etaLabel: { color: '#888', fontSize: 12 },
});