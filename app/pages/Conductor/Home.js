import axios from 'axios';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View , FlatList} from 'react-native';

// --- ¡ASEGÚRATE QUE ESTA IP SEA LA DE TU PC! ---
const API_URL = 'http://192.168.100.2:3000/api/v1/track'; 
const MY_BUS_ID = 'BUS-101-PROTOTIPO';



export default function Home() {
    const [errorMsg, setErrorMsg] = useState(null);
    const [LocationBus, setLocationBus] = useState([])

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
            await axios.post(API_URL, payload, { timeout: 5000 });
            console.log("Enviado (Expo Go) OK");
        } catch (error) {
            console.error("Error al enviar ubicación:", error.message);
            setErrorMsg('Error de red al enviar. ¿API está corriendo?');
        }
    };
    const fetchBusLocations = async () => {
    try {
        const response = await fetch('http://192.168.100.2:3000/api/v1/status');
        const data = await response.json();
        
        if (response.ok) {
            console.log('Datos de ubicación recibidos:', data);
            // Aquí puedes actualizar el estado de tu componente con los datos
            return data;
        } else {
            console.error('Error del servidor:', data.error);
            return [];
        }
    } catch (error) {
        console.error('Error de conexión:', error);
        return [];
    }
    };
    useEffect(() => {
        let intervalId;
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permiso de ubicación denegado');
                return;
            }
            intervalId = setInterval(async () => {
                try {
                    let currentLocation = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.High,
                    });
                    await sendLocation(currentLocation);
                } catch (error) {
                    console.warn("Error obteniendo/enviando:", error);
                    setErrorMsg('Error de rastreo: ' + error.message);
                }
            }, 20000); // 20 segundos
        })();
        const getAndSetLocations = async () => {
            const data = await fetchBusLocations();
            setLocationBus(data);
        };
        return () => clearInterval(intervalId);
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Tracking Activado (Modo Expo Go)</Text>
            <Text>Enviando a: {API_URL}</Text>
            {/* --- FLATLIST para renderizar la data --- */}
                <FlatList
                    data={LocationBus}
                    keyExtractor={item => item._id.toString()} // Usa el _id de MongoDB como clave
                    renderItem={({ item }) => (
                        <View style={styles.busItem}>
                            <Text style={styles.busId}>🚌 ID: {item._id}</Text>
                            <Text>📍 Lat: {item.last_location.coordinates[1].toFixed(5)}, Lon: {item.last_location.coordinates[0].toFixed(5)}</Text>
                            <Text>⚡ Velocidad: {item.last_speed.toFixed(1)} km/h</Text>
                            <Text>⏱️ Visto: {new Date(item.last_seen).toLocaleTimeString()}</Text>
                            <Text>✅ Estado: **{item.status}**</Text>
                        </View>
                    )}
                    // Muestra algo si la lista está vacía
                    ListEmptyComponent={() => <Text style={styles.emptyText}>Esperando datos de buses...</Text>}
                />
            {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}
            
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    error: {
        color: 'red',
        marginTop: 15,
        textAlign: 'center'
    },
    listContainer: {
        flex: 1,
        width: '100%',
        marginTop: 20,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center'
    },
    busItem: {
        backgroundColor: '#f9f9f9',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        borderLeftWidth: 5,
        borderLeftColor: '#007AFF', // Azul de iOS
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
