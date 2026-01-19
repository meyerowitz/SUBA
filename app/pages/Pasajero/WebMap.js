import React, { useRef, useEffect, useState } from "react";
import { Image, StyleSheet,View,ActivityIndicator,Alert,Text,Platform,TextInput,TouchableOpacity, StatusBar,Animated, Dimensions} from "react-native";
import WebView from "react-native-webview";
import { Picker } from "@react-native-picker/picker";
import { Feather } from "@expo/vector-icons";
import { Asset } from "expo-asset";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system/legacy";

import { useRouter, useLocalSearchParams } from 'expo-router';

import SearchRoot from "../../Components/SearchRoot";
import Destinos from "../../Components/Destinos.json";
import mqtt from "mqtt";
import Volver from '../../Components/Botones_genericos/Volver';


const { height } = Dimensions.get('window');
// --- CONSTANTES DE LA API DEL BUS ---
const BASE_URL = "https://api-bus-w29v.onrender.com/api/v1";
const BUSES_API_URL = `${BASE_URL}/buses`; // GET para obtener todas las ubicaciones
const FETCH_INTERVAL = 5000; // Cargar buses cada 5 segundos (500ms)
// BBOX estático para Ciudad Guayana: [LatSur, LonOeste, LatNorte, LonEste]
const GUAYANA_BBOX = "8.21,-62.88,8.39,-62.60";
let buses = []
let busesxd = []

// -------------------------------------------------------------
// 2) .FUNCIÓN DE CONSULTA A OVERPASS
// -------------------------------------------------------------
const OVERPASS_SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
];

const fetchGuayanaBusStops = async (retry = 0) => {
  const MAX_RETRIES = 5;
  const DELAY_MS = 2000 * (retry + 1); 

  // Selección de servidor Round-Robin basado en el número de intento
  const serverUrl = OVERPASS_SERVERS[retry % OVERPASS_SERVERS.length];

  console.log("");
  console.log(`---> fetchGuayanaBusStops (Intento ${retry + 1}/${MAX_RETRIES + 1})`);
  console.log(`--->       Servidor: ${serverUrl}`);
  console.log("");

  // Reducimos timeout del query a 25s para fallar rápido y cambiar de servidor si está colgado
  const overpassQuery = `
        [out:json][timeout:25];
        node[highway=bus_stop](${GUAYANA_BBOX});
        out center;
    `;
  const encodedQuery = encodeURIComponent(overpassQuery);
  const url = `${serverUrl}?data=${encodedQuery}`;

  try {
    const response = await fetch(url);
    if (response.ok) {
      console.log(`Paradas obtenidas exitosamente.`);
      return await response.json();
    }

    // Manejo de errores: 429 (Too Many Requests) y 5xx (Server Errors: 504, 502, 503)
    if ((response.status === 429 || response.status >= 500) && retry < MAX_RETRIES) {
      console.warn(
        `Error HTTP ${response.status}. Cambiando servidor/reintentando en ${DELAY_MS / 1000}s...`,
      );
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      return fetchGuayanaBusStops(retry + 1); 
    }

    throw new Error(`Error HTTP: ${response.status}`);
  } catch (error) {
    console.error("Error al obtener paradas de Overpass:", error);
    
    // Si es un error de red (fetch falló) y quedan intentos, reintentamos
    if (retry < MAX_RETRIES) {
       console.warn(`Error de conexión. Reintentando en ${DELAY_MS / 1000}s...`);
       await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
       return fetchGuayanaBusStops(retry + 1);
    }

    return null;
  }
};


//Cambiar bus_id por _id
function createOrUpdateBusData(busData){
    const exists = buses.some(bus=> bus.bus_id=== busData.bus_id);
    if (exists){
       const busIndex = buses.findIndex(bus => bus.bus_id === busData.bus_id);
       console.log("Updating data for bus: ", buses[busIndex].bus_id)
       buses[busIndex]=busData;
    }
    else if(!exists){
        console.log("New bus created: ", busData.bus_id)
        buses.push(busData);
    }
}

//--------------------------------------------------------
// ---3) .FUNCIÓN DE CONSULTA A LA API RET / BUSES ---
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
  //---------------Hooks------------------------------
  const webviewRef = useRef(null); //---cluster del mapa
  const [mapHtmlUri, setMapHtmlUri] = useState(null); //---url y datos del mapa del tiempo real
  const [mapHtmlContent, setMapHtmlContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(true);
  // Nuevo estado para rastrear si el mapa y las paradas están listos.
  const [isMapReady, setIsMapReady] = useState(false); //espera al flag MAP_LOADED para volverse true y luego false
  const [stopsInjected, setStopsInjected] = useState(false); // es para verificar cuando la inyeccion js a sido exitosa

  const [userLocation, setUserLocation] = useState(null); //--ubicacion del usuario en tiempo real

  //const [searchQuery, setSearchQuery] = useState('')//----Query de busquedas
  //const [searchResult, setSearchResult] = useState(null);//----Resultados de la busqueda
  const [isSearching, setIsSearching] = useState(false); //---Stado de la busqueda

  const [selectedDestinationName, setSelectedDestinationName] = useState("");
  const [client, setClient] = useState(null);
  // NUEVO ESTADO para las ubicaciones de los buses
  const [busLocations, setBusLocations] = useState([]);
  const { destino } = useLocalSearchParams();
  const [hasCenteredOnce, setHasCenteredOnce] = useState(false);

  const [ShowEta, setShowEta]= useState(true);
//-----------Todo lo relacionado al Eta--------
  const [Eta, SetEta]= useState("10min");
  const [Distancia, SetDistancia]= useState("35Km");
  const [RouteName, SetRouteName]= useState("Route Name");
  const [routeDetails, setRouteDetails] = useState(null);
  //--------------------------------------------------

  // --- NUEVOS ESTADOS PARA ETA BUS -> USUARIO ---
  const [nearestBusEta, setNearestBusEta] = useState(null);       // e.g. "5 min"
  const [nearestBusDist, setNearestBusDist] = useState(null);     // e.g. "1.2 km"
  const [calculatingBusEta, setCalculatingBusEta] = useState(false);
  
  // ESTADO PARA LA PARADA FIJA (EJEMPLO)
  const [selectedStopLocation, setSelectedStopLocation] = useState(null);
  const [selectedStopName, setSelectedStopName] = useState("");

  // FUNCIÓN: Limpiar selección de parada
  const resetSelection = () => {
    setSelectedStopLocation(null);
    setSelectedStopName("");
    // Limpiar indicador en el mapa
    if (webviewRef.current) {
        webviewRef.current.injectJavaScript("clearHighlight(); true;");
    }
  };



  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radio de la tierra en km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
  };

  // --- EFECTO: Calcular Bus Más Cercano y su ETA ---
  useEffect(() => {
    // Definir el punto de referencia: Parada Seleccionada O Ubicación del Usuario
    const originLocation = selectedStopLocation || userLocation;

    // Solo calculamos si tenemos un punto de origen y buses
    if (!originLocation || busLocations.length === 0) return;

    const calculateNearestBus = async () => {
      setCalculatingBusEta(true);
      try {
        let minDistance = Infinity;
        let closestBus = null;

        // 1. Encontrar el bus más cercano en línea recta desde el ORIGEN (Usuario o Parada)
        busLocations.forEach((bus) => {
          const dist = getDistanceFromLatLonInKm(
            originLocation.latitude,
            originLocation.longitude,
            bus.lat,
            bus.lon
          );
          if (dist < minDistance) {
            minDistance = dist;
            closestBus = bus;
          }
        });

        if (closestBus) {
          // 2. Obtener ETA real por calle usando OSRM
          // OSRM url: http://router.project-osrm.org/route/v1/driving/lon1,lat1;lon2,lat2
          const url = `http://router.project-osrm.org/route/v1/driving/${closestBus.lon},${closestBus.lat};${originLocation.longitude},${originLocation.latitude}?overview=false`;
          
          const response = await fetch(url);
          const data = await response.json();

          if (data.routes && data.routes.length > 0) {
            const durationSec = data.routes[0].duration; // segundos
            const distanceMeters = data.routes[0].distance; // metros

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

    // Throttle simple: Ejecutar cada 10 segundos aprox o cuando cambien drásticamente
    // Para simplificar, lo ejecutamos cuando busLocations cambie, pero podrías poner un debounce.
    // Dado que busLocations se actualiza cada 5s, está bien.
    calculateNearestBus();

  }, [busLocations, userLocation, selectedStopLocation]);
  // ------------------------------------------------


  //----------- 1) .UseEffet loadhtmlUri-----------------------
  useEffect(() => {
    //loadMapHtml().then(setMapHtmlUri);
    const loadHTML = async () => {
      try {
        const asset = Asset.fromModule(require("../../../assets/map.html"));
        await asset.downloadAsync();

        // En producción, usamos localUri para leer el archivo físico
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
  // --- 2) .Lógica de Expo Location  ✅ ---
  useEffect(() => {
    console.log("-----Solicitando permisos de Locacion------");
    let locationSubscription = null;
    const requestPermissionsAndGetLocation = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          //Alert.alert(
            //"Permiso denegado",
           // "Necesitamos permiso para acceder a la ubicación y mostrar la posición en el mapa.",
          //);
          console.log("Permiso denegado")
          setLoading(false);
          return;
        }
        console.log("--------> Permisos de ubicacion aprobados ♿ ☑️------");
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 5000, // Actualiza cada 5 segundos
            distanceInterval: 2, // Actualiza cada 10 metros
          },
          (location) => {
            const { latitude, longitude } = location.coords;
            setUserLocation({ latitude, longitude });
            setLoading(false);
          },
        );
      } catch (error) {
        console.error("Error obteniendo ubicación:", error);
        setLoading(false);
      }
    };
    requestPermissionsAndGetLocation();
    // Limpieza: detener la suscripción cuando el componente se desmonte
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);
  //----------------- 3) .UseEffect para actualizar el marcador del usuario ✅ --------------------
  useEffect(() => {
    console.log();
    console.log(" marcador del usuario 📍 ");
    if (userLocation && webviewRef.current && isMapReady) {
      const { latitude, longitude } = userLocation;
      // Llama a la función updateUserMarker
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

    // Depende SOLAMENTE de userLocation para el tiempo real.
  }, [userLocation, isMapReady]);
  //-------------- 4) .UseEffect para cargar las paradas dentro de un pequeño BBOX------
  useEffect(() => {
    console.log()
    console.log(' marcador de las paradas de buses 📍 ')
    console.log()
    if (isMapReady && webviewRef.current && !stopsInjected) {
        fetchGuayanaBusStops()
            .then(overpassData => {
                if (overpassData && overpassData.elements) {
                    // Filtrar y aligerar los datos antes de enviarlos al Bridge
                    const simpleStops = overpassData.elements
                        .filter(el => el.type === 'node')
                        .map(el => ({
                            lat: el.lat,
                            lon: el.lon,
                            name: (el.tags && el.tags.name) ? el.tags.name : 'Parada'
                        }));

                    const dataString = JSON.stringify(simpleStops);

                    // Inyectar JavaScript en el WebView
                    const stopsJsCode = `renderBusStops(${dataString}); true;`;
                    webviewRef.current.injectJavaScript(stopsJsCode);

                    setStopsInjected(true); // Marca la inyección como exitosa
                }
            })
            .catch(error => console.error("Error al inyectar paradas:", error));
    }
// Depende de isMapReady (espera a que el WebView termine de cargar el mapa) y stopsInjected.
}, [isMapReady, stopsInjected]);

  //----------------- IGNORAR ESTE) .UseEffect para cargar y renderizar la ubicación de los buses 🚌 --------------------
  useEffect(() => {
    let fetchBusesInterval;
    console.log();
    console.log(" marcador de los BUSES 📍 ");
    console.log();
    const loadAndRenderBuses = async () => {

      const transformedData = buses.map((bus) => ({
        bus_id: bus.bus_id,
        //route: bus.route || "Desconocida",
        //velocity:
          //bus.speed!== undefined ? bus.last_speed.toFixed(1) : "N/A",
        // Coordenadas GeoJSON [lon, lat] -> Invertir a [lat, lon] para JS
        lat: bus.latitude,
        lon: bus.longitude,
      }));

      setBusLocations(transformedData);
      // 2. Inyectar JavaScript en el WebView SOLO si el mapa está listo
      if (isMapReady && webviewRef.current) {
        //console.log("inyectando los buses en el mapa: ", transformedData);
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

  //----------------- 5) .UseEffect para cargar y renderizar la ubicación de los buses 🚌 usando websockets --------------------
  
  useEffect(() => {
  console.log("conectando al broker")
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
    mqttClient.on("message",(topic,message)=>{
      const datos = JSON.parse(message.toString());
      console.log(` Mensaje recibido en ${topic}:`, datos._id);
      createOrUpdateBusData(datos)
    })
    setClient(mqttClient)
    return () => {
      if (mqttClient) mqttClient.end();
      console.log("mqtt client destroyed")
    };
  }, []);
  //----------------- 6) .UseEffect para mover la ubicacion de la camara a la del usuario --------------------
  useEffect(()=>{
    console.log('HasCenteredOnce:'+hasCenteredOnce)
    if (isMapReady && userLocation && !hasCenteredOnce) {
      MoveToUser();
      setHasCenteredOnce(true); // Bloqueamos futuras ejecuciones automáticas
      console.log("✅ Cámara centrada inicialmente en el usuario");
    }
  },[isMapReady]);

useEffect(() => {
  if (destino) {
    console.log("📍 Destino recibido por URL/Params:", destino);
    setSelectedDestinationName(destino);
    handleSearch()
  }
}, [destino,isMapReady, userLocation]);

  // 1. Manejador de Mensajes (No cambiar)
  const handleWebViewMessage = (event) => {
    const message = event.nativeEvent.data;
    if (message === "MAP_LOADED") {
      setIsMapReady(true); // El mapa está listo
      setStopsInjected(false); // <--- AÑADE ESTO
      // Si el mapa se recarga, debemos volver a inyectar las paradas.
    }
    // Caso 2: Intentar parsear como JSON (para la info de la ruta)
    try {
      const data = JSON.parse(message);

      if (data.type === 'STOP_SELECTED') {
         console.log("Parada seleccionada:", data.name);
         setSelectedStopLocation({ latitude: data.lat, longitude: data.lon });
         setSelectedStopName(data.name || "Parada seleccionada");
      }

      if (data.type === 'ROUTE_INFO') {
        // Actualizamos tus estados existentes
        SetEta(`${data.duration} min`);
        SetDistancia(`${data.distance} Km`);
        SetRouteName(data.name);
        
        // También puedes guardar el objeto completo si lo necesitas
        setRouteDetails(data);
      }
      
      if (data.type === 'SEARCH_UPDATED') {
          console.log("Búsqueda actualizada en el mapa:", data.address);
      }
    } catch (e) {
      // Si no es JSON ni MAP_LOADED, simplemente lo ignoramos o lo logueamos
      console.log("Mensaje de texto recibido:", message);
    }
  };
const slideAnim = useRef(new Animated.Value(height)).current;

useEffect(() => {
  if (!ShowEta) {
    // Cuando ShowEta es falso (quieres mostrarlo), sube
    Animated.spring(slideAnim, {
      toValue: 0, // Posición final (la que definiste en tus estilos)
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  } else {
    // Cuando quieres ocultarlo, vuelve a bajar
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }
}, [ShowEta]);

  // --- 2. MANEJADOR DE BÚSQUEDA Y RUTEO ---
  const handleSearch = () => {
    // 1. Validar pre-requisitos
    if (
      !selectedDestinationName ||
      !isMapReady ||
      !webviewRef.current ||
      !userLocation
    ) {
      // Alerta si falta la ubicación del usuario
      if (!userLocation) {
        //Alert.alert("Error", "No se ha podido obtener tu ubicación actual.");
        console.log("No se ha podido obtener tu ubicación actual.")
      }
      return;
    }

    setIsSearching(true);

    try {
      console.log(`Buscando destino seleccionado: ${selectedDestinationName}`);

      // 2. Buscar destino
      const destination = Destinos.find(
        (dest) => dest.name === selectedDestinationName,
      );

      if (destination) {
        const userLat = userLocation.latitude;
        const userLon = userLocation.longitude;
        const destLat = destination.lat;
        const destLon = destination.lon;

        // 3. Crear código JS para dibujar la ruta y animar la vista
        // Se asume la existencia de una función 'drawRouteAndAnimate' en tu map.html
        const routeJsCode = `
                drawRouteAndAnimate(
                    ${userLat},
                    ${userLon},
                    ${destLat},
                    ${destLon}
                );
                true;
            `;

        // 4. Inyectar el código
        webviewRef.current.injectJavaScript(routeJsCode);
        console.log(
          `Solicitud de ruteo y animación inyectada: (${userLat},${userLon}) a (${destLat},${destLon})`,
        );
        setShowEta(false);

      } else {
        Alert.alert("Error", "El destino seleccionado no fue encontrado.");
      }
    } catch (error) {
      console.error("Error al ejecutar la búsqueda:", error);
      Alert.alert("Error", "Ocurrió un error interno al buscar la ubicación.");
    } finally {
      // En este caso, setIsSearching debería ser false solo después de que el mapa
      // responda que terminó el ruteo, pero lo dejamos aquí como fallback rápido.
      // Lo ideal sería manejar la finalización desde el WebView.
      setIsSearching(false);
    }
  };

  //----- 3. MOVER CAMARA A LA POSICION DEL USUARIO----
  const MoveToUser = () =>{
    console.log("📷--> MoveToUser ");
      if (userLocation && webviewRef.current && isMapReady) {
      
      const { latitude, longitude } = userLocation;
      const userJsCode = `moveTo(${latitude}, ${longitude}); true;`;
      webviewRef.current.injectJavaScript(userJsCode);
       console.log("📷--> desplazamos la camara lat:"+latitude+" lon: "+longitude);
    }

  }
  // en el caso de que maphtmlUri se encuentre vacio se graficara una pantalla de carga
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mapHtmlContent) {
        Alert.alert("Error", "El mapa está tardando demasiado en cargar.");
      }
    }, 10000); // 10 segundos
    return () => clearTimeout(timer);
  }, [mapHtmlContent]);


  // --- Renderizado ---

  if (loading || mapLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#ffffffff" />
        <Text style={styles.loadingText}>{mapLoading ? "Cargando mapa..." : "Buscando tu ubicación..."}</Text>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <StatusBar translucent={true} backgroundColor="transparent" barStyle="ligth-content"></StatusBar>
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
      
      {/* CARD FLOTANTE: ETA DEL BUS MÁS CERCANO (Solo si no hay ruta activa) */}
      {ShowEta && nearestBusEta && (
         <View
         style={{
           backgroundColor: "#ffffff",
           width: "90%",
           position: "absolute",
           bottom: 30, // Un poco separado del borde
           alignSelf: "center", // Centrado horizontalmente
           borderRadius: 15,
           shadowColor: "#000",
           shadowOffset: { width: 0, height: 4 },
           shadowOpacity: 0.2,
           shadowRadius: 5,
           elevation: 10,
           padding: 15,
           flexDirection: 'row',
           alignItems: 'center',
           justifyContent: 'space-between'
         }}
       >
         <View style={{flex: 1}}>
           <Text style={{fontWeight:'bold', color:'#333', fontSize: 16, marginBottom: 4}}>
             {selectedStopLocation ? "Bus más cercano a la parada" : "Bus más cercano a ti"}
           </Text>
           <View style={{flexDirection: 'row', alignItems: 'center'}}>
             <View style={{marginRight: 15}}>
               <Text style={{color:'#666', fontSize: 12}}>Tiempo estimado</Text>
               <Text style={{fontWeight:'bold', fontSize: 20, color: '#007bff'}}>
                 {calculatingBusEta ? "..." : nearestBusEta}
               </Text>
             </View>
             <View>
               <Text style={{color:'#666', fontSize: 12}}>Distancia</Text>
               <Text style={{fontWeight:'bold', fontSize: 20, color: '#007bff'}}>
                 {calculatingBusEta ? "..." : nearestBusDist}
               </Text>
             </View>
           </View>
         </View>
         
         <Image 
           source={require("../../../assets/img/autobus.png")} 
           style={{height: 60, width: 60, resizeMode: 'contain'}}
         />
       </View>
      )}

      {/* BOTÓN/BANNER PARA CANCELAR SELECCIÓN DE PARADA */}
      {selectedStopLocation && (
        <View style={{
            position: "absolute",
            top: 100, // Debajo del buscador
            left: 20,
            right: 20,
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            padding: 10,
            borderRadius: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            shadowColor: "#000",
            elevation: 5
        }}>
            <View style={{flex: 1}}>
                <Text style={{fontSize: 10, color: "#666"}}>BUSCANDO CERCA DE:</Text>
                <Text style={{fontWeight: "bold", color: "#333"}} numberOfLines={1}>
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
                    marginLeft: 10
                }}
            >
                <Text style={{color: "white", fontWeight: "bold", fontSize: 12}}>Volver a mí</Text>
            </TouchableOpacity>
        </View>
      )}


      {ShowEta? (<></>):(
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
          transform: [{ translateY: slideAnim }]
        }}
      >
        <Text style={{fontWeight:'bold',color:'gray', marginBottom:20}}>{RouteName}</Text>
        <View style={{borderBottomColor:'gray', borderBottomWidth:1, width:'100%'}}></View>
          <View style={{ width:'90%', flexDirection:'row'}}>
            <View style={{marginRight:10, marginTop:20}}>
              <Text style={{fontWeight:'bold',color:'gray'}}>Travel time</Text>
              <Text style={{fontWeight:'bold',fontSize:25}}>{Eta}</Text>
            </View>
            <View style={{ marginTop:20}}>
              <Text style={{fontWeight:'bold',color:'gray'}}>Distancia</Text>
              <Text style={{fontWeight:'bold', fontSize:25}}>{Distancia}</Text>
            </View>
            
          </View>
          <Image source={require("../../../assets/img/autobus3.png")} style={{height:140, width:300, position:'absolute', top:40, left:160}}/>
          <TouchableOpacity></TouchableOpacity>
      </Animated.View>
      )}
      
        <View
          style={{
            flexDirection: "row",
            position:'absolute',
            padding: 5,
            backgroundColor: "#fff",
            borderRadius: 15,
            elevation: 2,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            top:45,
            left:30
          }}
        >
          <Picker
            selectedValue={selectedDestinationName}
            onValueChange={(itemValue) => setSelectedDestinationName(itemValue)}
            style={{ height: 50, width: "80%" }}
            enabled={!isSearching}
          >
            <Picker.Item
              label="Selecciona un destino..."
              value=""
              enabled={false}
            />
            {Destinos.map((dest) => (
              <Picker.Item
                key={dest.name}
                label={dest.name}
                value={dest.name}
              />
            ))}
          </Picker>

          <TouchableOpacity
            style={{
              backgroundColor: "#007bff",
              borderRadius: 9,
              paddingHorizontal: 8,
              paddingVertical: 8,
              justifyContent: "center",
              alignItems: "center",
              minWidth: 45,
              marginTop: 5,
              marginRight:-20
            }}
            onPress={handleSearch}
            disabled={isSearching || !selectedDestinationName}
          >
            {isSearching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="search" size={24} color="#ffffffff" />
            )}
          </TouchableOpacity>
        </View>
      <Volver route="/pages/Pasajero/Navigation" color={"white"} style={{top:60, left:1}}/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#a81c23ff",
    paddingTop: Platform.OS === "ios" ? 80 : 132,
    paddingHorizontal: 4,
  },
  webview: {
    flex: 1,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#ffffffff",
  },
});
