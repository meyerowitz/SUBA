import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  StatusBar,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import WebView from "react-native-webview";
import { Asset } from "expo-asset";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system/legacy";
import { useTheme } from "../../Components/Temas_y_colores/ThemeContext";
import { useLocalSearchParams, useFocusEffect, useRouter } from "expo-router";
import mqtt from "mqtt";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const { height } = Dimensions.get("window");
const BASE_URL = "https://subapp-api.onrender.com/api";
const BUSES_API_URL = `${BASE_URL}/buses`;
const FETCH_INTERVAL = 5000;
let buses = [];

const fetchActiveRoutes = async () => {
  try {
    const response = await fetch(`${BASE_URL}/rutas/activas`);
    const json = await response.json();
    if (json.success && json.data) {
      console.log("✅ Rutas activas cargadas:", json.data.length);
      return json.data.map((route) => ({
        name: route.name,
        lat: route.endPoint.lat,
        lon: route.endPoint.lng,
        address: route.name,
        geometry: route.geometry,
        stops: route.stops,
      }));
    }
  } catch (error) {
    console.error("❌ Error cargando rutas:", error);
  }
  return [];
};

function createOrUpdateBusData(busData) {
  const exists = buses.some((bus) => bus.bus_id === busData.bus_id);
  if (exists) {
    const busIndex = buses.findIndex((bus) => bus.bus_id === busData.bus_id);
    buses[busIndex] = busData;
  } else if (!exists) {
    buses.push(busData);
  }
}

export default function WebMap() {
  const insets = useSafeAreaInsets();
  const webviewRef = useRef(null);
  const router = useRouter();
  const { routeName } = useLocalSearchParams();

  const [mapHtmlContent, setMapHtmlContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);
  
  const [userLocation, setUserLocation] = useState(null);
  const [activeRoutes, setActiveRoutes] = useState([]);
  const [hasCenteredOnce, setHasCenteredOnce] = useState(false);
  const [client, setClient] = useState(null);

  // --- CARGAR RECURSOS ---
  useEffect(() => {
    // 1. Cargar Rutas
    fetchActiveRoutes().then((mapped) => {
      if (mapped && mapped.length > 0) {
        setActiveRoutes(mapped);
      }
    });

    // 2. Cargar HTML del Mapa
    const loadHTML = async () => {
      try {
        const asset = Asset.fromModule(require("../../../assets/map.html"));
        await asset.downloadAsync();
        const uri = asset.localUri || asset.uri;
        const htmlString = await FileSystem.readAsStringAsync(uri);
        setMapHtmlContent(htmlString);
      } catch (error) {
        console.error("Error cargando el mapa:", error);
      } finally {
        setMapLoading(false);
      }
    };
    loadHTML();
  }, []);

  // --- UBICACIÓN DEL CONDUCTOR (Para centrar el mapa) ---
  useFocusEffect(
    useCallback(() => {
      let locationSubscription = null;
      let isMounted = true;

      const startTracking = async () => {
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (!isMounted) return;
          if (status !== "granted") {
            setLoading(false);
            return;
          }

          const sub = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.BestForNavigation,
              timeInterval: 5000,
              distanceInterval: 2,
            },
            (location) => {
              if (!isMounted) return;
              const { latitude, longitude } = location.coords;
              setUserLocation({ latitude, longitude });
              setLoading(false);
            }
          );
          
          if (!isMounted) {
            sub.remove();
          } else {
            locationSubscription = sub;
          }
        } catch (error) {
          console.error("Error GPS:", error);
          if (isMounted) setLoading(false);
        }
      };
      startTracking();
      return () => {
        isMounted = false;
        if (locationSubscription) locationSubscription.remove();
      };
    }, [])
  );

  // --- ACTUALIZAR MARCADOR EN EL MAPA ---
  useEffect(() => {
    if (userLocation && webviewRef.current && isMapReady) {
      const { latitude, longitude } = userLocation;
      const userJsCode = `updateUserMarker(${latitude}, ${longitude}); true;`;
      webviewRef.current.injectJavaScript(userJsCode);
    }
  }, [userLocation, isMapReady]);

  // --- DIBUJAR RUTA AUTOMÁTICAMENTE ---
  useEffect(() => {
    console.log("🔍 Check Ruta: Ready?", isMapReady, "| Name:", routeName, "| Routes loaded:", activeRoutes.length);
    
    if (isMapReady && routeName && activeRoutes.length > 0 && webviewRef.current) {
        const routeToDraw = activeRoutes.find(r => r.name === routeName);
        
        if (routeToDraw) {
            console.log("🎨 Dibujando ruta:", routeName);
            if (routeToDraw.geometry) {
                const geoJsonString = JSON.stringify(routeToDraw.geometry);
                webviewRef.current.injectJavaScript(`drawRouteFromGeoJSON(${geoJsonString}); true;`);
            } else if (userLocation) {
                console.log("⚠️ Sin geometría, usando OSRM fallback");
                const script = `drawRouteAndAnimate(${userLocation.latitude}, ${userLocation.longitude}, ${routeToDraw.lat}, ${routeToDraw.lon}); true;`;
                webviewRef.current.injectJavaScript(script);
            }
        } else {
            console.warn("❌ Ruta no encontrada en la lista activa:", routeName);
        }
    }
  }, [isMapReady, routeName, activeRoutes, userLocation]);

  // --- CENTRAR CÁMARA INICIALMENTE ---
  useEffect(() => {
    if (isMapReady && userLocation && !hasCenteredOnce && webviewRef.current) {
      const { latitude, longitude } = userLocation;
      webviewRef.current.injectJavaScript(`moveTo(${latitude}, ${longitude}); true;`);
      setHasCenteredOnce(true);
    }
  }, [isMapReady, userLocation]);

  // --- MQTT & OTROS BUSES ---
  useFocusEffect(
    useCallback(() => {
      let fetchBusesInterval;
      
      const loadAndRenderBuses = async () => {
        const transformedData = buses.map((bus) => ({
          bus_id: bus.bus_id,
          lat: bus.latitude,
          lon: bus.longitude,
        }));

        if (isMapReady && webviewRef.current) {
          const busDataString = JSON.stringify(transformedData);
          webviewRef.current.injectJavaScript(`renderBusLocations(${busDataString}); true;`);
        }
      };

      if (isMapReady) {
        loadAndRenderBuses();
        fetchBusesInterval = setInterval(loadAndRenderBuses, FETCH_INTERVAL);
      }

      const mqttClient = mqtt.connect(
        "wss://3ef878324832459c8b966598a4c58112.s1.eu.hivemq.cloud:8884/mqtt",
        { username: "testeo", password: "123456Abc" }
      );

      mqttClient.on("connect", () => {
        console.log("✅ Conductor: Conectado a MQTT");
        mqttClient.subscribe("subapp/passenger");
      });

      mqttClient.on("message", (topic, message) => {
        try {
            const datos = JSON.parse(message.toString());
            createOrUpdateBusData(datos);
        } catch (e) {}
      });

      return () => {
        clearInterval(fetchBusesInterval);
        if (mqttClient) mqttClient.end();
      };
    }, [isMapReady])
  );

  const handleWebViewMessage = (event) => {
    if (event.nativeEvent.data === "MAP_LOADED") {
      console.log("🗺️ MAP_LOADED recibido en WebMap Conductor");
      setIsMapReady(true);
    }
  };

  if (loading || mapLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Cargando mapa...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar translucent={true} backgroundColor="transparent" barStyle="light-content" />
      
      {/* MAPA */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webviewRef}
          source={mapHtmlContent ? { html: mapHtmlContent, baseUrl: "" } : null}
          style={{ flex: 1 }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={["*"]}
        />
      </View>

      {/* OVERLAY DE RUTA ACTIVA */}
      {routeName && (
        <View style={styles.routeOverlay}>
            <Text style={styles.routeLabel}>Ruta Activa</Text>
            <Text style={styles.routeName}>{routeName}</Text>
        </View>
      )}

      {/* BOTÓN VOLVER (NATIVO, SIN USAR COMPONENTE Volver) */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={28} color="#003366" />
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#003366", 
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#ffffff",
  },
  mapContainer: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: 'white'
  },
  routeOverlay: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 51, 102, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 5
  },
  routeLabel: {
    color: '#4ADE80',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  routeName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  backButton: {
    position: 'absolute', 
    top: 50, // Ajustado para que no choque con el StatusBar
    left: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  }
});
