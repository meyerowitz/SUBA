import React, { useState, useEffect } from "react";
import {
  StyleSheet, Text, View,TouchableOpacity,Modal,Alert,Image,TextInput,ScrollView,StatusBar,ActivityIndicator,Pressable,Platform,FlatList
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../Components/Temas_y_colores/ThemeContext";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

// Configuración de Supabase
const supabase = createClient(
  "https://wkkdynuopaaxtzbchxgv.supabase.co",
  "sb_publishable_S18aNBlyLP3-hV_mRMcehA_zbCDMSGP",
);

 const API_URL = "https://subapp-api.onrender.com";

  const transactionConfig = {
  recarga: { color: '#4CAF50', label: 'Recarga (+)' },
  transferencia: { color: '#2196F3', label: 'Transferencia' },
  retiro: { color: '#F44336', label: 'Retiro (-)' },
};
const STATUS_THEME = {
  pendiente: { color: '#EAB308', bg: '#FEF9C3', icon: 'clock-outline', label: 'Pendiente' },
  aprobado: { color: '#22C55E', bg: '#DCFCE7', icon: 'check-circle-outline', label: 'Aprobado' },
  rechazado: { color: '#EF4444', bg: '#FEE2E2', icon: 'close-circle-outline', label: 'Rechazado' },
  completado: { color: '#3B82F6', bg: '#DBEAFE', icon: 'cached', label: 'Procesado' },
};

const TYPE_LABELS = {
  recarga: { label: 'Recarga de Saldo', icon: 'wallet-plus-outline' },
  transferencia: { label: 'Transferencia', icon: 'swap-horizontal' },
  retiro: { label: 'Retiro de Fondos', icon: 'bank-transfer-out' },
};

export default function WalletScreen() {
  // --- ESTADOS DE LOGICA (ORIGINALES) ---
  const [operaciones, setOperaciones] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [userName, setUserName] = useState("...");
  
  // Modals Antiguos
  const [modalVisible, setModalVisible] = useState(false); // Recarga
  const [step, setStep] = useState(1);
  const [image, setImage] = useState(null);
  const [saldo, setSaldo] = useState(0.0);
  const [referencia, setReferencia] = useState("");
  const [montoInput, setMontoInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const { theme } = useTheme();

  // Transferencia Interna
  const [modalTransferVisible, setModalTransferVisible] = useState(false);
  const [destinatarioID, setDestinatarioID] = useState("");
  const [montoTransferir, setMontoTransferir] = useState("");
  const [nombreDestinatario, setNombreDestinatario] = useState(null);

  // --- ESTADOS DE UI (NUEVOS) ---
  const [seccionAbierta, setSeccionAbierta] = useState(null);
  const [modalDineroVisible, setModalDineroVisible] = useState(false); // Bottom Sheet
  
  // Datos simulados o fijos
  const tasaDolar = 45.00; // Puedes traer esto de una API si quieres
  const estadoTarjetaFisica = 'SIN_TARJETA'; // 'SIN_TARJETA' | 'APROBADA' | 'VINCULADA'

  const [pasajeros, setPasajeros] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [monto, setMonto] = useState('');
  const [enviando, setEnviando] = useState(false);

  const router = useRouter();

  const datosBancarios = {
    banco: "Banco de Venezuela",
    telefono: "04128695918",
    identidad: "V-30366440",
  };

  // Cargar los primeros pasajeros al abrir el modal
useEffect(() => {
  const fetchPasajeros = async () => {
  try {
    const sessionString = await AsyncStorage.getItem('@Sesion_usuario');
    const token = JSON.parse(sessionString)?.token;

    const response = await fetch('https://subapp-api.onrender.com/api/pasajeros?limit=15', {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const result = await response.json();
    
    if (result && result.passengers) {
      // Usamos .slice(0, 5) para tomar solo los primeros 5
      setPasajeros(result.passengers.slice(0, 5));
    } else {
      setPasajeros([]);
    }
  } catch (e) {
    console.log("Error cargando pasajeros:", e);
    setPasajeros([]);
  }
};
  fetchPasajeros();
}, []);
  // --- EFECTOS ---
  useEffect(() => {
    const inicializar = async () => {
      const nombre = await getusername();
      setUserName(nombre || "Usuario");
      await obtenerSaldoReal();
      await cargarHistorial();
    };
    inicializar();
  }, []);

  useEffect(() => {
    // Simulación de búsqueda de usuario
    if (destinatarioID.length >= 5) {
        // Aquí podrías hacer un fetch real a supabase para buscar el nombre
        // Por ahora mantenemos la lógica local si existe, o simulada
        if (destinatarioID === "12345") setNombreDestinatario("Juan Pérez");
        else if (destinatarioID === "67890") setNombreDestinatario("María García");
        else setNombreDestinatario("Usuario SUBA");
    } else {
      setNombreDestinatario(null);
    }
  }, [destinatarioID]);

  // --- FUNCIONES DE LÓGICA ---
  const getuserid = async () => {
    const session = await AsyncStorage.getItem("@Sesion_usuario");
    if (!session) return null;
    return JSON.parse(session)._id;
  };

  const getusername = async () => {
    const session = await AsyncStorage.getItem("@Sesion_usuario");
    if (!session) return "";
    return JSON.parse(session).fullName;
  };

   const obtenerSaldoReal = async () => {
  try {
    // 1. Recuperamos el token de la sesión que arreglamos antes
    const sessionString = await AsyncStorage.getItem('@Sesion_usuario');
    if (!sessionString) return;
    
    const session = JSON.parse(sessionString);
    const token = session.token;

    if (!token) {
      console.log("No hay token disponible para consultar el saldo");
      return;
    }

    const API_URL = "https://subapp-api.onrender.com";

    // 2. Llamada al nuevo endpoint
    const response = await fetch(`${API_URL}/api/billetera/saldo`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` // 🔑 Indispensable para rutas protegidas
      },
    });

    const result = await response.json();

    // 3. Según tu captura, la respuesta es { "success": true, "data": { "saldo": 0 } }
    if (result.success && result.data) {
      setSaldo(result.data.saldo);
    } else {
      setSaldo(0.00);
    }

  } catch (error) {
    console.log("Error saldo API:", error);
    setSaldo(0.00);
  }
  };
  const cargarHistorial = async () => {
  try {
    setCargandoHistorial(true);
    
    // 1. Extraer ID real de la sesión
    const sessionString = await AsyncStorage.getItem('@Sesion_usuario');
    const session = JSON.parse(sessionString);
    
    // IMPORTANTE: Verifica si en tu sesión el ID viene como 'id', '_id' o 'userId'
    const myUserId = session?.user?._id || session?.user?.id || session?._id || session?.id;
    const token = session?.token;

    if (!myUserId || !token) {
      console.error("Sesión inválida");
      return;
    }

    const URL_HISTORIAL = `https://subapp-api.onrender.com/api/billetera/historial?userId=${myUserId}&limit=50`;
    const URL_VALIDACIONES = `https://subapp-api.onrender.com/api/billetera/validaciones?userId=${myUserId}`;

    // 2. Ejecutar peticiones en paralelo
    const [resHistorial, resValidaciones] = await Promise.all([
      fetch(URL_HISTORIAL, { headers: { "Authorization": `Bearer ${token}` } }),
      fetch(URL_VALIDACIONES, { headers: { "Authorization": `Bearer ${token}` } })
    ]);

    const dataHistorial = await resHistorial.json();
    const dataValidaciones = await resValidaciones.json();

    // 3. Procesar Historial (Solo lo que coincida con mi ID)
    const historialRaw = dataHistorial.data || [];
    const historialFiltrado = historialRaw
      .filter(tx => tx.userId === myUserId) // Filtro de seguridad manual
      .map(tx => ({
        ...tx,
        status: 'aprobado',
        esHistorial: true,
        fecha: new Date(tx.createdAt)
      }));

    // 4. Procesar Validaciones (Pendientes/Rechazadas de mi ID)
    const validacionesRaw = dataValidaciones.data || dataValidaciones.validation || [];
    const validacionesFiltradas = (Array.isArray(validacionesRaw) ? validacionesRaw : [])
      .filter(v => v.userId === myUserId && v.status !== 'aprobado') // Solo mías y no aprobadas
      .map(v => ({
        _id: v._id,
        amount: v.monto,
        type: v.type,
        status: v.status,
        createdAt: v.createdAt,
        banco: v.banco,
        referencia: v.referenciaPago,
        esHistorial: false,
        fecha: new Date(v.createdAt)
      }));

    // 5. Unir y Ordenar por fecha (descendente)
    const totalOperaciones = [...validacionesFiltradas, ...historialFiltrado].sort(
      (a, b) => b.fecha - a.fecha
    );

    console.log(`✅ Mostrando ${totalOperaciones.length} operaciones para el usuario: ${myUserId}`);
    
    setOperaciones(totalOperaciones);

  } catch (error) {
    console.log("Error en el filtrado de historial:", error);
  } finally {
    setCargandoHistorial(false);
  }
  };

  const copiarTodo = async () => {
    const textoCompleto = `Banco: ${datosBancarios.banco}\nTelf: ${datosBancarios.telefono}\nCI: ${datosBancarios.identidad}`;
    await Clipboard.setStringAsync(textoCompleto);
    Alert.alert("¡Copiado!", "Datos listos para tu Pago Móvil.");
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const registrarYValidar2 = async () => {
  if (!image || !referencia || !montoInput) {
    Alert.alert("Campos incompletos", "Por favor sube el comprobante y llena todos los datos.");
    return;
  }

  setCargando(true);

  try {
    // 1. Obtener Token de la sesión
    const sessionString = await AsyncStorage.getItem('@Sesion_usuario');
    const session = JSON.parse(sessionString);
    const token = session?.token;

    if (!token) throw new Error("Sesión no válida. Inicia sesión de nuevo.");

    const montoARecargar = parseFloat(montoInput);

    // --- PASO A: SUBIR IMAGEN A SUPABASE (Para obtener la URL) ---
    const fileName = `captures/${Date.now()}.jpg`;
    
    // Si usas el helper de Expo para FormData:
    const formData = new FormData();
    formData.append("file", { uri: image, name: fileName, type: "image/jpeg" });

    

    // --- PASO B: ENVIAR REPORTE A TU API ---
    const payloadBackend = {
      referenciaPago: referencia, 
      monto: montoARecargar,
      banco: "banesco", // Asegúrate de tener este estado (ej: "banesco")
      fechaPago: new Date().toISOString().split('T')[0], // 'YYYY-MM-DD'
      comprobanteUrl: "http://abc/xd.com" // La URL que generamos arriba
    };

    const response = await fetch("https://subapp-api.onrender.com/api/billetera/recargar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payloadBackend),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "La API rechazó el reporte de pago.");
    }

    // --- PASO C: ÉXITO ---
    // Nota: El saldo no lo sumamos nosotros, esperamos a que la API lo valide.
    // Pero podemos refrescar el saldo actual llamando a tu función de obtener saldo.
    await obtenerSaldoReal(); 

    Alert.alert("Reporte Enviado", "Tu pago está siendo verificado por el sistema.");
    setModalVisible(false);
    cargarHistorial();

  } catch (error) {
    console.error("Error en recarga:", error);
    Alert.alert("Error", error.message);
  } finally {
    setCargando(false);
    setImage(null);
    setReferencia("");
    setMontoInput("");
  }
};

  const ejecutarTransferenciaReal = async () => {
    const monto = parseFloat(montoTransferir);
    if (!nombreDestinatario) { Alert.alert("Error", "ID no encontrado."); return; }
    if (isNaN(monto) || monto <= 0) { Alert.alert("Monto inválido", "Ingresa un monto correcto."); return; }
    if (monto > saldo) { Alert.alert("Saldo insuficiente", "No tienes suficiente saldo."); return; }

    setCargando(true);
    try {
      const userid = await getuserid();
      const myId = userid.trim();
      const targetId = destinatarioID.trim();
      const referenciaUnica = `TRF-${Date.now().toString().slice(-6)}`;

      const { error: errorResta } = await supabase.from("Saldo_usuarios").update({ saldo: saldo - monto }).eq("external_user_id", myId);
      if (errorResta) throw errorResta;

      const { data: dataDest } = await supabase.from("Saldo_usuarios").select("saldo").eq("external_user_id", targetId).maybeSingle();
      const nuevoSaldoDest = (dataDest ? dataDest.saldo : 0) + monto;

      const { error: errorSuma } = await supabase.from("Saldo_usuarios").upsert({ external_user_id: targetId, saldo: nuevoSaldoDest }, { onConflict: "external_user_id" });
      if (errorSuma) throw errorSuma;

      await supabase.from("validaciones_pago").insert([
        { external_user_id: myId, referencia: referenciaUnica, monto_informado: monto, evidencia_url: `Envío a: ${nombreDestinatario}`, estado: "completado" },
        { external_user_id: targetId, referencia: referenciaUnica, monto_informado: monto, evidencia_url: `Recibido de: ${userName}`, estado: "completado" }
      ]);

      setSaldo(saldo - monto);
      Alert.alert("¡Transferencia Exitosa!", `Has enviado Bs. ${monto.toFixed(2)} a ${nombreDestinatario}`);
      setModalTransferVisible(false);
      setMontoTransferir("");
      setDestinatarioID("");
      cargarHistorial();
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setCargando(false);
    }
  };
  

  const toggleSeccion = (seccion) => {
    setSeccionAbierta(seccionAbierta === seccion ? null : seccion);
  };

  // Función para renderizar cada fila
const renderOperacion = ({ item }) => {
  // Obtenemos el tema según el estado (si no existe, por defecto 'completado')
  const theme = STATUS_THEME[item.status] || STATUS_THEME.completado;
  const typeInfo = TYPE_LABELS[item.type] || { label: item.type, icon: 'help-circle-outline' };

  return (
    <View style={styles.card}>
      {/* Icono de Tipo de Operación */}
      <View style={[styles.iconContainer, { backgroundColor: theme.bg }]}>
        <MaterialCommunityIcons name={typeInfo.icon} size={24} color={theme.color} />
      </View>

      {/* Información Central */}
      <View style={styles.infoContainer}>
        <Text style={styles.typeText}>{typeInfo.label}</Text>
        <Text style={styles.dateText}>
          {new Date(item.createdAt).toLocaleDateString('es-VE', { 
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
          })}
        </Text>
        {item.banco && (
          <Text style={styles.bankText}>Ref: {item.referencia} | {item.banco}</Text>
        )}
      </View>

      {/* Monto y Badge de Estado */}
      <View style={styles.rightContainer}>
        <Text style={[styles.amountText, { color: item.type === 'retiro' ? '#EF4444' : '#1E293B' }]}>
          {item.type === 'retiro' ? '-' : '+'}{item.amount}
        </Text>
        
        <View style={[styles.badge, { backgroundColor: theme.bg }]}>
          <MaterialCommunityIcons name={theme.icon} size={12} color={theme.color} />
          <Text style={[styles.badgeText, { color: theme.color }]}>
            {theme.label}
          </Text>
        </View>
      </View>
    </View>
  );
};

  // --- RENDER ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" translucent={true} backgroundColor="transparent"/>
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* --- ENCABEZADO --- */}
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome6 name="arrow-left" size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.topHeaderTitle}>Mi Billetera</Text>
          <TouchableOpacity style={styles.helpButton} onPress={() => alert('Ayuda')}>
            <FontAwesome6 name="circle-question" size={22} color="#0284C7" />
          </TouchableOpacity>
        </View>

        {/* --- 1. LA TARJETA DIGITAL (Identidad SUBA) --- */}
        <View style={styles.walletCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardLabel}>Saldo disponible</Text>
              <Text style={styles.cardBalanceBs}>Bs. {saldo.toFixed(2)}</Text>
              <Text style={styles.cardBalanceUsd}>$ ~ {(saldo / tasaDolar).toFixed(2)} USD</Text>
            </View>
            
            {/* EL BOTÓN AMARILLO SUBA */}
            <TouchableOpacity style={styles.btnActionCircle} onPress={() => setModalDineroVisible(true)}>
              <FontAwesome6 name="money-bill-transfer" size={20} color="#023A73" />
              <Text style={styles.btnActionText}>Mover</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardFooter}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FontAwesome6 name="circle-check" size={14} color="#FFA311" style={{ marginRight: 8 }} />
              <Text style={styles.accountName}>Billetera SUBA Activa</Text>
            </View>
          </View>
        </View>

        {/* --- 2. GESTIÓN (Acordeones Desplegables) --- */}
        <Text style={styles.sectionTitle}>Gestión de Cuenta</Text>
        <View style={styles.accordionContainer}>
          
          {/* DESPLEGABLE: TARJETA FÍSICA */}
          <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleSeccion('tarjeta')} activeOpacity={0.7}>
            <View style={styles.accordionIconLeft}><FontAwesome6 name="credit-card" size={18} color="#0284C7" /></View>
            <View style={styles.accordionTitleBox}>
              <Text style={styles.accordionTitle}>Tarjeta Física SUBA</Text>
              <Text style={styles.accordionSubtitle}>
                {estadoTarjetaFisica === 'SIN_TARJETA' ? 'Solicítala por 5$' : 'Activa'}
              </Text>
            </View>
            <FontAwesome6 name={seccionAbierta === 'tarjeta' ? "chevron-up" : "chevron-down"} size={16} color="#94A3B8" />
          </TouchableOpacity>
          
          {seccionAbierta === 'tarjeta' && (
            <View style={styles.accordionContent}>
              <Text style={styles.accordionTextInfo}>Si te quedas sin batería a veces, pide tu tarjeta de plástico con chip NFC para pagar en el bus sin depender de tu celular.</Text>
              <TouchableOpacity style={styles.btnAccordionPrimary} onPress={() => {router.push('./Tarjeta/SolicitarTarjeta')}}>
                <Text style={styles.btnAccordionPrimaryText}>Solicitar Tarjeta</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.divider} />

          {/* DESPLEGABLE: SUBSIDIOS */}
          <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleSeccion('subsidio')} activeOpacity={0.7}>
            <View style={[styles.accordionIconLeft, {backgroundColor: '#FEF3C7'}]}><FontAwesome6 name="graduation-cap" size={18} color="#D97706" /></View>
            <View style={styles.accordionTitleBox}>
              <Text style={styles.accordionTitle}>Beneficios y Subsidios</Text>
              <Text style={styles.accordionSubtitle}>Estudiantes y Discapacidad</Text>
            </View>
            <FontAwesome6 name={seccionAbierta === 'subsidio' ? "chevron-up" : "chevron-down"} size={16} color="#94A3B8" />
          </TouchableOpacity>
          
          {seccionAbierta === 'subsidio' && (
            <View style={styles.accordionContent}>
              <Text style={styles.accordionTextInfo}>Si eres estudiante activo o posees un certificado de discapacidad, puedes optar por exoneraciones en el pasaje.</Text>
              <TouchableOpacity style={styles.btnAccordionSecondary} onPress={() => router.push('/pages/Pasajero/Subsidios')}>
                <Text style={styles.btnAccordionSecondaryText}>Cargar Constancias</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>

        {/* --- 3. HISTORIAL --- */}
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>Últimos Movimientos</Text>
            <TouchableOpacity onPress={cargarHistorial}><Text style={styles.historyLink}>Actualizar</Text></TouchableOpacity>
          </View>

          {cargandoHistorial ? (
             <ActivityIndicator size="small" color="#023A73" />
          ) : operaciones.length === 0 ? (
             <Text style={{textAlign: 'center', color: '#94A3B8', marginTop: 20}}>No hay movimientos recientes</Text>
          ) : (
            <FlatList
              data={operaciones} // Accedemos al array 'data' de tu JSON
              keyExtractor={(item) => item._id}
              renderItem={renderOperacion}
              contentContainerStyle={styles.listPadding}
              ListEmptyComponent={<Text style={styles.empty}>No hay movimientos aún</Text>}
              scrollEnabled={false}
            />
          )}
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ========================================== */}
      {/* MODAL BOTTOM SHEET: OPCIONES DE DINERO     */}
      {/* ========================================== */}
      <Modal visible={modalDineroVisible} transparent={true} animationType="slide" onRequestClose={() => setModalDineroVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalDineroVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalDragHandle} />
            <Text style={styles.modalTitle}>Transacciones</Text>
            <Text style={styles.modalSubtitle}>¿Qué deseas hacer con tu dinero?</Text>

            {/* Opcion 1: Recargar */}
            <TouchableOpacity 
              style={styles.modalOptionBtn} 
              onPress={() => { 
                setModalDineroVisible(false); 
                setModalVisible(true); // ABRIR MODAL ANTIGUO DE RECARGA
              }}
            >
              <View style={[styles.modalOptionIcon, {backgroundColor: '#DCFCE7'}]}><FontAwesome6 name="bolt" size={20} color="#16A34A" /></View>
              <View style={{flex: 1}}>
                <Text style={styles.modalOptionTitle}>Recargar Saldo</Text>
                <Text style={styles.modalOptionSub}>Ingresar dinero vía Pago Móvil</Text>
              </View>
              <FontAwesome6 name="chevron-right" size={14} color="#94A3B8" />
            </TouchableOpacity>

            {/* Opcion 2: Transferir */}
            <TouchableOpacity 
              style={styles.modalOptionBtn} 
              onPress={() => { 
                setModalDineroVisible(false); 
                setModalTransferVisible(true); // ABRIR MODAL ANTIGUO DE TRANSFERENCIA
              }}
            >
              <View style={[styles.modalOptionIcon, {backgroundColor: '#E0F2FE'}]}><FontAwesome6 name="paper-plane" size={20} color="#0284C7" /></View>
              <View style={{flex: 1}}>
                <Text style={styles.modalOptionTitle}>Transferir (P2P)</Text>
                <Text style={styles.modalOptionSub}>Enviar saldo a otro pasajero</Text>
              </View>
              <FontAwesome6 name="chevron-right" size={14} color="#94A3B8" />
            </TouchableOpacity>

            {/* Opcion 3: Retirar */}
            <TouchableOpacity 
              style={styles.modalOptionBtn} 
              onPress={() => Alert.alert("Próximamente", "Función de retiro a cuenta bancaria en desarrollo.")}
            >
              <View style={[styles.modalOptionIcon, {backgroundColor: '#F3E8FF'}]}><FontAwesome6 name="building-columns" size={20} color="#9333EA" /></View>
              <View style={{flex: 1}}>
                <Text style={styles.modalOptionTitle}>Retirar Saldo</Text>
                <Text style={styles.modalOptionSub}>Enviar dinero a tu cuenta bancaria</Text>
              </View>
              <FontAwesome6 name="chevron-right" size={14} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ========================================== */}
      {/* MODALES ANTIGUOS (Lógica preservada)       */}
      {/* ========================================== */}
      
      {/* MODAL RECARGA */}
      <Modal animationType="slide" transparent visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {step === 1 ? "Datos de Pago" : "Reportar Pago"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={30} color="#BDC3C7" />
              </TouchableOpacity>
            </View>

            {step === 1 ? (
              <View>
                <Text style={styles.modalSubtitle}>
                  Transfiere a través de Pago Móvil:
                </Text>
                <View style={styles.dataBox}>
                  <Text style={styles.dataText}>
                    Banco: <Text style={styles.boldText}>{datosBancarios.banco}</Text>
                  </Text>
                  <Text style={styles.dataText}>
                    Teléfono: <Text style={styles.boldText}>{datosBancarios.telefono}</Text>
                  </Text>
                  <Text style={styles.dataText}>
                    CI: <Text style={styles.boldText}>{datosBancarios.identidad}</Text>
                  </Text>
                  <TouchableOpacity style={styles.btnCopiar} onPress={copiarTodo}>
                    <Ionicons name="copy-outline" size={18} color="#D99015" />
                    <Text style={styles.btnCopiarText}>Copiar todos los datos</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.btnPrincipal} onPress={() => setStep(2)}>
                  <Text style={styles.btnPrincipalText}>SIGUIENTE PASO</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <TouchableOpacity style={styles.imageSelector} onPress={pickImage}>
                  {image ? (
                    <Image source={{ uri: image }} style={styles.previewImage} />
                  ) : (
                    <View style={{ alignItems: "center" }}>
                      <Ionicons name="cloud-upload" size={40} color="#003366" />
                      <Text style={{ color: "#95a5a6", fontWeight: "bold" }}>Subir Capture</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TextInput
                  placeholder="Referencia (últimos 6 dígitos)"
                  style={styles.inputPro}
                  keyboardType="numeric"
                  value={referencia}
                  onChangeText={setReferencia}
                />
                <TextInput
                  placeholder="Monto enviado (Bs.)"
                  style={styles.inputPro}
                  keyboardType="numeric"
                  value={montoInput}
                  onChangeText={setMontoInput}
                />
                <TouchableOpacity
                  style={[styles.btnPrincipal, { backgroundColor: cargando ? "#BDC3C7" : "#27ae60" }]}
                  onPress={registrarYValidar2}
                  disabled={cargando}
                >
                  {cargando ? <ActivityIndicator color="white" /> : <Text style={styles.btnPrincipalText}>CONFIRMAR RECARGA</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setStep(1)} style={{ marginTop: 15 }}>
                  <Text style={{ textAlign: "center", color: "#7F8C8D" }}>Atrás</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL TRANSFERENCIA */}
      <Modal animationType="slide" transparent visible={modalTransferVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enviar Dinero</Text>
              <TouchableOpacity onPress={() => setModalTransferVisible(false)}>
                <Ionicons name="close-circle" size={30} color="#BDC3C7" />
              </TouchableOpacity>
            </View>

      {/* CONTENEDOR DEL PICKER */}
     <View style={{  backgroundColor: '#F1F5F9', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20, overflow: 'hidden' }}>
      <Picker
        selectedValue={destinatarioID}
        onValueChange={(itemValue) => {
            setDestinatarioID(itemValue);
          // Validación extra para encontrar el nombre
          if (Array.isArray(pasajeros)) {
            const p = pasajeros.find(pass => pass._id === itemValue);
            setNombreDestinatario(p ? p.fullName : null);
          }
        }}
          style={{ height: 55, width: '100%' }}
        >
        <Picker.Item label="Seleccione un pasajero..." value="" color="#94A3B8" />
          {Array.isArray(pasajeros) && pasajeros.map((p) => (
            <Picker.Item 
              key={p._id || Math.random().toString()} 
              label={`${p.fullName || 'Sin nombre'} (${p.email || ''})`} 
              value={p._id} 
            />
          ))}
        </Picker>
      </View>

            <Text style={styles.modalSubtitle}>Ingresa el ID del usuario</Text>

            <TextInput
              placeholder="ID del Destinatario"
              style={styles.inputPro}
              value={destinatarioID}
              onChangeText={setDestinatarioID}
              keyboardType="numeric"
            />

            {nombreDestinatario && (
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 15, paddingLeft: 5 }}>
                <Ionicons name="person-circle" size={20} color="#27ae60" />
                <Text style={{ color: "#27ae60", fontWeight: "bold", marginLeft: 5 }}>Destinatario: {nombreDestinatario}</Text>
              </View>
            )}

            <TextInput
              placeholder="Monto a enviar (Bs.)"
              style={styles.inputPro}
              keyboardType="numeric"
              value={montoTransferir}
              onChangeText={setMontoTransferir}
            />

            <TouchableOpacity
              style={[styles.btnPrincipal, { backgroundColor: !nombreDestinatario || cargando ? "#BDC3C7" : "#5D6D7E" }]}
              onPress={ejecutarTransferenciaReal}
              disabled={!nombreDestinatario || cargando}
            >
              {cargando ? <ActivityIndicator color="white" /> : <Text style={styles.btnPrincipalText}>TRANSFERIR AHORA</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, paddingHorizontal: 20 },
  topHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingBottom: 15, marginBottom: 5 },
  backButton: { padding: 5, marginLeft: -5 },
  topHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  helpButton: { padding: 5 },

  // Tarjeta Azul SUBA
  walletCard: { backgroundColor: '#023A73', borderRadius: 24, padding: 25, shadowColor: '#023A73', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 8, marginBottom: 25 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  cardLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  cardBalanceBs: { color: 'white', fontSize: 34, fontWeight: 'bold', marginBottom: 2 },
  cardBalanceUsd: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600' },
  
  // Botón Amarillo SUBA
  btnActionCircle: { backgroundColor: '#FFA311', width: 65, height: 65, borderRadius: 32.5, justifyContent: 'center', alignItems: 'center', shadowColor: '#FFA311', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  btnActionText: { color: '#023A73', fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 15 },
  accountName: { color: 'white', fontSize: 14, fontWeight: '600' },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 15 },

  // Menús Desplegables (Acordeones)
  accordionContainer: { backgroundColor: 'white', borderRadius: 20, padding: 5, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 30 },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  accordionIconLeft: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  accordionTitleBox: { flex: 1 },
  accordionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 2 },
  accordionSubtitle: { fontSize: 13, color: '#64748B' },
  accordionContent: { paddingHorizontal: 15, paddingBottom: 20, paddingTop: 5 },
  accordionTextInfo: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 15 },
  btnAccordionPrimary: { backgroundColor: '#D97706', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnAccordionPrimaryText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  btnAccordionSecondary: { backgroundColor: '#F1F5F9', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  btnAccordionSecondaryText: { color: '#475569', fontSize: 14, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 15 },

  // Historial
  historyContainer: { flex: 1 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  historyLink: { fontSize: 14, color: '#0284C7', fontWeight: '600' },
  transactionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 10, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  transactionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  transactionIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  transactionType: { fontSize: 15, fontWeight: '600', color: '#1E293B', marginBottom: 4 },
  transactionDate: { fontSize: 12, color: '#64748B' },
  transactionAmount: { fontSize: 16, fontWeight: 'bold' },

  // Modal Bottom Sheet (Transacciones)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalDragHandle: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#0F172A', marginBottom: 5 },
  modalSubtitle: { fontSize: 15, color: '#64748B', marginBottom: 25 },
  modalOptionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalOptionIcon: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  modalOptionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 2 },
  modalOptionSub: { fontSize: 13, color: '#64748B' },

  // Estilos de los Modales Antiguos (Reciclados)
  dataBox: { backgroundColor: "#FDF7ED", padding: 20, borderRadius: 20, borderWidth: 1, borderColor: "#FAD7A0" },
  dataText: { fontSize: 16, marginBottom: 10, color: "#34495E" },
  boldText: { fontWeight: "bold", color: "#003366" },
  btnCopiar: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  btnCopiarText: { marginLeft: 8, color: "#D99015", fontWeight: "bold", fontSize: 14 },
  btnPrincipal: { backgroundColor: "#003366", padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 25, elevation: 3 },
  btnPrincipalText: { color: "white", fontWeight: "bold", fontSize: 16 },
  imageSelector: { height: 160, backgroundColor: "#F8F9F9", borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 20, borderStyle: "dashed", borderWidth: 2, borderColor: "#BDC3C7" },
  previewImage: { width: "100%", height: "100%", borderRadius: 20 },
  inputPro: { backgroundColor: "#F2F4F4", padding: 18, borderRadius: 15, marginBottom: 15, fontSize: 16, color: "#2C3E50" },

  listPadding: { padding: 0 },
  itemContainer: {
    flexDirection: 'row',backgroundColor: '#fff', padding: 10, borderRadius: 12,marginBottom: 10, alignItems: 'center',elevation: 3, shadowColor: '#000',shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1,
  },
  indicator: {
    width: 5,
    height: '100%',
    borderRadius: 5,
    marginRight: 15,
  },
  info: { flex: 1 },
  typeText: { fontWeight: 'bold', fontSize: 16, textTransform: 'capitalize' },
  dateText: { color: '#888', fontSize: 12, marginTop: 4 },
  amountContainer: { alignItems: 'flex-end' },
  amountText: { fontWeight: 'bold', fontSize: 16 },
  balanceText: { color: '#aaa', fontSize: 10, marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 50, color: '#999' },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
    // Sombra para iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    // Sombra para Android
    elevation: 2,
  },
  iconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  typeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
  },
  bankText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontStyle: 'italic',
  },
  rightContainer: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});

