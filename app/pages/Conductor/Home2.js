import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, StatusBar, Image } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createClient } from '@supabase/supabase-js';
import { getusername } from '../../Components/AsyncStorage';
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import mqtt from "mqtt";

const supabase = createClient('https://wkkdynuopaaxtzbchxgv.supabase.co', 'sb_publishable_S18aNBlyLP3-hV_mRMcehA_zbCDMSGP');

// Constante para el storage
const BUS_ID_KEY = "@MyBusId";

export default function HomeConductor() {
  const [enLinea, setEnLinea] = useState(false);
  const [resumenHoy, setResumenHoy] = useState({ pasajeros: 0, totalBs: 0 });
  const [saldoTotal, setSaldoTotal] = useState(0.00);
  const [DriverName, setDriverName] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const router = useRouter();

  // --- ESTADOS DE RASTREO ---
  const [myLocation, setMyLocation] = useState(null);
  const [myRuta, setMyRuta] = useState(null);
  const [busId, setBusId] = useState("CARGANDO...");
  const [errorMsg, setErrorMsg] = useState(null);

  // --- REFS PARA LÓGICA DE FONDO ---
  const mqttClientRef = useRef(null);
  const locationIntervalRef = useRef(null);
  const busIdRef = useRef(busId);

  // Mantener la referencia del ID actualizada para el intervalo
  useEffect(() => {
    busIdRef.current = busId;
  }, [busId]);

  // --- FUNCIÓN: CARGAR O GENERAR ID ---
  const loadBusId = async () => {
    let storedId = await AsyncStorage.getItem(BUS_ID_KEY);
    if (storedId) {
      setBusId(storedId);
      return storedId;
    }
    const newId = uuidv4();
    await AsyncStorage.setItem(BUS_ID_KEY, newId);
    setBusId(newId);
    return newId;
  };

  // --- FUNCIÓN: INICIAR TRANSMISIÓN ---
  const iniciarTurno = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Error", "Se requieren permisos de ubicación.");
      setEnLinea(false);
      return;
    }

    // 1. Obtener ubicación inicial y convertir a nombre de calle (solo una vez)
    let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setMyLocation(location.coords);

    let geocode = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    });

    if (geocode && geocode.length > 0) {
      const addr = geocode[0];
      
      // Creamos una jerarquía: 
      // 1. Calle (street)
      // 2. Barrio/Distrito (district/subregion)
      // 3. Si todo lo anterior falla, el código que ya conoces (name)
      
      const calle = addr.street;
      const sector = addr.district || addr.subregion;
      const ciud = addr.city;
      const codigo = addr.name;

      let direccionFinal = "";

      if (calle && !calle.includes('+')) { 
        // Si hay calle y no parece un código (no tiene el signo +)
        if(sector){
        direccionFinal = calle+", "+sector+", "+ciud;} 
        else{
          
          direccionFinal = calle+", "+ciud;
        }
      } else if (sector) {
        // Si la calle es nula o es un código, usamos el nombre del Barrio/Sector
        direccionFinal = sector+", "+ciud;
      } else {
        // Como último recurso, el código numérico
        direccionFinal = codigo || "Ruta en movimiento";
      }

      setMyRuta(direccionFinal);
    }

    const client = mqtt.connect("wss://3ef878324832459c8b966598a4c58112.s1.eu.hivemq.cloud:8884/mqtt", {
      username: "testeo",
      password: "123456Abc",
    });

    client.on("connect", () => {
      console.log("✅ MQTT Conectado");
      mqttClientRef.current = client;
    });


    // Intervalo de envío cada 5 segundos
    locationIntervalRef.current = setInterval(async () => {
      try {
        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          speed: loc.coords.speed || 0,
        };
        
        setMyLocation(coords);

        if (mqttClientRef.current?.connected) {
          const payload = {
            bus_id: busIdRef.current,
            latitude: coords.latitude,
            longitude: coords.longitude,
            speed: coords.speed,
            status: "active"
          };
          mqttClientRef.current.publish("subapp/driver", JSON.stringify(payload));
          console.log("📤 Ubicación enviada");
        }
      } catch (e) {
        console.error("Error obteniendo ubicación:", e);
      }
    }, 5000);
  };

  const detenerTurno = () => {
    if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    if (mqttClientRef.current) mqttClientRef.current.end();
    mqttClientRef.current = null;
    setMyRuta(null); // <--- Agrega esto
    setMyLocation(null);
    console.log("🛑 Turno finalizado");
  };

  // --- EFECTOS ---
  useEffect(() => {
    const loadSession = async () => {
      const sessionData = await AsyncStorage.getItem('@Sesion_usuario');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        setDriverName(session.fullName || session.name || "Conductor");
        if (session.profilePictureUrl) {
          setProfileImage(session.profilePictureUrl);
        }
      }
    };
    loadBusId();
    loadSession();
    setSaldoTotal(1250.50);
    setResumenHoy({ pasajeros: 24, totalBs: 480.00 });
  }, []);

  useEffect(() => {
    if (enLinea) {
      iniciarTurno();
    } else {
      detenerTurno();
    }
    return () => detenerTurno();
  }, [enLinea]);

    const handleLogout = () => {
  Alert.alert(
    "Cerrar Sesión",
    "¿Estás segura de que quieres salir?",
    [
      { text: "Cancelar", style: "cancel" },
      { 
        text: "Sí, salir", 
        onPress: async () => {
          await AsyncStorage.removeItem('@Sesion_usuario');
          router.replace('/Login');
        } 
      }
    ]
  );}

  return (
    <SafeAreaView style={styles.mainContainer}>
       <StatusBar  backgroundColor='#003366' barStyle="ligth-content"></StatusBar>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        
        {/* HEADER CONDUCTOR */}
        <View style={styles.headerConductor}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: -40 }}>
            <TouchableOpacity onPress={() => router.push("./Profile")}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={{ width: 45, height: 45, borderRadius: 22.5 }} />
              ) : (
                <Ionicons name="person-circle-outline" size={45} color="white" />
              )}
            </TouchableOpacity>
            
            <View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{enLinea ? "ONLINE" : "OFFLINE"}</Text>
                <Switch 
                  value={enLinea} 
                  onValueChange={setEnLinea}
                  trackColor={{ false: "#767577", true: "#34C759" }}
                />
              </View>
              
              {/* ID DEL DISPOSITIVO */}
              <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold', marginLeft: 15, marginTop: 5 }}>
                Operador: {busId.slice(-6)}
              </Text>
              
              {/* COORDENADAS EN TIEMPO REAL */}
              <Text style={{ color: "#767577", fontSize: 9, fontWeight: 'bold', marginLeft: 15 }}>
                Lat: {myLocation ? myLocation.latitude.toFixed(6) : "---"} Long: {myLocation ? myLocation.longitude.toFixed(6) : "---"}
              </Text>
            </View>
          </View>
          
          <View style={styles.welcomeContainer}>
            <Text style={styles.driverName}>Hola, {DriverName || "Conductor"}</Text>
            <Text style={styles.unitText}>Unidad: #104 - {myRuta || (enLinea ? "Obteniendo calle..." : "En espera")}</Text>
          </View>
        </View>

        {/* ... Resto de tus componentes (Métricas, Saldo, Acciones) se mantienen igual ... */}
        
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { borderLeftColor: '#34C759', borderLeftWidth: 5 }]}>
            <Text style={styles.statLabel}>Pasajeros Hoy</Text>
            <Text style={styles.statValue}>{resumenHoy.pasajeros}</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#007AFF', borderLeftWidth: 5 }]}>
            <Text style={styles.statLabel}>Recaudado Hoy</Text>
            <Text style={styles.statValue}>Bs. {resumenHoy.totalBs}</Text>
          </View>
        </View>

        <View style={styles.mainBalanceCard}>
          <View>
            <Text style={styles.mainBalanceLabel}>Saldo Acumulado</Text>
            <Text style={styles.mainBalanceValue}>Bs. {saldoTotal.toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={styles.withdrawBtn}>
            <Feather name="arrow-up-right" size={20} color="#003366" />
          </TouchableOpacity>
        </View>

        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push("/Components/GenerarQR")}>
            <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="qr-code" size={30} color="#007AFF" />
            </View>
            <Text style={styles.actionTitle}>Mi QR Pago</Text>
            <Text style={styles.actionDesc}>Mostrar para cobrar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push("./WebMap")}>
            <View style={[styles.iconCircle, { backgroundColor: '#F1F8E9' }]}>
              <Ionicons name="map" size={30} color="#34C759" />
            </View>
            <Text style={styles.actionTitle}>Iniciar Ruta</Text>
            <Text style={styles.actionDesc}>Ver mapa y paradas</Text>
          </TouchableOpacity>
        </View>
  
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F4F7FA' },
  headerConductor: {
    backgroundColor: '#003366',
    padding: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 50,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    paddingHorizontal: 10, 
    borderRadius: 20 
  },
  statusText: { color: 'white', fontSize: 12, fontWeight: 'bold', marginRight: 10 },
  driverName: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 20 },
  unitText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  statsContainer: { flexDirection: 'row', padding: 20, justifyContent: 'space-between' },
  statCard: { backgroundColor: 'white', width: '48%', padding: 15, borderRadius: 12, elevation: 3 },
  statLabel: { fontSize: 12, color: '#666' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  mainBalanceCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
  },
  mainBalanceLabel: { color: '#666', fontSize: 14 },
  mainBalanceValue: { fontSize: 28, fontWeight: 'bold', color: '#003366' },
  withdrawBtn: { backgroundColor: '#E3F2FD', padding: 10, borderRadius: 12 },
  actionGrid: { flexDirection: 'row', padding: 20, justifyContent: 'space-between' },
  actionCard: { backgroundColor: 'white', width: '48%', padding: 20, borderRadius: 20, alignItems: 'center', elevation: 2 },
  iconCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  actionTitle: { fontWeight: 'bold', color: '#333' },
  actionDesc: { fontSize: 10, color: '#999', textAlign: 'center' },
  recentSection: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  transactionItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'white', 
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 10 
  },
  transUser: { fontWeight: '600', color: '#333' },
  transTime: { fontSize: 12, color: '#999' },
  transAmount: { fontWeight: 'bold', color: '#34C759' },

  // --- SWITCH Y ESTADO ---
  switchContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 8,
    borderRadius: 15,
  },
  switchLabel: {
    color: 'white',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30', // Rojo cuando está desconectado
    marginRight: 10,
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    // Efecto de brillo (solo iOS, en Android se usa elevation)
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  liveText: {
    color: 'white',
    fontSize: 13,
    fontFamily: 'monospace', // Estilo técnico para coordenadas
  },
});