import React, { useState, useEffect , useRef} from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Switch,StatusBar } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createClient } from '@supabase/supabase-js';
import {getuserid,getusername} from '../../Components/AsyncStorage';
import * as Location from "expo-location";

import AsyncStorage from "@react-native-async-storage/async-storage";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import mqtt from "mqtt";

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL , process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

export default function HomeConductor() {
  const [enLinea, setEnLinea] = useState(false);
  const [resumenHoy, setResumenHoy] = useState({ pasajeros: 0, totalBs: 0 });
  const [saldoTotal, setSaldoTotal] = useState(0.00);
  const [DriverName, setDriverName] =useState("");
  const router = useRouter();


  const [errorMsg, setErrorMsg] = useState(null);
  const [myLocation, setMyLocation] = useState(null);
  const [busId, setBusId] = useState("CARGANDO...");
  

 
  // --- ESTADOS ---
  const [ubicacionText, setUbicacionText] = useState("Desconectado");
  const [saldo, setSaldo] = useState(0.0);
  
  // --- REFS PARA LÓGICA DE FONDO ---
  const mqttClientRef = useRef(null);
  const locationIntervalRef = useRef(null);
  // Usamos useRef para acceder a los valores más recientes dentro de setInterval
    const myLocationRef = useRef(myLocation);
    const busIdRef = useRef(busId);

  // --- FUNCIÓN: INICIAR TRANSMISIÓN (MQTT + GPS) ---
  const iniciarTurno = async () => {
    // 1. Pedir permisos
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Error", "Se requieren permisos de ubicación para trabajar.");
      setEnLinea(false);
      return;
    }

    // 2. Conectar MQTT
    const client = mqtt.connect("wss://3ef878324832459c8b966598a4c58112.s1.eu.hivemq.cloud:8884/mqtt", {
      username: "testeo",
      password: "123456Abc",
    });

    client.on("connect", () => {
      console.log("✅ MQTT Conectado");
      mqttClientRef.current = client;
    });

    // 3. Iniciar bucle de ubicación
    locationIntervalRef.current = setInterval(async () => {
      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      myLocationRef.current = loc.coords;
      setUbicacionText(`${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);

      if (mqttClientRef.current?.connected) {
        const payload = {
          bus_id: busId,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          speed: loc.coords.speed || 0,
          status: "active"
        };
        mqttClientRef.current.publish("subapp/driver", JSON.stringify(payload));
      }
    }, 5000); // Cada 5 segundos
  };

  // --- FUNCIÓN: DETENER TODO ---
  const detenerTurno = () => {
    if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    if (mqttClientRef.current) mqttClientRef.current.end();
    mqttClientRef.current = null;
    setUbicacionText("Desconectado");
    console.log("🛑 Turno finalizado");
  };

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
  // --- EFECTO DEL SWITCH ---
  useEffect(() => {
    if (enLinea) {
      iniciarTurno();
    } else {
      detenerTurno();
    }
    return () => detenerTurno(); // Limpieza al salir
  }, [enLinea]);
  //----UseEffects cargar ubicacion del bus----
    useEffect(() => {
      (async () => {
        let test = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        });
        const newCoords = {
          latitude: test.coords.latitude,
          longitude: test.coords.longitude,
          speed: test.coords.speed || 0, // Asegura que 'speed' exista
        };
        setMyLocation(newCoords);
      })();
  
      myLocationRef.current = myLocation;
      busIdRef.current = busId;
    }, [myLocation, busId]);
    
  useEffect(() => {
    // Aquí llamarías a tus funciones de Supabase como 'obtenerSaldoReal'
    const username = getusername();
    setDriverName(username);
    setSaldoTotal(1250.50); 
    setResumenHoy({ pasajeros: 24, totalBs: 480.00 });
  }, []);

  return (
    <SafeAreaView style={styles.mainContainer}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        
        {/* HEADER CONDUCTOR */}
        <View style={styles.headerConductor}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between',marginBottom:-40 }}>
            <TouchableOpacity onPress={() => router.push("./Profile")}>
              <Ionicons name="person-circle-outline" size={45} color="white" />
            </TouchableOpacity>
            <View style={{}}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{enLinea ? "EN RUTA" : "DESCONECTADO"}</Text>
              <Switch 
                value={enLinea} 
                onValueChange={setEnLinea}
                trackColor={{ false: "#767577", true: "#34C759" }}
              />
              
            </View>
                <Text style={{color: 'white', fontSize: 10, fontWeight: 'bold', marginLeft:45}}>Operador: {busId}</Text>
                <Text style={{color: 'white', fontSize: 8, fontWeight: 'bold', marginLeft:50 , color:"#767577"}}>Lat: {busId} Long:</Text>
                
            </View>
          </View>
          
          <View style={styles.welcomeContainer}>
            <Text style={styles.driverName}>Hola,{DriverName !== "" ? DriverName : "undefined"}</Text>
            <Text style={styles.unitText}>Unidad: #104 - Ruta Troncal 1</Text>
          </View>
        </View>

        {/* TARJETAS DE MÉTRICAS RÁPIDAS */}
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

        {/* SALDO PRINCIPAL */}
        <View style={styles.mainBalanceCard}>
          <View>
            <Text style={styles.mainBalanceLabel}>Saldo Acumulado</Text>
            <Text style={styles.mainBalanceValue}>Bs. {saldoTotal.toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={styles.withdrawBtn}>
            <Feather name="arrow-up-right" size={20} color="#003366" />
          </TouchableOpacity>
        </View>

        {/* SECCIÓN DE ACCIONES */}
        <View style={styles.actionGrid}>
          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push("./GenerarQR")} // Aquí iría tu vista de QR
          >
            <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="qr-code" size={30} color="#007AFF" />
            </View>
            <Text style={styles.actionTitle}>Mi QR Pago</Text>
            <Text style={styles.actionDesc}>Mostrar para cobrar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push("./MapaRuta")}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#F1F8E9' }]}>
              <Ionicons name="map" size={30} color="#34C759" />
            </View>
            <Text style={styles.actionTitle}>Iniciar Ruta</Text>
            <Text style={styles.actionDesc}>Ver mapa y paradas</Text>
          </TouchableOpacity>
        </View>

        {/* ÚLTIMOS MOVIMIENTOS */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Últimos Cobros</Text>
          {/* Mapear transacciones de Supabase aquí */}
          <View style={styles.transactionItem}>
            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.transUser}>Usuario #4521</Text>
              <Text style={styles.transTime}>Hace 2 min</Text>
            </View>
            <Text style={styles.transAmount}>+ Bs. 20.00</Text>
          </View>
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