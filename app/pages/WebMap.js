import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View , ActivityIndicator, Alert,Text, Platform, TextInput, TouchableOpacity} from 'react-native';
import WebView from 'react-native-webview';
import { Asset } from 'expo-asset';
import * as Location from 'expo-location';

import SearchRoot from '../Components/SearchRoot';


// ..####....####...##...##..#####....####...##..##..######..##..##..######.
// .##..##..##..##..###.###..##..##..##..##..###.##..##......###.##....##...
// .##......##..##..##.#.##..#####...##..##..##.###..####....##.###....##...
// .##..##..##..##..##...##..##......##..##..##..##..##......##..##....##...
// ..####....####...##...##..##.......####...##..##..######..##..##....##...
// .........................................................................
// .##...##..######..#####...##...##...####...#####..                       
// .##...##..##......##..##..###.###..##..##..##..##.                       
// .##.#.##..####....#####...##.#.##..######..#####..                       
// .#######..##......##..##..##...##..##..##..##.....                       
// ..##.##...######..#####...##...##..##..##..##.....                       
// .................................................. 

// BBOX estático para Ciudad Guayana: [LatSur, LonOeste, LatNorte, LonEste]
const GUAYANA_BBOX = "8.21,-62.88,8.39,-62.60";

//---------------------Funcion que renderiza el mapa------------------------
const loadMapHtml = async () => {
    console.log()
    console.log(' Recarga del mapa ♻️')
    console.log()
  const asset = Asset.fromModule(require('../../assets/map.html'));
  await asset.downloadAsync();
  return asset.uri;
};
//-----------------------------------------------------------------------

// -------------------------------------------------------------
// FUNCIÓN DE CONSULTA A OVERPASS
// -------------------------------------------------------------
const fetchGuayanaBusStops = async () => {
    console.log()
    console.log(' -->fetchGuayanaBusStops ')
    console.log()
    // La consulta se mantiene, solo se reescribe para claridad
    const overpassQuery = `
        [out:json][timeout:30];
        node[highway=bus_stop](${GUAYANA_BBOX});
        out center; 
    `;
    const encodedQuery = encodeURIComponent(overpassQuery);
    const url = `https://overpass-api.de/api/interpreter?data=${encodedQuery}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        return await response.json(); 
    } catch (error) {
        console.error("Error al obtener paradas de Overpass:", error);
        return null;
    }
};
//--------------------------------------------------------

export default function WebMap ()  {
    //---------------Hooks------------------------------
    const webviewRef = useRef(null);//---cluster del mapa
    const [mapHtmlUri, setMapHtmlUri] = useState(null);//---url y datos del mapa del tiempo real
    const [loading, setLoading] = useState(true);

    // Nuevo estado para rastrear si el mapa y las paradas están listos.
    const [isMapReady, setIsMapReady] = useState(false);//espera al flag MAP_LOADED para volverse true y luego false
    const [stopsInjected, setStopsInjected] = useState(false);// es para verificar cuando la inyeccion js a sido exitosa

    const [userLocation, setUserLocation] = useState(null);//--ubicacion del usuario en tiempo real

    const [searchQuery, setSearchQuery] = useState('')//----Query de busquedas
    const [searchResult, setSearchResult] = useState(null);//----Resultados de la busqueda
    const [isSearching, setIsSearching] = useState(false);//---Stado de la busqueda
    //--------------------------------------------------

//-----------UseEffet loadhtmlUri-----------------------
  useEffect(() => {
    loadMapHtml().then(setMapHtmlUri);
  }, []);
 // --- Lógica de Expo Location  ✅ ---
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
            locationSubscription = await Location.watchPositionAsync(
                {
                   accuracy: Location.Accuracy.BestForNavigation,
                    timeInterval: 360000, // Actualiza cada 6 minutos
                    distanceInterval: 10, // Actualiza cada 10 metros
                },
                (location) => {
                    const { latitude, longitude } = location.coords;
                  setUserLocation({ latitude, longitude });
                  setLoading(false);
                }
            );
            console.log('--------> Permisos de ubicacion aprobados ♿ ☑️------')
        };
        requestPermissionsAndGetLocation();
        // Limpieza: detener la suscripción cuando el componente se desmonte
        return () => {
            if (locationSubscription) {
                locationSubscription.remove();
            }
        };
    }, []);

//-----------------UseEffect para actualizar el marcador del usuario ✅ --------------------
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
//--------------UseEffect para cargar las paradas dentro de un pequeño BBOX------
useEffect(() => {
    // Solo si el mapa está listo Y las paradas no han sido inyectadas AHORA
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

// 1. Manejador de Mensajes (No cambiar)
const handleWebViewMessage = (event) => {
    const message = event.nativeEvent.data;
    if (message === 'MAP_LOADED') {
        setIsMapReady(true); // El mapa está listo
        setStopsInjected(false); // <--- AÑADE ESTO
        // Si el mapa se recarga, debemos volver a inyectar las paradas.
    }
};
   // en el caso de que maphtmlUri se encuentre vacio se graficara una pantalla de carga
  if (!mapHtmlUri) {
        return (
               <View style={[styles.container, styles.center]}>
                   <ActivityIndicator size="large" color="#007bff" />
                   <Text style={styles.loadingText}>Buscando tu ubicación...</Text>
               </View>
           );
   
  }
  
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
        
        <View style={{flexDirection: 'row', marginBottom: 10,padding: 5,backgroundColor: '#fff',borderRadius: 8,elevation: 2,shadowColor: '#000', shadowOffset: { width: 0, height: 1 },shadowOpacity: 0.1, shadowRadius: 3,}}>
            <TextInput style={{flex: 1,height: 40,paddingHorizontal: 10,fontSize: 16,color: '#333',}} 
                placeholder="Ej: Plaza Bolívar, Caracas" 
                value={searchQuery} 
                onChangeText={setSearchQuery}
                onSubmitEditing={()=>{}} // Permite buscar al presionar "Enter"
                editable={!isSearching}/>
            <TouchableOpacity
                style={{backgroundColor: '#007bff',borderRadius: 5,paddingHorizontal: 15,paddingVertical: 8,justifyContent: 'center',alignItems: 'center', marginLeft: 8,minWidth: 70,}}
                onPress={()=>{}}
                disabled={isSearching} >
        
                {isSearching ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Text style={{color: '#fff',fontWeight: 'bold', fontSize: 16,}}>
                        Buscar
                    </Text>
                )}
                    </TouchableOpacity>
        
        </View>

        <View style={{flex: 1, borderRadius: 12,overflow: 'hidden',shadowColor: '#000',shadowOffset: { width: 0, height: 4 },shadowOpacity: 0.1,shadowRadius: 5,elevation: 8,}}>
             <WebView
                ref={webviewRef}
                source={{ uri: mapHtmlUri }}
                style={{flex: 1,}}
                onMessage={handleWebViewMessage}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                scrollEnabled={false}
                
            />
        </View>
        <SearchRoot></SearchRoot>
     
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
