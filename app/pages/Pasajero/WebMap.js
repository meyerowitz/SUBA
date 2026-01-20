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
import Rutas from "../../Components/RutasBuses.json"; 

const { height } = Dimensions.get('window');
// --- CONSTANTES DE LA API DEL BUS ---
const BASE_URL = "https://api-bus-w29v.onrender.com/api/v1";
const BUSES_API_URL = `${BASE_URL}/buses`; // GET para obtener todas las ubicaciones
const FETCH_INTERVAL = 5000; // Cargar buses cada 5 segundos (500ms)
// BBOX estático para Ciudad Guayana: [LatSur, LonOeste, LatNorte, LonEste]
const GUAYANA_BBOX = "8.21,-62.88,8.39,-62.60";
let buses = []
let busesxd = []

// ---
const getDistance = (lat1, lon1, lat2, lon2) => {
  return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
};
// ----------------------------------------------------------
// 2) .FUNCIÓN DE CONSULTA A OVERPASS
// -------------------------------------------------------------
const fetchGuayanaBusStops = async (retry = 0) => {
  // retry: contador de reintentos
  const MAX_RETRIES = 3;
  const DELAY_MS = 10000 * (retry + 1); // 10s, 20s, 30s de demora
  console.log("");
  console.log("---> fetchGuayanaBusStops en acción");
  console.log("--->       Ejecutando consultas Http Overpass");
  console.log("");
  const overpassQuery = `
        [out:json][timeout:60];
        node[highway=bus_stop](${GUAYANA_BBOX});
        out center;
    `;
  const encodedQuery = encodeURIComponent(overpassQuery);
  const url = `https://overpass-api.de/api/interpreter?data=${encodedQuery}`;

  try {
    const response = await fetch(url);
    if (response.ok) {
      console.log(`Paradas obtenidas exitosamente en el intento ${retry + 1}.`);
      return await response.json();
    }

    // Manejo específico del error 429
    if (response.status === 429 && retry < MAX_RETRIES) {
      console.warn(
        `Error 429 (Demasiadas solicitudes). Reintentando en ${DELAY_MS / 1000} segundos... (Intento ${retry + 1}/${MAX_RETRIES})`,
      );
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      return fetchGuayanaBusStops(retry + 1); // Llamada recursiva para reintentar
    }

    throw new Error(`Error HTTP: ${response.status}`);
  } catch (error) {
    console.error("Error al obtener paradas de Overpass:", error);
    // Si el error persiste después de los reintentos, lanzamos el error original
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
      }
    };
    loadHTML();
  }, []);
  // --- 2) .Lógica de Expo Location  ✅ ---
  useEffect(() => {
    console.log("-----Solicitando permisos de Locacion------");
    let locationSubscription = null;
    const requestPermissionsAndGetLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        //Alert.alert(
          //"Permiso denegado",
         // "Necesitamos permiso para acceder a la ubicación y mostrar tu posición en el mapa.",
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
  /*useEffect(() => {
    console.log()
    console.log(' marcador de las paradas de buses 📍 ')
    console.log()
    if (isMapReady && webviewRef.current && !stopsInjected) {
        fetchGuayanaBusStops()
            .then(overpassData => {
                if (overpassData) {
                    const dataString = JSON.stringify(overpassData);

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
*/
/*const BUS_WAYPOINTS = [
  [8.293853734473132, -62.731331519481074],
  [8.29143991148122, -62.73045463817505],
  [8.289247591391884, -62.729621704967286],
  [8.285261565265827, -62.722594134791464],
  [8.282606566318663, -62.7237881744295],
  [8.279615383541639, -62.7277281487587],
  [8.27135183557236, -62.73685929928567]
];

useEffect(() => {
  if (isMapReady && webviewRef.current) {
    const waypointsString = JSON.stringify(BUS_WAYPOINTS);
    
    const drawSnappedRouteJs = `
      //  eliminar ruta previa si existe para no duplicar
      if (window.busRoutingControl) {
          map.removeControl(window.busRoutingControl);
      }

      
      window.busRoutingControl = L.Routing.control({
        waypoints: ${waypointsString}.map(p => L.latLng(p[0], p[1])),
        lineOptions: {
          styles: [{ color: '#a81c23', opacity: 0.3, weight: 3 }]
        },
        createMarker: function() { return null; }, // No marcadores en cada punto yes piz
        addWaypoints: false,
        routeWhileDragging: false,
        draggableWaypoints: false,
        fitSelectedRoutes: false,
        show: false // No cuadro de texto con instrucciones pq es feo
      }).addTo(map);
      true;
    `;
    
    webviewRef.current.injectJavaScript(drawSnappedRouteJs);
  }
}, [isMapReady]);*/

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
    }  },[isMapReady]);

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
 // Función auxiliar para encontrar el índice del punto más cercano en un arreglo
const findClosestIndex = (lat, lon, points) => {
  let closestIndex = 0;
  let minDistance = Infinity;
  points.forEach((p, index) => {
    const dist = Math.sqrt(Math.pow(lat - p[0], 2) + Math.pow(lon - p[1], 2));
    if (dist < minDistance) {
      minDistance = dist;
      closestIndex = index;
    }
  });
  return { index: closestIndex, distance: minDistance };
};

const handleSearch = () => {
  if (!selectedDestinationName || !isMapReady || !webviewRef.current || !userLocation) return;

  setIsSearching(true);

  try {
    const destination = Destinos.find(dest => dest.name === selectedDestinationName);
    if (destination) {
      const { latitude: userLat, longitude: userLon } = userLocation;
      const { lat: destLat, lon: destLon } = destination;

      let routeSegment = [];
      const threshold = 0.005; // Radio de cercanía (aprox 500m)

      // 1. Buscamos si EL USUARIO está cerca de alguna ruta
      const matchedRoute = Rutas.find(ruta => 
        ruta.puntos.some(p => getDistance(userLat, userLon, p[0], p[1]) < threshold)
      );

      if (matchedRoute) {
        // 2. Encontrar el punto de la ruta más cercano al USUARIO (Entrada)
        const startResult = findClosestIndex(userLat, userLon, matchedRoute.puntos);
        
        // 3. Encontrar el punto de la ruta más cercano al DESTINO (Salida)
        const endResult = findClosestIndex(destLat, destLon, matchedRoute.puntos);

        // 4. Cortar el arreglo para que solo incluya el trayecto necesario
        // Usamos min y max por si la ruta en el JSON viene en sentido contrario al que viajas
        const i1 = Math.min(startResult.index, endResult.index);
        const i2 = Math.max(startResult.index, endResult.index);
        
        routeSegment = matchedRoute.puntos.slice(i1, i2 + 1);
        
        // Si el destino está más cerca del inicio del array que el usuario, invertimos el segmento
        if (startResult.index > endResult.index) {
          routeSegment.reverse();
        }
      }

      const routeJsCode = `
          drawRouteAndAnimate(
              ${userLat}, ${userLon},
              ${destLat}, ${destLon},
              ${JSON.stringify(routeSegment)}
          );
          true;
      `;

      webviewRef.current.injectJavaScript(routeJsCode);
      setShowEta(false);
    }
  } catch (error) {
    console.error(error);
  } finally {
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

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#ffffffff" />
        <Text style={styles.loadingText}>Buscando tu ubicación...</Text>
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
