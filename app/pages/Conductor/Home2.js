import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, StatusBar, Modal, Switch, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6'; 
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

// 🚌 RUTAS (Para la UI de cobro)
const RUTAS_DISPONIBLES = [
  { id: "route_av_c8", name: "Alta Vista - Core 8" },
  { id: "route_sf_po", name: "San Félix - Puerto Ordaz" },
  { id: "route_ct_un", name: "Castillito - Unare" },
  { id: "route_ud_ce", name: "UD-338 - Centro" }
];

export default function HomeConductor() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // --- ESTADOS DE LA UI NUEVA ---
  const [rutaAsignada, setRutaAsignada] = useState(null); 
  const [modalRutaVisible, setModalRutaVisible] = useState(false);
  const tasaDolar = 45.00;

  // --- ESTADOS DE RASTREO (TUS ESTADOS ORIGINALES) ---
  const [enLinea, setEnLinea] = useState(false);
  const [resumenHoy, setResumenHoy] = useState({ pasajeros: 0, totalBs: 0 });
  const [saldoTotal, setSaldoTotal] = useState(0.00);
  const [DriverName, setDriverName] = useState("");
  const [myLocation, setMyLocation] = useState(null);
  const [myRuta, setMyRuta] = useState(null);
  const [busId, setBusId] = useState("CARGANDO...");
  const [errorMsg, setErrorMsg] = useState(null);

  // --- REFS PARA LÓGICA DE FONDO (TUS REFS ORIGINALES) ---
  const mqttClientRef = useRef(null);
  const locationIntervalRef = useRef(null);
  const busIdRef = useRef(busId);
  const turnoActivoRef = useRef(false); // 💡 NUESTRA BANDERA

  // Mantener la referencia del ID actualizada para el intervalo
  useEffect(() => {
    busIdRef.current = busId;
  }, [busId]);

  // --- FUNCIÓN: CARGAR O GENERAR ID (TU FUNCIÓN ORIGINAL) ---
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
    turnoActivoRef.current = true; // 💡 Levantamos la bandera de turno activo

    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Error", "Se requieren permisos de ubicación.");
      setEnLinea(false);
      return;
    }

    // El GPS tarda un segundo aquí...
    let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    
    // 💡 FRENO 1: ¿Te fuiste al mapa o cerraste sesión mientras el GPS cargaba?
    if (!turnoActivoRef.current) return; 

    setMyLocation(location.coords);

    let geocode = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    });

    // 💡 FRENO 2: ¿Te saliste mientras calculaba la calle?
    if (!turnoActivoRef.current) return;

    if (geocode && geocode.length > 0) {
      const addr = geocode[0];
      const calle = addr.street;
      const sector = addr.district || addr.subregion;
      const ciud = addr.city;
      const codigo = addr.name;

      let direccionFinal = "";

      if (calle && !calle.includes('+')) { 
        if(sector){
          direccionFinal = calle+", "+sector+", "+ciud;
        } else {
          direccionFinal = calle+", "+ciud;
        }
      } else if (sector) {
        direccionFinal = sector+", "+ciud;
      } else {
        direccionFinal = codigo || "Ruta en movimiento";
      }

      setMyRuta(direccionFinal);
    }

    const client = mqtt.connect("wss://3ef878324832459c8b966598a4c58112.s1.eu.hivemq.cloud:8884/mqtt", {
      username: "testeo",
      password: "123456Abc",
    });

    client.on("connect", () => {
      // 💡 FRENO 3: Evitar conexión tardía
      if (!turnoActivoRef.current) { client.end(); return; } 
      console.log("✅ MQTT Conectado");
      mqttClientRef.current = client;
    });

    // Intervalo de envío cada 5 segundos
    locationIntervalRef.current = setInterval(async () => {
      // 💡 AUTO-DESTRUCCIÓN: Si el turno ya no está activo, matamos el bucle desde adentro
      if (!turnoActivoRef.current) {
        clearInterval(locationIntervalRef.current);
        return;
      }

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
    turnoActivoRef.current = false; // 💡 Bajamos la bandera para abortar todo
    
    if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    if (mqttClientRef.current) mqttClientRef.current.end();
    mqttClientRef.current = null;
    setMyRuta(null); 
    setMyLocation(null);
    console.log("🛑 Turno finalizado");
  };

  // --- EFECTOS ORIGINALES ---
  useEffect(() => {
    loadBusId();
    const username = getusername();
    setDriverName(username);
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
    );
  }

  // --- LÓGICA DEL SWITCH FLOTANTE NUEVO ---
  const handleToggleSwitch = (valorPropuesto) => {
    if (valorPropuesto) {
      setModalRutaVisible(true);
    } else {
      Alert.alert(
        "Finalizar Turno", "¿Estás seguro de que deseas desconectarte y dejar de cobrar?", 
        [ { text: "Cancelar", style: "cancel" }, { text: "Desconectarse", style: "destructive", onPress: () => setEnLinea(false) } ]
      );
    }
  };

  const confirmarRuta = (ruta) => {
    setRutaAsignada(ruta); setModalRutaVisible(false); setEnLinea(true);
  };

  // ==========================================
  // 🎨 UI (DISEÑO NUEVO)
  // ==========================================
  return (
    <View style={styles.mainContainer}>
      <StatusBar backgroundColor="transparent" barStyle="light-content" translucent={true} />
      
      <View style={[styles.statusBarShield, { height: insets.top }]} />

      <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
        
        {/* ENCABEZADO AZUL */}
        <View style={[styles.header, { paddingTop: insets.top + 15 }]}>
          <View style={styles.headerTop}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <TouchableOpacity onPress={() => router.push("./Profile")}>
                <Ionicons name="person-circle" size={55} color="white" />
              </TouchableOpacity>
              <View style={{marginLeft: 12}}>
                <Text style={styles.driverName}>Hola, {DriverName || "Conductor"}</Text>
                <Text style={styles.unitText}>Unidad: {busId.slice(-6).toUpperCase()}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleLogout} style={{padding: 5}}>
              <Ionicons name="log-out-outline" size={28} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerInfoBox}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={styles.gpsRow}>
                <Ionicons name="location" size={14} color="#4ADE80" />
                <Text style={styles.gpsText} numberOfLines={1}>
                  {myRuta || (enLinea ? "Ubicando..." : "Turno Inactivo")}
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.routePill}
                onPress={() => enLinea ? setModalRutaVisible(true) : alert("Inicia tu turno para cambiar la ruta.")}
              >
                <Ionicons name="bus" size={14} color="#003366" />
                <Text style={styles.routePillText} numberOfLines={1}>
                  {rutaAsignada ? rutaAsignada.name : "Ruta no asignada"}
                </Text>
                {enLinea && <Ionicons name="chevron-down" size={14} color="#003366" />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.mapButton} onPress={() => router.push("./WebMap")}>
              <Ionicons name="map-outline" size={24} color="#FFFFFF" />
              <Text style={styles.mapButtonText}>Mapa</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 1. ESTADÍSTICAS */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Resumen del Día</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { borderLeftColor: '#FF9500' }]}>
              <Text style={styles.statLabel}>Pasajeros</Text>
              <Text style={styles.statValue}>{resumenHoy.pasajeros}</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: '#34C759' }]}>
              <Text style={styles.statLabel}>Recaudado</Text>
              <Text style={styles.statValue}>Bs. {resumenHoy.totalBs.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* 2. MI BILLETERA */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Mi Billetera</Text>
          <View style={styles.walletCard}>
            <View style={styles.walletInfo}>
              <Text style={styles.walletSubtitle}>SALDO DISPONIBLE</Text>
              <Text style={styles.walletBalance}>Bs. {saldoTotal.toFixed(2)}</Text>
              <Text style={styles.walletUsd}>$ ~ {(saldoTotal / tasaDolar).toFixed(2)} USD</Text>
            </View>

            <TouchableOpacity style={styles.walletBtn} onPress={() => alert("Abriendo historial y retiros...")}>
              <FontAwesome6 name="money-bill-transfer" size={20} color="#003366" />
              <Text style={styles.walletBtnText}>Gestionar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. OPCIONES DE COBRO */}
        {enLinea && (
          <View style={[styles.sectionContainer, { marginTop: 15 }]}>
            <Text style={styles.sectionTitleCenter}>Opciones de Cobro</Text>
            <View style={styles.paymentGrid}>
              <TouchableOpacity style={styles.paymentCard} onPress={() => router.push({ pathname: "/Components/GenerarQR", params: { routeId: rutaAsignada?.id } })}>
                <View style={[styles.iconCircleSmall, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="qr-code" size={24} color="#007AFF" />
                </View>
                <Text style={styles.paymentTitle}>Código QR</Text>
                <Text style={styles.paymentDesc}>Pasajero escanea</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.paymentCard} onPress={() => alert("Abriendo Lector NFC...")}>
                <View style={[styles.iconCircleSmall, { backgroundColor: '#F3E5F5' }]}>
                  <Ionicons name="radio" size={24} color="#9C27B0" />
                </View>
                <Text style={styles.paymentTitle}>Tarjeta NFC</Text>
                <Text style={styles.paymentDesc}>Cobro por contacto</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* PANEL FLOTANTE EN AZUL OSCURO */}
      <View style={[styles.floatingFooter, { bottom: Platform.OS === 'ios' ? insets.bottom + 20 : 35 }]}>
        <Switch 
          value={enLinea} onValueChange={handleToggleSwitch}
          trackColor={{ false: "rgba(255,255,255,0.3)", true: "#34C759" }} thumbColor="#FFFFFF"
          style={{ transform: [{ scaleX: 1.4 }, { scaleY: 1.4 }], marginLeft: 10 }} 
        />
        <View style={styles.switchTextContainer}>
          <Text style={[styles.switchTitle, { color: enLinea ? '#4ADE80' : '#FFFFFF' }]}>{enLinea ? "Turno Activo" : "Turno Inactivo"}</Text>
          <Text style={styles.switchSubtitle}>{enLinea ? "Apaga al terminar tu jornada" : "Enciende para iniciar a cobrar"}</Text>
        </View>
      </View>

      {/* MODAL DE RUTAS */}
      <Modal visible={modalRutaVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>¿Qué ruta vas a cubrir?</Text>
              <TouchableOpacity onPress={() => { setModalRutaVisible(false); if (!rutaAsignada) setEnLinea(false); }}>
                <Ionicons name="close-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>
            {RUTAS_DISPONIBLES.map((ruta) => (
              <TouchableOpacity key={ruta.id} style={styles.modalOption} onPress={() => confirmarRuta(ruta)}>
                <Ionicons name="bus-outline" size={22} color="#003366" />
                <Text style={styles.modalOptionText}>{ruta.name}</Text>
                <Ionicons name="chevron-forward" size={18} color="#CCC" style={{marginLeft: 'auto'}} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F4F7FA' },
  
  statusBarShield: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#003366', zIndex: 9999 },
  
  header: { backgroundColor: '#003366', paddingHorizontal: 25, paddingBottom: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  driverName: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  unitText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  
  headerInfoBox: { marginTop: 20, backgroundColor: 'rgba(0,0,0,0.2)', padding: 15, borderRadius: 15, flexDirection: 'row', alignItems: 'center' },
  gpsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  gpsText: { color: '#4ADE80', fontSize: 13, fontWeight: '600', marginLeft: 8, flex: 1 },
  routePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  routePillText: { fontSize: 14, fontWeight: 'bold', color: '#003366', flex: 1, marginLeft: 8 },
  mapButton: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 10, width: 75 },
  mapButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold', marginTop: 4 },

  sectionContainer: { marginTop: 20, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#003366', marginBottom: 12 },
  sectionTitleCenter: { fontSize: 15, fontWeight: 'bold', color: '#999', textAlign: 'center', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },

  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  statCard: { backgroundColor: 'white', flex: 1, padding: 12, borderRadius: 12, borderLeftWidth: 4, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, marginHorizontal: 5 },
  statLabel: { fontSize: 11, color: '#666', marginBottom: 2 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },

  walletCard: { backgroundColor: '#003366', padding: 25, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 6, shadowColor: '#003366', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  walletInfo: { flex: 1 },
  walletSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginBottom: 5 },
  walletBalance: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 5 },
  walletUsd: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  walletBtn: { backgroundColor: '#FFFFFF', width: 75, height: 75, borderRadius: 40, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  walletBtnText: { color: '#003366', fontSize: 11, fontWeight: 'bold', marginTop: 5 },

  paymentGrid: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 5 },
  paymentCard: { backgroundColor: '#FFFFFF', width: '48%', padding: 15, borderRadius: 18, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  iconCircleSmall: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  paymentTitle: { fontWeight: 'bold', color: '#333', fontSize: 14 },
  paymentDesc: { fontSize: 11, color: '#999', textAlign: 'center', marginTop: 2 },

  floatingFooter: { position: 'absolute', left: 20, right: 20, backgroundColor: '#003366', borderRadius: 24, paddingVertical: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', elevation: 15, shadowColor: '#003366', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15 },
  switchTextContainer: { marginLeft: 25, flex: 1 },
  switchTitle: { fontSize: 18, fontWeight: 'bold' },
  switchSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#003366' },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalOptionText: { fontSize: 16, color: '#333', marginLeft: 15, fontWeight: '600' }
});