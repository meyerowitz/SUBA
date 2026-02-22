import React, { useRef, useEffect, useState } from "react";
import {
  Image,
  StyleSheet,
  View,
  ActivityIndicator,
  Alert,
  Text,
  Platform,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Animated,
  Dimensions,
} from "react-native";
import WebView from "react-native-webview";
import { Picker } from "@react-native-picker/picker";
import { Feather, Ionicons } from "@expo/vector-icons";
import { Asset } from "expo-asset";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../Components/Temas_y_colores/ThemeContext";
import { useRouter, useLocalSearchParams } from "expo-router";

import SearchRoot from "../../Components/SearchRoot";
import mqtt from "mqtt";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height } = Dimensions.get("window");
const BASE_URL = "https://subapp-api.onrender.com/api";
const BUSES_API_URL = `${BASE_URL}/buses`;
const FETCH_INTERVAL = 5000;
let buses = [];
let busesxd = [];

const STOP_CACHE_KEY = "guayana_bus_stops_cache_v2";
const STOP_CACHE_EXPIRY = 24 * 60 * 60 * 1000;

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

const fetchGuayanaBusStops = async () => {
  try {
    const cached = await AsyncStorage.getItem(STOP_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      const now = Date.now();
      if (now - parsed.timestamp < STOP_CACHE_EXPIRY) {
        console.log("✅ Paradas cargadas desde caché local.");
        return parsed.data;
      }
    }
  } catch (e) {
    console.warn("Error caché paradas:", e);
  }

  try {
    console.log("📥 Obteniendo paradas desde API Propia...");
    const response = await fetch(`${BASE_URL}/paradas/activas`);
    const json = await response.json();

    if (json.success && json.data) {
      const stops = json.data.map((stop) => ({
        lat: stop.location.lat,
        lon: stop.location.lng,
        name: stop.name,
        address: stop.address,
      }));

      await AsyncStorage.setItem(
        STOP_CACHE_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          data: stops,
        }),
      );

      console.log(`✅ ${stops.length} paradas obtenidas y cacheadas.`);
      return stops;
    }
  } catch (error) {
    console.error("❌ Error fetching stops from API:", error);
  }
  return [];
};

function createOrUpdateBusData(busData) {
  const exists = buses.some((bus) => bus.bus_id === busData.bus_id);
  if (exists) {
    const busIndex = buses.findIndex((bus) => bus.bus_id === busData.bus_id);
    console.log("Updating data for bus: ", buses[busIndex].bus_id);
    buses[busIndex] = busData;
  } else if (!exists) {
    console.log("New bus created: ", busData.bus_id);
    buses.push(busData);
  }
}

const fetchBusLocations = async () => {
  console.log("---> fetchBusLocation en la API()");
  try {
    const response = await fetch(BUSES_API_URL);
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error al obtener ubicaciones de buses:", error);
    return [];
  }
};

export default function WebMap() {
  const insets = useSafeAreaInsets();
  const webviewRef = useRef(null);
  const [mapHtmlUri, setMapHtmlUri] = useState(null);
  const [mapHtmlContent, setMapHtmlContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);
  const [stopsInjected, setStopsInjected] = useState(false);

  const [userLocation, setUserLocation] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedDestinationName, setSelectedDestinationName] = useState("");
  const [client, setClient] = useState(null);
  const [busLocations, setBusLocations] = useState([]);
  const { destino } = useLocalSearchParams();
  const [hasCenteredOnce, setHasCenteredOnce] = useState(false);

  const [activeRoutes, setActiveRoutes] = useState([]);
  const [allStops, setAllStops] = useState([]);
  const [selectedStop, setSelectedStop] = useState("");
  const [filteredRoutes, setFilteredRoutes] = useState([]);

  const [ShowEta, setShowEta] = useState(true);
  const [Eta, SetEta] = useState("10min");
  const [Distancia, SetDistancia] = useState("35Km");
  const [RouteName, SetRouteName] = useState("Route Name");

  const [nearestBusEta, setNearestBusEta] = useState(null);
  const [nearestBusDist, setNearestBusDist] = useState(null);
  const [calculatingBusEta, setCalculatingBusEta] = useState(false);

  const [selectedStopLocation, setSelectedStopLocation] = useState(null);
  const [selectedStopName, setSelectedStopName] = useState("");

  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [ubicacionTexto, setUbicacionTexto] = useState(
    "Obteniendo ubicación...",
  );

  const { theme, isDark } = useTheme();

  const resetSelection = () => {
    setSelectedStopLocation(null);
    setSelectedStopName("");
    setSelectedStop("");
    setSelectedDestinationName("");
    setFilteredRoutes([]);
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript("clearHighlight(); true;");
    }
  };

  const handleStopChange = (stopName) => {
    setSelectedStop(stopName);
    setSelectedDestinationName(""); // Resetear ruta al cambiar parada

    if (stopName) {
      const routes = activeRoutes.filter(
        (route) => route.stops && route.stops.some((s) => s.name === stopName),
      );
      setFilteredRoutes(routes);
    } else {
      setFilteredRoutes([]);
    }
  };

  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
  };

  useEffect(() => {
    const originLocation = selectedStopLocation || userLocation;
    if (!originLocation || busLocations.length === 0) return;

    const calculateNearestBus = async () => {
      setCalculatingBusEta(true);
      try {
        let minDistance = Infinity;
        let closestBus = null;

        busLocations.forEach((bus) => {
          const dist = getDistanceFromLatLonInKm(
            originLocation.latitude,
            originLocation.longitude,
            bus.lat,
            bus.lon,
          );
          if (dist < minDistance) {
            minDistance = dist;
            closestBus = bus;
          }
        });

        if (closestBus) {
          const url = `http://router.project-osrm.org/route/v1/driving/${closestBus.lon},${closestBus.lat};${originLocation.longitude},${originLocation.latitude}?overview=false`;
          const response = await fetch(url);
          const data = await response.json();

          if (data.routes && data.routes.length > 0) {
            const durationSec = data.routes[0].duration;
            const distanceMeters = data.routes[0].distance;
            const durationMin = Math.round(durationSec / 60);
            const distKm = (distanceMeters / 1000).toFixed(1);

            setNearestBusEta(`${durationMin} min`);
            setNearestBusDist(`${distKm} km`);
          }
        }
      } catch (error) {
        console.error("Error calculando ETA del bus más cercano:", error);
      } finally {
        setCalculatingBusEta(false);
      }
    };

    calculateNearestBus();
  }, [busLocations, userLocation, selectedStopLocation]);

  useEffect(() => {
    fetchActiveRoutes().then((mapped) => {
      if (mapped && mapped.length > 0) {
        setActiveRoutes(mapped);
        const uniqueStopsMap = new Map();
        mapped.forEach((route) => {
          if (route.stops && Array.isArray(route.stops)) {
            route.stops.forEach((stop) => {
              if (stop.name) uniqueStopsMap.set(stop.name, stop);
            });
          }
        });
        const stopsArray = Array.from(uniqueStopsMap.values()).sort((a, b) =>
          a.name.localeCompare(b.name),
        );
        setAllStops(stopsArray);
      }
    });

    const loadHTML = async () => {
      try {
        const asset = Asset.fromModule(require("../../../assets/map.html"));
        await asset.downloadAsync();
        const uri = asset.localUri || asset.uri;
        const htmlString = await FileSystem.readAsStringAsync(uri);
        setMapHtmlContent(htmlString);
      } catch (error) {
        console.error("Error cargando el mapa en APK:", error);
      } finally {
        setMapLoading(false);
      }
    };
    loadHTML();
  }, []);

  useEffect(() => {
    console.log("-----Solicitando permisos de Locacion------");
    let locationSubscription = null;
    const requestPermissionsAndGetLocation = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.log("Permiso denegado");
          setUbicacionTexto("Permiso de ubicación denegado");
          setLoading(false);
          return;
        }
        console.log("--------> Permisos de ubicacion aprobados ♿ ☑️------");
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 5000,
            distanceInterval: 2,
          },
          (location) => {
            const { latitude, longitude } = location.coords;
            setUserLocation({ latitude, longitude });
            setUbicacionTexto("Tu ubicación actual");
            setLoading(false);
          },
        );
      } catch (error) {
        console.error("Error obteniendo ubicación:", error);
        setUbicacionTexto("Error obteniendo ubicación");
        setLoading(false);
      }
    };
    requestPermissionsAndGetLocation();
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  useEffect(() => {
    console.log();
    console.log(" marcador del usuario 📍 ");
    if (userLocation && webviewRef.current && isMapReady) {
      const { latitude, longitude } = userLocation;
      const userJsCode = `updateUserMarker(${latitude}, ${longitude}); true;`;
      webviewRef.current.injectJavaScript(userJsCode);
    }
    if (userLocation !== null) {
      console.log(" ----> Ubicacion actualizada ");
      console.log(
        "      latitud: ",
        userLocation.latitude,
        " longitud: ",
        userLocation.longitude,
      );
      console.log("");
    }
  }, [userLocation, isMapReady]);

  useEffect(() => {
    console.log();
    console.log(" marcador de las paradas de buses 📍 ");
    console.log();
    if (isMapReady && webviewRef.current && !stopsInjected) {
      fetchGuayanaBusStops()
        .then((stops) => {
          if (stops && stops.length > 0) {
            const dataString = JSON.stringify(stops);
            const stopsJsCode = `renderBusStops(${dataString}); true;`;
            webviewRef.current.injectJavaScript(stopsJsCode);
            setStopsInjected(true);
          }
        })
        .catch((error) => console.error("Error al inyectar paradas:", error));
    }
  }, [isMapReady, stopsInjected]);

  useEffect(() => {
    let fetchBusesInterval;
    console.log();
    console.log(" marcador de los BUSES 📍 ");
    console.log();
    const loadAndRenderBuses = async () => {
      const transformedData = buses.map((bus) => ({
        bus_id: bus.bus_id,
        lat: bus.latitude,
        lon: bus.longitude,
      }));

      setBusLocations(transformedData);
      if (isMapReady && webviewRef.current) {
        if (isMapReady === true) {
          console.log("isMapReady: true ");
        }
        const busDataString = JSON.stringify(transformedData);
        const busJsCode = `renderBusLocations(${busDataString}); true;`;
        webviewRef.current.injectJavaScript(busJsCode);
        console.log(
          `Ubicaciones de ${transformedData.length} buses inyectadas.`,
        );
      }
    };

    loadAndRenderBuses();
    fetchBusesInterval = setInterval(loadAndRenderBuses, FETCH_INTERVAL);

    return () => {
      clearInterval(fetchBusesInterval);
      console.log("Intervalo de carga de buses detenido.");
    };
  }, [isMapReady]);

  useEffect(() => {
    console.log("conectando al broker");
    const mqttClient = mqtt.connect(
      "wss://3ef878324832459c8b966598a4c58112.s1.eu.hivemq.cloud:8884/mqtt",
      {
        username: "testeo",
        password: "123456Abc",
      },
    );

    mqttClient.on("connect", () => {
      console.log("✅ Conectado al broker MQTT");
      mqttClient.subscribe("subapp/passenger");
    });
    mqttClient.on("error", (err) => {
      console.error("Error MQTT:", err);
    });
    mqttClient.on("message", (topic, message) => {
      const datos = JSON.parse(message.toString());
      console.log(` Mensaje recibido en ${topic}:`, datos._id);
      createOrUpdateBusData(datos);
    });
    setClient(mqttClient);
    return () => {
      if (mqttClient) mqttClient.end();
      console.log("mqtt client destroyed");
    };
  }, []);

  useEffect(() => {
    console.log("HasCenteredOnce:" + hasCenteredOnce);
    if (isMapReady && userLocation && !hasCenteredOnce) {
      MoveToUser();
      setHasCenteredOnce(true);
      console.log("✅ Cámara centrada inicialmente en el usuario");
    }
  }, [isMapReady]);

  useEffect(() => {
    if (destino) {
      console.log("📍 Destino recibido por URL/Params:", destino);
      setSelectedDestinationName(destino);
      handleSearch();
    }
  }, [destino, isMapReady, userLocation]);

  const handleWebViewMessage = (event) => {
    const message = event.nativeEvent.data;
    if (message === "MAP_LOADED") {
      setIsMapReady(true);
      setStopsInjected(false);
    }
    try {
      const data = JSON.parse(message);

      if (data.type === "STOP_SELECTED") {
        console.log("Parada seleccionada:", data.name);
        setSelectedStopLocation({ latitude: data.lat, longitude: data.lon });
        setSelectedStopName(data.name || "Parada seleccionada");
      }

      if (data.type === "ROUTE_INFO") {
        SetEta(`${data.duration} min`);
        SetDistancia(`${data.distance} Km`);
        SetRouteName(data.name);
        setRouteDetails(data);
      }

      if (data.type === "SEARCH_UPDATED") {
        console.log("Búsqueda actualizada en el mapa:", data.address);
      }
    } catch (e) {
      console.log("Mensaje de texto recibido:", message);
    }
  };

  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (!ShowEta) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [ShowEta]);

  const handleSearch = () => {
    // VALIDACIÓN: Debe haber seleccionado parada y ruta
    if (!selectedStop) {
      Alert.alert(
        "Selecciona una parada",
        "Primero debes seleccionar una parada de origen.",
      );
      return;
    }

    if (!selectedDestinationName) {
      Alert.alert("Selecciona una ruta", "Debes seleccionar una ruta destino.");
      return;
    }

    if (!isMapReady || !webviewRef.current || !userLocation) {
      if (!userLocation) {
        console.log("No se ha podido obtener tu ubicación actual.");
      }
      return;
    }

    setIsSearching(true);
    setIsSearchExpanded(false);

    try {
      console.log(
        `Buscando: Parada ${selectedStop} → Ruta ${selectedDestinationName}`,
      );

      const destination = activeRoutes.find(
        (dest) => dest.name === selectedDestinationName,
      );

      if (destination) {
        if (destination.geometry) {
          console.log("🎨 Pintando ruta pre-calculada del backend...");
          const geoJsonString = JSON.stringify(destination.geometry);
          const jsCode = `drawRouteFromGeoJSON(${geoJsonString}); true;`;
          webviewRef.current.injectJavaScript(jsCode);
          setShowEta(false);
        } else {
          const userLat = userLocation.latitude;
          const userLon = userLocation.longitude;
          const destLat = destination.lat;
          const destLon = destination.lon;

          const routeJsCode = `
                    drawRouteAndAnimate(
                        ${userLat},
                        ${userLon},
                        ${destLat},
                        ${destLon}
                    );
                    true;
                `;
          webviewRef.current.injectJavaScript(routeJsCode);
          console.log(
            `Solicitud de ruteo cliente inyectada: (${userLat},${userLon}) a (${destLat},${destLon})`,
          );
          setShowEta(false);
        }
      } else {
        Alert.alert("Error", "El destino seleccionado no fue encontrado.");
      }
    } catch (error) {
      console.error("Error al ejecutar la búsqueda:", error);
      Alert.alert("Error", "Ocurrió un error interno al buscar la ubicación.");
    } finally {
      setIsSearching(false);
    }
  };

  const MoveToUser = () => {
    console.log("📷--> MoveToUser ");
    if (userLocation && webviewRef.current && isMapReady) {
      const { latitude, longitude } = userLocation;
      const userJsCode = `moveTo(${latitude}, ${longitude}); true;`;
      webviewRef.current.injectJavaScript(userJsCode);
      console.log(
        "📷--> desplazamos la camara lat:" + latitude + " lon: " + longitude,
      );
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mapHtmlContent) {
        Alert.alert("Error", "El mapa está tardando demasiado en cargar.");
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [mapHtmlContent]);

  if (loading || mapLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#d92b74" />
        <Text style={styles.loadingText}>
          {mapLoading ? "Cargando mapa..." : "Buscando tu ubicación..."}
        </Text>
      </View>
    );
  }

  // Texto del buscador compacto
  const getSearchDisplayText = () => {
    if (selectedStop && selectedDestinationName) {
      return `🚌 ${selectedStop} → ${selectedDestinationName}`;
    } else if (selectedStop) {
      return `📍 ${selectedStop}`;
    }
    return "¿A dónde vamos?";
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar
        translucent={true}
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <View
        style={{
          flex: 1,
          borderTopEndRadius: 32,
          borderTopLeftRadius: 32,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 5,
          elevation: 8,
        }}
      >
        <WebView
          ref={webviewRef}
          source={mapHtmlContent ? { html: mapHtmlContent, baseUrl: "" } : null}
          style={{ flex: 1 }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scrollEnabled={false}
          originWhitelist={["*"]}
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
        />
      </View>

      {/* BUSCADOR EXPANDIBLE - CENTRADO Y CON MENOS PADDING */}
      {!isSearchExpanded ? (
        <TouchableOpacity
          style={styles.searchBarCompact}
          activeOpacity={0.9}
          onPress={() => setIsSearchExpanded(true)}
        >
          <Text
            style={[
              styles.searchPlaceholder,
              (selectedStop || selectedDestinationName) && {
                color: "#003366",
                fontWeight: "bold",
              },
            ]}
          >
            {getSearchDisplayText()}
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

          {/* PASO 1: SELECCIONAR PARADA (OBLIGATORIO) */}
          <View style={styles.inputRow}>
            <Ionicons name="location" size={20} color="#007bff" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.inputLabel}>Parada de origen</Text>
              <Picker
                selectedValue={selectedStop}
                onValueChange={handleStopChange}
                mode="dropdown"
                style={{ height: 40, width: "100%", marginTop: -5 }}
              >
                <Picker.Item
                  label="Selecciona una parada..."
                  value=""
                  color="#999"
                />
                {allStops.map((stop, index) => (
                  <Picker.Item
                    key={`${stop.name}-${index}`}
                    label={stop.name}
                    value={stop.name}
                  />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.verticalLine} />

          {/* PASO 2: SELECCIONAR RUTA (DESHABILITADO HASTA TENER PARADA) */}
          <View
            style={[styles.inputRow, !selectedStop && styles.disabledInput]}
          >
            <Ionicons
              name="bus"
              size={20}
              color={selectedStop ? "#E69500" : "#ccc"}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text
                style={[styles.inputLabel, !selectedStop && { color: "#999" }]}
              >
                Ruta destino{" "}
                {selectedStop ? "*" : "(Selecciona parada primero)"}
              </Text>
              {selectedStop ? (
                <Picker
                  selectedValue={selectedDestinationName}
                  onValueChange={(v) => setSelectedDestinationName(v)}
                  style={{ height: 40, width: "100%", marginTop: -5 }}
                >
                  <Picker.Item
                    label="Selecciona ruta..."
                    value=""
                    color="#999"
                  />
                  {filteredRoutes.map((d) => (
                    <Picker.Item key={d.name} label={d.name} value={d.name} />
                  ))}
                </Picker>
              ) : (
                <View style={styles.disabledPicker}>
                  <Text style={{ color: "#999", paddingVertical: 10 }}>
                    -- Selecciona una parada primero --
                  </Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.searchBtnLarge,
              (!selectedStop || !selectedDestinationName) &&
                styles.disabledButton,
            ]}
            onPress={handleSearch}
            disabled={isSearching || !selectedStop || !selectedDestinationName}
          >
            {isSearching ? (
              <ActivityIndicator color="#003366" />
            ) : (
              <Text style={styles.searchBtnText}>
                {!selectedStop
                  ? "Selecciona parada"
                  : !selectedDestinationName
                    ? "Selecciona ruta"
                    : "Buscar Ruta"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* CARD FLOTANTE: ETA DEL BUS MÁS CERCANO */}
      {ShowEta && nearestBusEta && !isSearchExpanded && (
        <View
          style={{
            backgroundColor: "#ffffff",
            width: "90%",
            position: "absolute",
            bottom: 30,
            alignSelf: "center",
            borderRadius: 15,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 5,
            elevation: 10,
            padding: 15,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontWeight: "bold",
                color: "#333",
                fontSize: 16,
                marginBottom: 4,
              }}
            >
              {selectedStopLocation
                ? "Bus más cercano a la parada"
                : "Bus más cercano a ti"}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ marginRight: 15 }}>
                <Text style={{ color: "#666", fontSize: 12 }}>
                  Tiempo estimado
                </Text>
                <Text
                  style={{ fontWeight: "bold", fontSize: 20, color: "#007bff" }}
                >
                  {calculatingBusEta ? "..." : nearestBusEta}
                </Text>
              </View>
              <View>
                <Text style={{ color: "#666", fontSize: 12 }}>Distancia</Text>
                <Text
                  style={{ fontWeight: "bold", fontSize: 20, color: "#007bff" }}
                >
                  {calculatingBusEta ? "..." : nearestBusDist}
                </Text>
              </View>
            </View>
          </View>

          <Image
            source={require("../../../assets/img/autobus.png")}
            style={{ height: 60, width: 60, resizeMode: "contain" }}
          />
        </View>
      )}

      {/* BOTÓN/BANNER PARA CANCELAR SELECCIÓN DE PARADA */}
      {selectedStopLocation && !isSearchExpanded && (
        <View
          style={{
            position: "absolute",
            top: insets.top + 120,
            left: 20,
            right: 20,
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            padding: 10,
            borderRadius: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            shadowColor: "#000",
            elevation: 5,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, color: "#666" }}>
              BUSCANDO CERCA DE:
            </Text>
            <Text
              style={{ fontWeight: "bold", color: "#333" }}
              numberOfLines={1}
            >
              {selectedStopName}
            </Text>
          </View>
          <TouchableOpacity
            onPress={resetSelection}
            style={{
              backgroundColor: "#ff4444",
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 8,
              marginLeft: 10,
            }}
          >
            <Text style={{ color: "white", fontWeight: "bold", fontSize: 12 }}>
              Volver a mí
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* PANEL DE RUTA (ETA) */}
      {!ShowEta && (
        <Animated.View
          style={{
            backgroundColor: "#f4f4f4ff",
            height: "35%",
            width: "95%",
            position: "absolute",
            bottom: "-1%",
            left: "4%",
            borderRadius: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 5,
            elevation: 55,
            padding: "5%",
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Text style={{ fontWeight: "bold", color: "gray", marginBottom: 20 }}>
            {RouteName}
          </Text>
          <View
            style={{
              borderBottomColor: "gray",
              borderBottomWidth: 1,
              width: "100%",
            }}
          />
          <View style={{ width: "90%", flexDirection: "row" }}>
            <View style={{ marginRight: 10, marginTop: 20 }}>
              <Text style={{ fontWeight: "bold", color: "gray" }}>
                Travel time
              </Text>
              <Text style={{ fontWeight: "bold", fontSize: 25 }}>{Eta}</Text>
            </View>
            <View style={{ marginTop: 20 }}>
              <Text style={{ fontWeight: "bold", color: "gray" }}>
                Distancia
              </Text>
              <Text style={{ fontWeight: "bold", fontSize: 25 }}>
                {Distancia}
              </Text>
            </View>
          </View>
          <Image
            source={require("../../../assets/img/autobus3.png")}
            style={{
              height: 140,
              width: 300,
              position: "absolute",
              top: 40,
              left: 160,
            }}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101314",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#026b9c",
  },

  // ESTILOS DEL BUSCADOR - CENTRADO Y COMPACTO
  searchBarCompact: {
    position: "absolute",
    top: 60, // Reducido de insets.top + 60 a solo 10px desde arriba
    left: 20,
    right: 20,
    backgroundColor: "white",
    borderRadius: 25,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 20,
    paddingRight: 5,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    zIndex: 100,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  searchIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#003366",
    justifyContent: "center",
    alignItems: "center",
  },
  searchPanelExpanded: {
    position: "absolute",
    top: 50, // Reducido para estar más arriba
    left: 20,
    right: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    elevation: 15,
    zIndex: 100,
    maxHeight: 400,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    alignItems: "center",
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#003366",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
    minHeight: 60,
  },
  inputLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
    fontWeight: "600",
  },
  locationText: {
    marginLeft: 10,
    color: "#555",
    fontSize: 14,
    flex: 1,
  },
  verticalLine: {
    width: 1,
    height: 30,
    backgroundColor: "#ddd",
    marginLeft: 9,
    marginVertical: 5,
  },
  disabledInput: {
    opacity: 0.6,
  },
  disabledPicker: {
    height: 40,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  searchBtnLarge: {
    marginTop: 15,
    backgroundColor: "#E69500",
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  searchBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
