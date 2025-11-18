import axios from 'axios';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View , FlatList} from 'react-native';

// --- ¡ASEGÚRATE QUE ESTA IP SEA LA DE TU PC! ---
const BASE_URL = 'http://192.168.100.2:3000/api/v1'; // URL Base jaja
const TRACK_API_URL = `${BASE_URL}/track`; // POST para enviar mi ubicación
const BUSES_API_URL = `${BASE_URL}/buses`; // GET para obtener todas las ubicaciones
const MY_BUS_ID = 'BUS-101-PROTOTIPO';

// Intervalos de actualización (en milisegundos)
const SEND_INTERVAL = 20000; // 20 segundos para enviar mi ubicación
const FETCH_INTERVAL = 5000; // 5 segundos para cargar las ubicaciones de los demás

export default function Home() {
    const [errorMsg, setErrorMsg] = useState(null);
    const [LocationBus, setLocationBus] = useState([]); // Estado para guardar todos los buses

    // Función para enviar mi propia ubicación (Bus-101)
    const sendLocation = async (currentLocation) => {
        if (!currentLocation) return;
        const payload = {
            bus_id: MY_BUS_ID,
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
            speed: currentLocation.coords.speed
        };
        try {
            console.log("Enviando (Expo Go):", payload);
            // Usamos la URL correcta para enviar
            await axios.post(TRACK_API_URL, payload, { timeout: 5000 });
            console.log("Enviado (Expo Go) OK");
        } catch (error) {
            console.error("Error al enviar ubicación:", error.message);
            // Si el error es de red, mostramos mensaje de API caído
            if (error.code === 'ECONNABORTED' || error.message.includes('Network Error')) {
                 setErrorMsg('Error de red al enviar. ¿API está corriendo y la IP es correcta?');
            } else {
                 setErrorMsg('Error al enviar ubicación.');
            }
           
        }
    };
    
    // Función para cargar las ubicaciones de TODOS los buses desde la API
    const fetchBusLocations = async () => {
        try {
            // Usamos la URL correcta para cargar los buses
            const response = await fetch(BUSES_API_URL);
            const data = await response.json();
            
            if (response.ok) {
                console.log(`Buses cargados (${data.length}):`, data.map(b => b._id));
                // Actualiza el estado con la lista de buses
                setLocationBus(data);
                setErrorMsg(null); // Limpiar errores si la carga fue exitosa
            } else {
                console.error('Error del servidor al obtener buses:', data.error);
                setErrorMsg(`Error del servidor: ${data.error}`);
            }
        } catch (error) {
            console.error('Error de conexión al cargar buses:', error);
            setErrorMsg('Error de conexión al cargar buses. Revisa la URL.');
        }
    };
    
    // --- useEffect: Inicialización y Bucles de Tareas ---
    useEffect(() => {
        let sendLocationInterval;
        let fetchBusesInterval;
        
        // Función principal asíncrona dentro de useEffect
        (async () => {
            // 1. Pedir permiso de ubicación
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permiso de ubicación denegado. No se puede rastrear.');
                return;
            }
            
            // 2. Iniciar el BUCLE para ENVIAR mi ubicación (Bus-101)
            sendLocationInterval = setInterval(async () => {
                try {
                    let currentLocation = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.High,
                    });
                    await sendLocation(currentLocation);
                } catch (error) {
                    console.warn("Error obteniendo/enviando:", error);
                    // Solo actualizamos el mensaje de error si es diferente al de red ya establecido
                    if (!errorMsg || !errorMsg.includes('red al enviar')) { 
                         setErrorMsg('Error de rastreo: ' + error.message);
                    }
                   
                }
            }, SEND_INTERVAL); // Cada 20 segundos

            // 3. Iniciar el BUCLE para CARGAR las ubicaciones de TODOS los buses
            // Hacemos una carga inicial inmediata
            await fetchBusLocations(); 
            
            // Y luego lo repetimos cada 5 segundos
            fetchBusesInterval = setInterval(fetchBusLocations, FETCH_INTERVAL);

        })();
        
        // Función de limpieza: Se ejecuta al desmontar el componente
        return () => {
            clearInterval(sendLocationInterval); // Detiene el envío
            clearInterval(fetchBusesInterval); // Detiene la carga
            console.log("Intervalos de rastreo detenidos.");
        };
    }, []); // El array vacío asegura que solo se ejecute al montar y desmontar

    // El resto del componente `return` (Vistas) es el mismo que tenías
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Tracking Activado (Modo Bus)</Text>
            <Text>Mi ID de Bus: **{MY_BUS_ID}** (Envío cada {SEND_INTERVAL/1000}s)</Text>
            <Text>Cargando buses desde la API cada {FETCH_INTERVAL/1000}s</Text>
            
            <FlatList
                data={LocationBus}
                keyExtractor={item => item._id.toString()}
                renderItem={({ item }) => (
                    <View style={styles.busItem}>
                        <Text style={styles.busId}>🚌 ID: {item._id}</Text>
                        {/* Se asegura que last_location y coordinates existan antes de acceder */}
                        {item.last_location && item.last_location.coordinates && 
                            <Text>📍 Lat: {item.last_location.coordinates[1].toFixed(5)}, Lon: {item.last_location.coordinates[0].toFixed(5)}</Text>
                        }
                        <Text>⚡ Velocidad: {item.last_speed !== undefined ? item.last_speed.toFixed(1) : 'N/A'} km/h</Text>
                        <Text>⏱️ Visto: {item.last_seen ? new Date(item.last_seen).toLocaleTimeString() : 'N/A'}</Text>
                        <Text>✅ Estado: **{item.status || 'Desconocido'}**</Text>
                    </View>
                )}
                ListEmptyComponent={() => <Text style={styles.emptyText}>Esperando datos de buses...</Text>}
            />
            {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
// ... (Tus estilos se mantienen)
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        paddingTop: 50, // Pequeño ajuste para evitar la barra de estado
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    error: {
        color: 'red',
        marginTop: 15,
        textAlign: 'center'
    },
    busItem: {
        backgroundColor: '#f0f0f5', // Color ligeramente diferente
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        borderLeftWidth: 5,
        borderLeftColor: '#4CAF50', // Verde para indicar estado
    },
    busId: {
        fontWeight: 'bold',
        fontSize: 15,
        marginBottom: 5
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        color: '#666'
    }
});