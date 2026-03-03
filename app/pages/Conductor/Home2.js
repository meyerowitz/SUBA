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
const DRIVER_STATE_KEY = "@DriverState"; // Nueva clave para persistencia
const API_URL = "https://subapp-api.onrender.com/api";

export default function HomeConductor() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // --- ESTADOS DE LA UI NUEVA ---
  const [rutasDisponibles, setRutasDisponibles] = useState([]);
  const [rutaAsignada, setRutaAsignada] = useState(null);
  const [modalRutaVisible, setModalRutaVisible] = useState(false);
  const tasaDolar = 45.00;

  // --- ESTADOS DE RASTREO ---
  const [enLinea, setEnLinea] = useState(false);
  const [resumenHoy, setResumenHoy] = useState({ pasajeros: 0, totalBs: 0 });
  const [saldoTotal, setSaldoTotal] = useState(0.00);
  const [DriverName, setDriverName] = useState("");
  const [myLocation, setMyLocation] = useState(null);
  const [myRuta, setMyRuta] = useState(null);
  const [busId, setBusId] = useState("CARGANDO...");
  const [errorMsg, setErrorMsg] = useState(null); // Keep for debugging
  const [isConnecting, setIsConnecting] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const offlineTimeoutRef = useRef(null);

  // --- REFS PARA LÓGICA DE FONDO ---
  const mqttClientRef = useRef(null);
  const locationIntervalRef = useRef(null);
  const busIdRef = useRef(busId);
  const turnoActivoRef = useRef(false);

  // Mantener la referencia del ID actualizada
  useEffect(() => {
    busIdRef.current = busId;
  }, [busId]);

  const getSwitchTrackColor = () => {
    if (isConnecting) return "#FFD700"; // Yellow while blocking
    if (enLinea) return "#34C759";      // Green when active
    return "rgba(255,255,255,0.3)";     // Gray when off
  };

  // --- CARGA DE DATOS INICIALES ---
  useEffect(() => {
    const inicializar = async () => {
      await loadBusId();
      const username = await getusername();
      setDriverName(username);
      // Simulación de datos financieros
      setSaldoTotal(1250.50);
      setResumenHoy({ pasajeros: 24, totalBs: 480.00 });

      // Cargar Rutas de la API
      fetchRoutes();
    };
    inicializar();
  }, []);

  const fetchRoutes = async () => {
    try {
      const response = await fetch(`${API_URL}/rutas/activas`);
      const json = await response.json();
      if (json.success && json.data) {
        const mappedRoutes = json.data.map(r => ({
          id: r._id,
          name: r.name
        }));
        setRutasDisponibles(mappedRoutes);
      }
    } catch (e) {
      console.error("Error cargando rutas:", e);
      Alert.alert("Error", "No se pudieron cargar las rutas disponibles.");
    }
  };

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

  // --- GUARDAR ESTADO ---
  const persistirEstado = async (online, route) => {
    try {
      const stateToSave = JSON.stringify({ isOnline: online, route: route });
      await AsyncStorage.setItem(DRIVER_STATE_KEY, stateToSave);
    } catch (e) {
      console.error("Error guardando estado:", e);
    }
  };

  // --- FUNCIÓN: INICIAR TRANSMISIÓN ---
  const iniciarTurno = async () => {
    setIsConnecting(true);
    turnoActivoRef.current = true;

    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Error", "Se requieren permisos de ubicación.");
      setEnLinea(false);
      return;
    }

    let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

    if (!turnoActivoRef.current) return;

    setMyLocation(location.coords);

    let geocode = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    });

    if (!turnoActivoRef.current) return;

    if (geocode && geocode.length > 0) {
      const addr = geocode[0];
      const calle = addr.street;
      const sector = addr.district || addr.subregion;
      const ciud = addr.city;
      const codigo = addr.name;

      let direccionFinal = "";

      if (calle && !calle.includes('+')) {
        if (sector) {
          direccionFinal = calle + ", " + sector + ", " + ciud;
        } else {
          direccionFinal = calle + ", " + ciud;
        }
      } else if (sector) {
        direccionFinal = sector + ", " + ciud;
      } else {
        direccionFinal = codigo || "Ruta en movimiento";
      }

      setMyRuta(direccionFinal);
    }

    // Conexión MQTT
    const client = mqtt.connect("wss://3ef878324832459c8b966598a4c58112.s1.eu.hivemq.cloud:8884/mqtt", {
      username: "testeo",
      password: "123456Abc",
      clientId: `driver_${busIdRef.current}_${Date.now()}` // ClientID único para evitar desconexiones
    });

    mqttClientRef.current = client;

    client.on("connect", () => {
      console.log("✅ MQTT Conectado");
      setIsConnecting(false); // UNBLOCK
      setIsOffline(false);
      // Clear timeout if we were in the middle of a reconnection attempt
      if (offlineTimeoutRef.current) {
        clearTimeout(offlineTimeoutRef.current);
        offlineTimeoutRef.current = null;
      }
    });

    client.on("offline", () => {
      console.log("⚠️ MQTT Offline - Inicia temporizador de 120s");
      setIsOffline(true);

      // Start 120-second grace period before turning off the switch
      if (!offlineTimeoutRef.current) {
        offlineTimeoutRef.current = setTimeout(() => {
          console.log("❌ Tiempo de espera agotado, cerrando turno");
          setIsOffline(false);
          setIsConnecting(false);

          // 2. Clear the ref manually
          offlineTimeoutRef.current = null;

          // 3. Turn off the switch
          setEnLinea(false); Alert.alert("Conexión Perdida", "Se cerró el turno debido a la falta de internet.");
        }, 120000); // 120 seconds
      }
    });
    client.on("reconnect", () => {
      console.log("🔄 Intentando reconectar...");
      // setIsReconnecting(true);
    });
    locationIntervalRef.current = setInterval(async () => {
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
            status: "active",
            route_id: rutaAsignada?.id
          };
          mqttClientRef.current.publish("subapp/driver", JSON.stringify(payload), { qos: 0, retain: false });
          console.log("📤 Ubicación enviada");
        }
      } catch (e) {
        console.error("Error loop ubicación:", e);
      }
    }, 5000);
  };

  const detenerTurno = async () => {
    console.log("🛑 Deteniendo turno...");
    turnoActivoRef.current = false;

    if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    if (mqttClientRef.current) mqttClientRef.current.end();
    mqttClientRef.current = null;
    setMyRuta(null);
    setMyLocation(null);

    // Limpiar persistencia si se detiene explícitamente
    if (!enLinea) {
      await AsyncStorage.removeItem(DRIVER_STATE_KEY);
    }
  };

  useEffect(() => {
    if (enLinea) {
      iniciarTurno();
      persistirEstado(true, rutaAsignada); // Guardar que estamos activos
    } else {
      detenerTurno();
      // No borramos aquí para evitar borrado accidental al desmontar, 
      // la limpieza real se hace en handleToggleSwitch false
    }

    // Cleanup al desmontar el componente (solo visual, el background task muere con la app)
    return () => {
      // Opcional: Si quieres que siga en background real, necesitarías BackgroundTasks de Expo.
      // Por ahora, al desmontar, limpiamos referencias de memoria.
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
      if (mqttClientRef.current) mqttClientRef.current.end();
      turnoActivoRef.current = false;
    };
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
            setEnLinea(false);
            await AsyncStorage.multiRemove(['@Sesion_usuario', DRIVER_STATE_KEY]);
            router.replace('/Login');
          }
        }
      ]
    );
  }

  const handleToggleSwitch = (valorPropuesto) => {
    if (valorPropuesto) {
      setModalRutaVisible(true);
    } else {
      Alert.alert(
        "Finalizar Turno", "¿Estás seguro de que deseas desconectarte y dejar de cobrar?",
        [{ text: "Cancelar", style: "cancel" }, { text: "Desconectarse", style: "destructive", onPress: () => setEnLinea(false) }]
      );
    }
  };

  const confirmarRuta = (ruta) => {
    setRutaAsignada(ruta);
    setModalRutaVisible(false);
    setEnLinea(true);
    // El useEffect de [enLinea] se encargará de persistir y arrancar
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar backgroundColor="transparent" barStyle="light-content" translucent={true} />

      <View style={[styles.statusBarShield, { height: insets.top }]} />

      <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>

        {/* ENCABEZADO AZUL */}
        <View style={[styles.header, { paddingTop: insets.top + 15 }]}>
          <View style={styles.headerTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => router.push("./Profile")}>
                <Ionicons name="person-circle" size={55} color="white" />
              </TouchableOpacity>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.driverName}>Hola, {DriverName || "Conductor"}</Text>
                <Text style={styles.unitText}>Unidad: {busId.slice(-6).toUpperCase()}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleLogout} style={{ padding: 5 }}>
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

        {/* 3. REPORTES Y SOPORTE */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Soporte y Seguridad</Text>
          <TouchableOpacity
            style={[styles.statCard, { borderLeftColor: '#EF4444', flexDirection: 'row', alignItems: 'center', padding: 15 }]}
            onPress={() => router.push({
              pathname: "./DenunciarRuta",
              params: {
                routeId: rutaAsignada?.id,
                routeName: rutaAsignada?.name
              }
            })}
          >
            <View style={[styles.iconCircleSmall, { backgroundColor: '#FEE2E2', marginBottom: 0 }]}>
              <Ionicons name="warning" size={24} color="#EF4444" />
            </View>
            <View style={{ marginLeft: 15, flex: 1 }}>
              <Text style={{ fontWeight: 'bold', color: '#333', fontSize: 16 }}>Reportar Incidencia</Text>
              <Text style={{ fontSize: 12, color: '#666' }}>Vía cerrada, accidentes o desvíos</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>
        </View>

        {/* 4. OPCIONES DE COBRO */}
        {enLinea && (
          <View style={[styles.sectionContainer, { marginTop: 15 }]}>
            <Text style={styles.sectionTitleCenter}>Opciones de Cobro</Text>
            <View style={styles.paymentGrid}>
              <TouchableOpacity style={styles.paymentCard} onPress={() => router.push({ pathname: "/Components/GenerarQR", params: { routeId: '696afe10307f01a04976b326' } })}>
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
      <View style={[styles.floatingFooter, { bottom: 35 }]}>
        <Switch
          value={enLinea}
          onValueChange={handleToggleSwitch}
          // DISABLE while connecting, but keep enabled during background reconnections
          disabled={isConnecting}
          trackColor={{
            false: "rgba(255,255,255,0.3)",
            true: getSwitchTrackColor()
          }}
          thumbColor="#FFFFFF"
          style={{ transform: [{ scaleX: 1.4 }, { scaleY: 1.4 }], marginLeft: 10 }}
        />
        <View style={styles.switchTextContainer}>
          <Text style={[
            styles.switchTitle,
            { color: isConnecting ? '#FFD700' : (enLinea ? '#4ADE80' : '#FFFFFF') }
          ]}>
            {isConnecting ? "Conectando..." : (isOffline ? "Reconectando..." : (enLinea ? "Turno Activo" : "Turno Inactivo"))}
          </Text>
          <Text style={styles.switchSubtitle}>
            {isConnecting ? "Por favor espere..." : (isOffline ? "Señal débil, reintentando..." : (enLinea ? "Apaga al terminar tu jornada" : "Enciende para iniciar a cobrar"))}
          </Text>
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

            {rutasDisponibles.length === 0 ? (
              <Text style={{ textAlign: 'center', padding: 20, color: '#666' }}>Cargando rutas disponibles...</Text>
            ) : (
              rutasDisponibles.map((ruta) => (
                <TouchableOpacity key={ruta.id} style={styles.modalOption} onPress={() => confirmarRuta(ruta)}>
                  <Ionicons name="bus-outline" size={22} color="#003366" />
                  <Text style={styles.modalOptionText}>{ruta.name}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#CCC" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              ))
            )}
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
