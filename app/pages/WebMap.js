import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Text, Platform, TextInput, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
// 1. Configuración de Tiled y Estilo
// Usaremos un tema más atractivo (CartoDB Positron) y configuraciones estándar de Leaflet.

const TILE_LAYER = 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png';
const ATTRIBUTION = '';
const INITIAL_CENTER = { latitude: 10.5000, longitude: -66.9167 }; // Caracas, Venezuela

// 2. HTML y JavaScript para Leaflet dentro del WebView

const generateHtmlContent = () => `
<!DOCTYPE html>
<html>
<head>
    <title>OpenStreetMap con Leaflet</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f0f0f0;
        }
        #mapid {
            height: 100vh;
            width: 100%;
            border-radius: 12px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
        }
        .user-marker-icon {
            background-color: #007bff;
            width: 20px;
            height: 20px;
            display: block;
            left: -10px;
            top: -10px;
            position: relative;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(0, 123, 255, 0); }
            100% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0); }
        }
        .search-marker-icon {
            background-color: #ff0000; /* Un color diferente para el marcador de búsqueda */
            width: 20px;
            height: 20px;
            display: block;
            left: -10px;
            top: -10px;
            position: relative;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 0 5px rgba(255, 0, 0, 0.5);
        }
    </style>
</head>
<body>
    <div id="mapid"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        // Inicialización del Mapa
        let map;
        let userMarker = null;
        let searchMarker = null; // Nuevo marcador para la ubicación buscada
        let isMapInitialized = false;

        const initialLat = ${INITIAL_CENTER.latitude};
        const initialLon = ${INITIAL_CENTER.longitude};
        function initializeMap() {
            if (isMapInitialized) return;
            map = L.map('mapid', {
                zoomControl: false
            }).setView([initialLat, initialLon], 13);
            L.tileLayer('${TILE_LAYER}', {
                maxZoom: 19,
                attribution: '${ATTRIBUTION}'
            }).addTo(map);
            L.control.zoom({
                position: 'topright'
            }).addTo(map);

            isMapInitialized = true;
            window.ReactNativeWebView.postMessage('MAP_LOADED');
        }
        initializeMap();

        // Función JS que será llamada desde React Native para actualizar la ubicación del USUARIO
        window.updateUserMarker = function(lat, lon) {
            const latlng = [lat, lon];
            const userIcon = L.divIcon({
                className: 'user-marker-icon',
                iconSize: [20, 20],
                iconAnchor: [10, 10],
                popupAnchor: [0, -10]
            });
            if (userMarker) {
                userMarker.setLatLng(latlng);
            } else {
                userMarker = L.marker(latlng, { icon: userIcon }).addTo(map)
                    .bindPopup("Estás aquí").openPopup();
            }
            // NO volamos el mapa aquí, dejamos que la función de búsqueda lo haga o se quede en el centro inicial
            // window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOCATION_UPDATED', lat, lon }));
        };
        // Nueva función JS para marcar una ubicación buscada
        window.updateSearchMarker = function(lat, lon, address) {
          const latlng = [lat, lon];
            const searchIcon = L.divIcon({
                className: 'search-marker-icon',
                iconSize: [20, 20],
                iconAnchor: [10, 10],
                popupAnchor: [0, -10]
            });
            if (searchMarker) {
                searchMarker.setLatLng(latlng);
                searchMarker.setPopupContent(address);
            } else {
                searchMarker = L.marker(latlng, { icon: searchIcon }).addTo(map)
                    .bindPopup(address);
            }
            searchMarker.openPopup();
            // Centrar el mapa en la ubicación buscada
            map.flyTo(latlng, 15, {
                duration: 1.5
            });
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SEARCH_UPDATED', lat, lon, address }));
        };
        // Función de manejo de clic (Sin cambios)
        map.on('click', function(e) {
            const latlng = { type: 'MAP_CLICK', lat: e.latlng.lat, lng: e.latlng.lng };
            window.ReactNativeWebView.postMessage(JSON.stringify(latlng));
        });
    </script>
</body>
</html>
`;

export default function MapScreen2() {
    const webViewRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState(null);
    const [mapReady, setMapReady] = useState(false);
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResult, setSearchResult] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
 // --- Lógica de Geocodificación (Búsqueda) ---

    const searchLocation = async () => {
        if (!searchQuery.trim()) {
            Alert.alert("Error", "Por favor, ingresa una ubicación para buscar.");
            return;
        }
        setIsSearching(true);
        setSearchResult(null);
        try {
            // Convierte el texto de la dirección a coordenadas
            const geocodedLocation = await Location.geocodeAsync(searchQuery);
          if (geocodedLocation && geocodedLocation.length > 0) {
                const { latitude, longitude } = geocodedLocation[0];
                const newLocation = { latitude, longitude, address: searchQuery };
                setSearchResult(newLocation);
                // 5. Inyectar código JS para mover el mapa y añadir el marcador de búsqueda
                if (webViewRef.current && mapReady) {
                    const addressString = JSON.stringify(searchQuery.replace(/'/g, "\\'")); // Escape de comillas
                    const jsCode = `updateSearchMarker(${latitude}, ${longitude}, ${addressString}); true;`;
                    webViewRef.current.injectJavaScript(jsCode);
                }
            } else {
                Alert.alert("Búsqueda Fallida", `No se encontraron coordenadas para la ubicación: "${searchQuery}"`);
            }
        } catch (error) {
            console.error("Error en la geocodificación:", error);
            Alert.alert("Error", "Ocurrió un error al buscar la ubicación. Intenta de nuevo.");
        } finally {
            setIsSearching(false);
        }
    };
    // --- Lógica de Expo Location ---

    useEffect(() => {
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
            // Empezar a monitorear la posición del usuario
            // Esto es más eficiente que solo obtener una vez
            locationSubscription = await Location.watchPositionAsync(
                {
                   accuracy: Location.Accuracy.BestForNavigation,
                    timeInterval: 5000, // Actualiza cada 5 segundos
                    distanceInterval: 10, // Actualiza si se mueve 10 metros
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
    // --- Lógica de Comunicación RN -> WebView ---
    // Este efecto se dispara cuando la ubicación cambia Y el mapa está listo
    useEffect(() => {
        if (userLocation && webViewRef.current && mapReady) {
            const { latitude, longitude } = userLocation;
            // Función JS a inyectar: llama a la función global 'updateUserMarker' en Leaflet
            const jsCode = `updateUserMarker(${latitude}, ${longitude}); true;`;
            // Inyectar el código en el WebView
            webViewRef.current.injectJavaScript(jsCode);
        }
    }, [userLocation, mapReady]);



    // --- Lógica de Comunicación WebView -> RN ---

    const handleWebViewMessage = (event) => {
        const data = event.nativeEvent.data;
        if (data === 'MAP_LOADED') {
            console.log("Mapa Leaflet inicializado en WebView.");
            setMapReady(true); // El mapa está listo para recibir la ubicación
            return;
        }
        try {
            const message = JSON.parse(data);
            if (message.type === 'MAP_CLICK') {
                console.log("Coordenadas del clic en el mapa:", message);
                // Aquí podrías añadir un marcador o guardar la ubicación seleccionada
            } else if (message.type === 'LOCATION_UPDATED') {
                // Mensaje de confirmación del mapa
                // console.log("Marcador de usuario actualizado en el mapa.");
            }
        } catch (e) {
            console.error("Error al parsear mensaje de WebView:", data, e);
        }
    };



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
            <View style={styles.searchHeader}>
                <TextInput style={styles.input} placeholder="Ej: Plaza Bolívar, Caracas" value={searchQuery} onChangeText={setSearchQuery}
                    onSubmitEditing={searchLocation} // Permite buscar al presionar "Enter"
                    editable={!isSearching}/>
                <TouchableOpacity
                    style={styles.searchButton}
                    onPress={searchLocation}
                    disabled={isSearching} >

                    {isSearching ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Buscar</Text>
                    )}
                </TouchableOpacity>

            </View>

            <View style={styles.mapWrapper}>
                <WebView
                    ref={webViewRef}
                    source={{ html: generateHtmlContent() }}
                    style={styles.map}
                    onMessage={handleWebViewMessage}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    // Ocultar barras de desplazamiento para una vista más limpia
                    scrollEnabled={false}
                    // Configuración específica para Android si es necesario
                    androidLayerType={Platform.OS === 'android' && 'software'}
                />
            </View>

        </View>

    );

}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f8f8',
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingHorizontal: 10,
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

    // Nuevos estilos para la búsqueda

    searchHeader: {
        flexDirection: 'row',
        marginBottom: 10,
        padding: 5,
        backgroundColor: '#fff',
        borderRadius: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },

    input: {
        flex: 1,
        height: 40,
        paddingHorizontal: 10,
        fontSize: 16,
        color: '#333',
    },

    searchButton: {
        backgroundColor: '#007bff',
        borderRadius: 5,
        paddingHorizontal: 15,
        paddingVertical: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
        minWidth: 70, // Para mantener el ancho durante la carga
    },

    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },

    resultContainer: {
        marginBottom: 10,
        padding: 10,
        backgroundColor: '#e6f0ff',
        borderRadius: 8,
        borderLeftWidth: 5,
        borderLeftColor: '#007bff',
    },

    resultText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },

    locationText: {
        fontSize: 13,
        color: '#007bff',
        marginTop: 3,
    },

    // Estilos del mapa (Sin cambios importantes)

    mapWrapper: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 8,
    },

    map: {
        flex: 1,
        minHeight: 200,
    },

});