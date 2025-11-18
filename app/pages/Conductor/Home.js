import axios from 'axios';
import * as Location from 'expo-location';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, Button, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

// --- Constantes Geográficas ---
// Radio de la Tierra en metros (WGS-84 semieje mayor)
const EARTH_RADIUS = 6378137.0; 
// Distancia de movimiento para el botón (10 metros)
const DISTANCE_TO_MOVE = 10; 

// --- Configuración de la API y Almacenamiento ---
const BUS_ID_KEY = '@MyBusId';
const BASE_URL = 'https://api-bus-w29v.onrender.com/api/v1'; 
const TRACK_API_URL = `${BASE_URL}/track`; 
const BUSES_API_URL = `${BASE_URL}/buses`; 

// Intervalos de actualización (en milisegundos)
const SEND_INTERVAL = 20000; // 20 segundos para enviar mi ubicación
const FETCH_INTERVAL = 5000; // 5 segundos para cargar las ubicaciones de los demás


// --- Funciones de Utilidad ---

// Función para cargar o generar el ID del Bus
const getOrGenerateBusId = async () => {
    let storedId = await AsyncStorage.getItem(BUS_ID_KEY);
    if (storedId) {
        console.log("ID cargada:", storedId);
        return storedId;
    }
    const newId = uuidv4();
    await AsyncStorage.setItem(BUS_ID_KEY, newId);
    console.log("ID generada y guardada:", newId);
    return newId;
};

// Función para calcular nuevas coordenadas dado un punto y una distancia (Asumiendo Norte (0°) por simplicidad)
const calculateNewLocation = (currentLat, currentLon, distanceMeters) => {
    // Cálculo para mover 10 metros al Norte (cambia solo la latitud)
    // dLat (en radianes) = Distancia / Radio de la Tierra
    const dLat = distanceMeters / EARTH_RADIUS;
    
    // Latitud nueva (en grados)
    const newLat = currentLat + (dLat * (180 / Math.PI));
    
    // La longitud se mantiene casi constante para un movimiento norte/sur corto
    const newLon = currentLon; 

    return {
        latitude: newLat,
        longitude: newLon,
    };
};


// --- Componente Principal ---
export default function Home() {
    const [errorMsg, setErrorMsg] = useState(null);
    const [locationBus, setLocationBus] = useState([]); // Todos los buses
    const [busId, setBusId] = useState('CARGANDO...');
    
    // 🆕 Estado para mi ubicación SIMULADA (la que enviamos)
    const [myLocation, setMyLocation] = useState(null);
    
    // Usamos useRef para acceder a los valores más recientes dentro de setInterval
    const myLocationRef = useRef(myLocation);
    const busIdRef = useRef(busId);
    
    // Mantener las referencias actualizadas
    useEffect(() => {
        myLocationRef.current = myLocation;
        busIdRef.current = busId;
    }, [myLocation, busId]);


    // Función para enviar mi propia ubicación
    // 🔄 ACEPTA UN OBJETO DE COORDENADAS SIMPLIFICADO
    const sendLocation = useCallback(async (locationToSend, currentBusId) => {
        if (!locationToSend || !currentBusId) return;
        
        const payload = {
            bus_id: currentBusId,
            // Usamos 0 para la velocidad ya que es una simulación manual
            latitude: locationToSend.latitude,
            longitude: locationToSend.longitude,
            speed: locationToSend.speed || 0 
        };
        
        try {
            console.log("Enviando [SIMULADO/REAL]:", payload);
            await axios.post(TRACK_API_URL, payload, { timeout: 5000 });
            console.log("Enviado OK. Lat:", payload.latitude.toFixed(5));
            setErrorMsg(null); 
        } catch (error) {
            console.error("Error al enviar ubicación:", error.message);
            setErrorMsg('Error de red al enviar ubicación. Revisa la URL.');
        }
    }, []);

    // Función para cargar las ubicaciones de TODOS los buses desde la API
    const fetchBusLocations = async () => {
        try {
            const response = await fetch(BUSES_API_URL);
            const data = await response.json();
            
            if (response.ok) {
                console.log(`Buses cargados (${data.length})`);
                setLocationBus(data);
                setErrorMsg(null);
            } else {
                console.error('Error del servidor al obtener buses:', data.error);
                setErrorMsg(`Error del servidor: ${data.error}`);
            }
        } catch (error) {
            console.error('Error de conexión al cargar buses:', error);
            setErrorMsg('Error de conexión al cargar buses. Revisa la URL.');
        }
    };
    
    // 🆕 Función para mover el bus 10 metros al Norte (simulación)
    const moveBus = async () => {
        if (!myLocation) {
            setErrorMsg("No se ha cargado la ubicación inicial para poder mover el bus.");
            return;
        }

        const newCoords = calculateNewLocation(
            myLocation.latitude, 
            myLocation.longitude, 
            DISTANCE_TO_MOVE
        );
        
        // 1. Actualiza el estado de mi ubicación con la nueva posición
        const newLocationObject = { 
            latitude: newCoords.latitude, 
            longitude: newCoords.longitude, 
            speed: 5 // Velocidad simulada para el movimiento
        };
        setMyLocation(newLocationObject); 

        // 2. Envía la nueva ubicación a la API inmediatamente
        await sendLocation(newLocationObject, busId);
    };


    // --- useEffect: Inicialización y Bucles de Tareas ---
    useEffect(() => {
        let sendLocationInterval;
        let fetchBusesInterval;
        
        (async () => {
            console.log('---> Inicialización de Tracking Simulador Iniciada');
            
            // 1. Cargar/Generar ID
            const currentBusId = await getOrGenerateBusId();
            setBusId(currentBusId); 
            
            // 2. Pedir permiso y obtener ubicación INICIAL (se usará como punto de partida)
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permiso de ubicación denegado. No se puede rastrear.');
                return;
            }
            
            try {
                let initialLocation = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });
                
                const initialCoords = {
                    latitude: initialLocation.coords.latitude,
                    longitude: initialLocation.coords.longitude,
                    speed: initialLocation.coords.speed || 0, // Asegura que 'speed' exista
                };
                
                setMyLocation(initialCoords); // Guarda la ubicación inicial
                
                // Envía la ubicación inicial inmediatamente
                await sendLocation(initialCoords, currentBusId);

            } catch (error) {
                setErrorMsg('Error al obtener la ubicación inicial.');
                console.error("Error al obtener ubicación inicial:", error);
                return;
            }


            // 3. Iniciar el BUCLE para ENVIAR mi ubicación (usa myLocationRef para la ubicación más reciente)
            sendLocationInterval = setInterval(async () => {
                // Usamos la referencia para obtener el valor más reciente del estado myLocation
                const latestLocation = myLocationRef.current;
                const latestBusId = busIdRef.current;
                
                if (latestLocation) {
                    await sendLocation(latestLocation, latestBusId); 
                } else {
                    console.log("Ubicación aún no disponible para el envío periódico.");
                }
            }, SEND_INTERVAL); 

            // 4. Iniciar el BUCLE para CARGAR las ubicaciones de TODOS los buses
            await fetchBusLocations(); 
            fetchBusesInterval = setInterval(fetchBusLocations, FETCH_INTERVAL);

        })();
        
        // Función de limpieza
        return () => {
            clearInterval(sendLocationInterval); 
            clearInterval(fetchBusesInterval); 
            console.log("Intervalos de rastreo detenidos.");
        };
    }, [sendLocation]); // Agregamos sendLocation a deps ya que es un useCallback, aunque la dependencia real es [] para la inicialización.


    return (
        <View style={styles.container}>
            
            <Text style={styles.title}>Tracking Activado (Modo Bus Simulador)</Text>
            <Text>Mi ID de Bus: <Text style={{fontWeight: 'bold', color: '#007AFF'}}>{busId}</Text></Text>
            <Text>Ubicación Actual (Simulada):</Text>
            {myLocation ? (
                <Text style={{marginBottom: 10, color: '#333'}}>
                    Lat: {myLocation.latitude.toFixed(6)}, Lon: {myLocation.longitude.toFixed(6)}
                </Text>
            ) : (
                <Text>Cargando ubicación inicial...</Text>
            )}

            <Text>Cargando buses desde la API cada {FETCH_INTERVAL/1000}s</Text>
            
            <FlatList
                style={styles.flatList}
                data={locationBus}
                keyExtractor={item => item._id.toString()}
                renderItem={({ item }) => (
                    <View style={[
                        styles.busItem, 
                        item._id === busId && styles.myBusItem // Resaltar mi propio bus
                    ]}>
                        <Text style={styles.busId}>🚌 ID: {item._id}</Text>
                        {item.last_location && item.last_location.coordinates && 
                            <Text>📍 Lat: {item.last_location.coordinates[1].toFixed(6)}, Lon: {item.last_location.coordinates[0].toFixed(6)}</Text>
                        }
                        <Text>⚡ Velocidad: {item.last_speed !== undefined ? item.last_speed.toFixed(1) : 'N/A'} km/h</Text>
                        <Text>⏱️ Visto: {item.last_seen ? new Date(item.last_seen).toLocaleTimeString() : 'N/A'}</Text>
                        <Text>✅ Estado: **{item.status || 'Desconocido'}**</Text>
                    </View>
                )}
                ListEmptyComponent={() => <Text style={styles.emptyText}>Esperando datos de buses...</Text>}
            />
            <View style={{flexDirection:'row', marginHorizontal: 90, marginBottom: 20}}>
                <Button 
                    title='Moverme 10 metros al Norte ⬆️' 
                    onPress={moveBus}
                    disabled={!myLocation || busId === 'CARGANDO...'}
                />
            </View>
            {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 20,
        paddingTop: 50, 
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    error: {
        color: 'red',
        marginTop: 15,
        textAlign: 'center',
        padding: 10,
        backgroundColor: '#ffe0e0',
        borderRadius: 5,
    },
    flatList: {
        maxHeight: 350, // Ajuste para mejor visualización
        marginVertical: 15,
        width: '100%',
    },
    busItem: {
        backgroundColor: '#f0f0f5', 
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        borderLeftWidth: 5,
        borderLeftColor: '#4CAF50', 
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.20,
        shadowRadius: 1.41,
        elevation: 2,
    },
    myBusItem: {
        backgroundColor: '#e1f5fe', // Color diferente para mi bus
        borderLeftColor: '#007AFF', // Azul para mi bus
    },
    busId: {
        fontWeight: '700',
        fontSize: 16,
        marginBottom: 5,
        color: '#333'
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        color: '#999'
    }
});