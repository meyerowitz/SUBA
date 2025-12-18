import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View , ActivityIndicator, Alert,Text, Platform, TextInput, TouchableOpacity} from 'react-native';
import WebView from 'react-native-webview';
import { Picker } from '@react-native-picker/picker';
import { Feather } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';

import SearchRoot from '../../Components/SearchRoot';
import Destinos from '../../Components/Destinos.json';

// --- CONSTANTES DE LA API DEL BUS ---
const BASE_URL = 'https://api-bus-w29v.onrender.com/api/v1'; 
const BUSES_API_URL = `${BASE_URL}/buses`; // GET para obtener todas las ubicaciones
const FETCH_INTERVAL = 5000; // Cargar buses cada 5 segundos (500ms)
// BBOX estático para Ciudad Guayana: [LatSur, LonOeste, LatNorte, LonEste]
const GUAYANA_BBOX = "8.21,-62.88,8.39,-62.60";
//---------------------1) .Funcion que renderiza el mapa------------------------
/*
const loadMapHtml = async () => {
    console.log()
    console.log(' Recarga del mapa ♻️')
    console.log()
  const asset = Asset.fromModule(require('../../../assets/map.html'));
  await asset.downloadAsync();
  const cacheBusterUri = `${asset.uri}?t=${new Date().getTime()}`;
    
  return cacheBusterUri;
};
*/
// -------------------------------------------------------------
// 2) .FUNCIÓN DE CONSULTA A OVERPASS
// -------------------------------------------------------------
const fetchGuayanaBusStops = async (retry = 0) => { // retry: contador de reintentos
    const MAX_RETRIES = 3;
    const DELAY_MS = 10000 * (retry + 1); // 10s, 20s, 30s de demora
    console.log('')
    console.log('---> fetchGuayanaBusStops en acción')
    console.log('--->       Ejecutando consultas Http Overpass')
    console.log('')
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
            console.warn(`Error 429 (Demasiadas solicitudes). Reintentando en ${DELAY_MS / 1000} segundos... (Intento ${retry + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            return fetchGuayanaBusStops(retry + 1); // Llamada recursiva para reintentar
        }

        throw new Error(`Error HTTP: ${response.status}`);
        
    } catch (error) {
        console.error("Error al obtener paradas de Overpass:", error);
        // Si el error persiste después de los reintentos, lanzamos el error original
        return null;
    }
};
//--------------------------------------------------------
// ---3) .FUNCIÓN DE CONSULTA A LA API RET / BUSES ---
const fetchBusLocations = async () => {
    console.log('---> fetchBusLocation en la API()')
    try {
        const response = await fetch(BUSES_API_URL);
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        const data = await response.json();
        console.log(data)
        return data;
    } catch (error) {
        console.error("Error al obtener ubicaciones de buses:", error);
        return [];
    }
};


export default function WebMap ()  {
    //---------------Hooks------------------------------
    const webviewRef = useRef(null);//---cluster del mapa
    const [mapHtmlUri, setMapHtmlUri] = useState(null);//---url y datos del mapa del tiempo real
    const [mapHtmlContent, setMapHtmlContent] = useState(null);
    const [loading, setLoading] = useState(true);

    // Nuevo estado para rastrear si el mapa y las paradas están listos.
    const [isMapReady, setIsMapReady] = useState(false);//espera al flag MAP_LOADED para volverse true y luego false
    const [stopsInjected, setStopsInjected] = useState(false);// es para verificar cuando la inyeccion js a sido exitosa

    const [userLocation, setUserLocation] = useState(null);//--ubicacion del usuario en tiempo real

    //const [searchQuery, setSearchQuery] = useState('')//----Query de busquedas
    //const [searchResult, setSearchResult] = useState(null);//----Resultados de la busqueda
    const [isSearching, setIsSearching] = useState(false);//---Stado de la busqueda

    const [selectedDestinationName, setSelectedDestinationName] = useState('');
    // NUEVO ESTADO para las ubicaciones de los buses
    const [busLocations, setBusLocations] = useState([]);
    //--------------------------------------------------

//----------- 1) .UseEffet loadhtmlUri-----------------------
  useEffect(() => {
    //loadMapHtml().then(setMapHtmlUri);
    const loadHTML = async () => {
        try {
            const asset = Asset.fromModule(require('../../../assets/map.html'));
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
    console.log('-----Solicitando permisos de Locacion------')
        let locationSubscription = null;
        const requestPermissionsAndGetLocation = async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    "Permiso denegado",
                    "Necesitamos permiso para acceder a la ubicación y mostrar tu posición en el mapa."
                );
                setLoading(false);
                return;
            }
            console.log('--------> Permisos de ubicacion aprobados ♿ ☑️------')
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
                }
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
    console.log()
    console.log(' marcador del usuario 📍 ')
    if (userLocation && webviewRef.current && isMapReady) {
        const { latitude, longitude } = userLocation;
        // Llama a la función updateUserMarker
        const userJsCode = `updateUserMarker(${latitude}, ${longitude}); true;`;
        webviewRef.current.injectJavaScript(userJsCode);
    }
    if(userLocation!== null){
    console.log(' ----> Ubicacion actualizada ')
    console.log('      latitud: ', userLocation.latitude , ' longitud: ',userLocation.longitude)
    console.log('')
}
    
    
// Depende SOLAMENTE de userLocation para el tiempo real.
}, [userLocation,isMapReady]);
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
//-----------------5) .UseEffect para cargar y renderizar la ubicación de los buses 🚌 --------------------
useEffect(() => {
    let fetchBusesInterval;
    console.log()
    console.log(' marcador de los BUSES 📍 ')
    console.log()
    const loadAndRenderBuses = async () => {
        const locations = await fetchBusLocations();
        
        const transformedData = locations.map(bus => ({
            bus_id: bus._id,
            route: bus.route || 'Desconocida',
            velocity: bus.last_speed !== undefined ? bus.last_speed.toFixed(1) : 'N/A',
            // Coordenadas GeoJSON [lon, lat] -> Invertir a [lat, lon] para JS
            lat: bus.last_location.coordinates[1], 
            lon: bus.last_location.coordinates[0],
        }));

        setBusLocations(transformedData); 
        // 2. Inyectar JavaScript en el WebView SOLO si el mapa está listo
        if (isMapReady && webviewRef.current) {
            console.log('inyectando los buses en el mapa: ', transformedData)
            if(isMapReady=== true){console.log('isMapReady: true ')}
            const busDataString = JSON.stringify(transformedData);

            const busJsCode = `renderBusLocations(${busDataString}); true;`;
            webviewRef.current.injectJavaScript(busJsCode);
            console.log(`Ubicaciones de ${transformedData.length} buses inyectadas.`);
        }
    };
    
    loadAndRenderBuses();
    
    fetchBusesInterval = setInterval(loadAndRenderBuses, FETCH_INTERVAL);

    return () => {
        clearInterval(fetchBusesInterval);
        console.log("Intervalo de carga de buses detenido.");
    };

}, [isMapReady]);



// 1. Manejador de Mensajes (No cambiar)
const handleWebViewMessage = (event) => {
    const message = event.nativeEvent.data;
    if (message === 'MAP_LOADED') {
        setIsMapReady(true); // El mapa está listo
        setStopsInjected(false); // <--- AÑADE ESTO
        // Si el mapa se recarga, debemos volver a inyectar las paradas.
    }
};



// --- 2. MANEJADOR DE BÚSQUEDA Y RUTEO ---
const handleSearch = () => {
    // 1. Validar pre-requisitos
    if (!selectedDestinationName || !isMapReady || !webviewRef.current || !userLocation) {
        // Alerta si falta la ubicación del usuario
        if (!userLocation) {
             Alert.alert("Error", "No se ha podido obtener tu ubicación actual.");
        }
        return; 
    }

    setIsSearching(true);

    try {
        console.log(`Buscando destino seleccionado: ${selectedDestinationName}`);
        
        // 2. Buscar destino
        const destination = Destinos.find(
            dest => dest.name === selectedDestinationName
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
            console.log(`Solicitud de ruteo y animación inyectada: (${userLat},${userLon}) a (${destLat},${destLon})`);

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
                  <ActivityIndicator size="large" color="#007bff" />
                  <Text style={styles.loadingText}>Buscando tu ubicación...</Text>
              </View>
          );
  
      }
  return (
    <View style={styles.container}>
       
        <View style={{flex: 1, borderRadius: 12,overflow: 'hidden',shadowColor: '#000',shadowOffset: { width: 0, height: 4 },shadowOpacity: 0.1,shadowRadius: 5,elevation: 8,}}>
             <WebView
                ref={webviewRef}
                source={mapHtmlContent ? { html: mapHtmlContent, baseUrl: '' } : null }
                style={{flex: 1,}}
                onMessage={handleWebViewMessage}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                scrollEnabled={false}

                originWhitelist={['*']}
                allowFileAccess={true}
                allowUniversalAccessFromFileURLs={true}
                
            />
        </View>
        <View style={{backgroundColor:'white', height:'30%', width:'104.5%', position:'absolute', bottom:'-1%', left:'0.5%', borderRadius: 12,shadowColor: '#000',shadowOffset: { width: 0, height: 4 },shadowOpacity: 0.1,shadowRadius: 5,elevation: 8, padding:'5%'}}>
            <View style={{flexDirection: 'row', marginBottom: 10,padding: 5,backgroundColor: '#fff',borderRadius: 8,elevation: 2,shadowColor: '#000', shadowOffset: { width: 0, height: 1 },shadowOpacity: 0.1, shadowRadius: 3,}}>
                <Picker
                    selectedValue={selectedDestinationName}
                    onValueChange={(itemValue) => setSelectedDestinationName(itemValue)}
                    style={{ height: 50, width: '80%' }}
                    enabled={!isSearching}
                >
                <Picker.Item label="Selecciona un destino..." value="" enabled={false} />
                    {Destinos.map((dest) => (
                        <Picker.Item key={dest.name} label={dest.name} value={dest.name} />
                    ))}
                </Picker>
    
                <TouchableOpacity
                    style={{ backgroundColor: '#007bff', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 8, justifyContent: 'center', alignItems: 'center', minWidth: 45, marginTop: 8 }}
                    onPress={handleSearch}
                    disabled={isSearching || !selectedDestinationName}>
        
                    {isSearching ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                    <Feather name="search" size={24} color="#ffffffff" />
                    )}
                </TouchableOpacity>
            </View>
        </View>
     
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 10,
  },
  webview: {
    flex: 1,
  },
  center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#555',
    },


    
});
