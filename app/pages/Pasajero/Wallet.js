import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Modal, Alert, Image,
  TextInput, FlatList, StatusBar, ActivityIndicator
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../Components/Temas_y_colores/ThemeContext';
// IMPORTANTE: Importamos router para poder "volver"
import { router } from 'expo-router';

// Configuración de Supabase
const supabase = createClient('https://wkkdynuopaaxtzbchxgv.supabase.co', 'sb_publishable_S18aNBlyLP3-hV_mRMcehA_zbCDMSGP');

export default function WalletScreen() {
  // --- ESTADOS ---
  const [operaciones, setOperaciones] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [userName, setUserName] = useState('...');
  const [modalVisible, setModalVisible] = useState(false);
  const [step, setStep] = useState(1);
  const [image, setImage] = useState(null);
  const [saldo, setSaldo] = useState(0.00);
  const [referencia, setReferencia] = useState('');
  const [montoInput, setMontoInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const { theme } = useTheme(); 

  // --- ESTADOS PARA TRANSFERENCIA INTERNA ---
const [modalTransferVisible, setModalTransferVisible] = useState(false);
const [destinatarioID, setDestinatarioID] = useState('');
const [montoTransferir, setMontoTransferir] = useState('');
const [nombreDestinatario, setNombreDestinatario] = useState(null);
const [buscandoUsuario, setBuscandoUsuario] = useState(false);

  // --- DATOS BANCARIOS ---
  const datosBancarios = {
    banco: "Banco de Venezuela",
    telefono: "04128695918",
    identidad: "V-30366440"
  };

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
  if (destinatarioID === '12345') {
    setNombreDestinatario("Juan Pérez");
  } else if (destinatarioID === '67890') {
    setNombreDestinatario("María García");
  } else {
    setNombreDestinatario(null);
  }
}, [destinatarioID]);


const ejecutarTransferenciaReal = async () => {
  const monto = parseFloat(montoTransferir);

  if (!nombreDestinatario) {
    Alert.alert("Error", "ID no encontrado.");
    return;
  }
  if (isNaN(monto) || monto <= 0) {
    Alert.alert("Monto inválido", "Ingresa un monto correcto.");
    return;
  }
  if (monto > saldo) {
    Alert.alert("Saldo insuficiente", "No tienes suficiente saldo.");
    return;
  }

  setCargando(true);

  try {
    const userid = await getuserid();
    const myId = userid.trim();
    const targetId = destinatarioID.trim();
    const referenciaUnica = `TRF-${Date.now().toString().slice(-6)}`;

    // 1. DESCONTAR MI SALDO
    const nuevoSaldoMio = saldo - monto;
    const { error: errorResta } = await supabase
      .from('Saldo_usuarios')
      .update({ saldo: nuevoSaldoMio })
      .eq('external_user_id', myId);

    if (errorResta) throw new Error("Error al descontar tu saldo.");

    // 2. SUMAR SALDO AL DESTINATARIO (UPSERT)
    const { data: dataDest } = await supabase
      .from('Saldo_usuarios')
      .select('saldo')
      .eq('external_user_id', targetId)
      .maybeSingle();

    const saldoActualDest = dataDest ? dataDest.saldo : 0;
    const nuevoSaldoDest = saldoActualDest + monto;

    const { error: errorSuma } = await supabase
      .from('Saldo_usuarios')
      .upsert(
        { external_user_id: targetId, saldo: nuevoSaldoDest },
        { onConflict: 'external_user_id' }
      );

    if (errorSuma) throw new Error("Error al acreditar al destinatario.");

    // 3. CREAR VALIDACIONES DE PAGO (HISTORIAL PARA AMBOS)
    const { error: errorHistorial } = await supabase.from('validaciones_pago').insert([
      {
        external_user_id: myId,
        referencia: referenciaUnica,
        monto_informado: monto,
        evidencia_url: `Envío a: ${nombreDestinatario}`,
        estado: 'completado' // Aparecerá en tu lista
      },
      {
        external_user_id: targetId,
        referencia: referenciaUnica,
        monto_informado: monto,
        evidencia_url: `Recibido de: ${userName}`,
        estado: 'completado' // Aparecerá en la lista del que recibe
      }
    ]);

    if (errorHistorial) console.log("Aviso: No se pudo registrar en el historial, pero el dinero se movió.");

    // 4. ACTUALIZAR UI LOCAL
    setSaldo(nuevoSaldoMio);
    Alert.alert("¡Transferencia Exitosa!", `Has enviado Bs. ${monto.toFixed(2)} a ${nombreDestinatario}`);
    
    setModalTransferVisible(false);
    setMontoTransferir('');
    setDestinatarioID('');
    cargarHistorial(); 

  } catch (error) {
    Alert.alert("Error", error.message);
  } finally {
    setCargando(false);
  }
};

const ejecutarTransferenciaSimulada = () => {
  const monto = parseFloat(montoTransferir);

  if (!nombreDestinatario) {
    Alert.alert("Error", "ID no encontrado. Prueba con 12345 o 67890");
    return;
  }
  if (isNaN(monto) || monto <= 0) {
    Alert.alert("Monto inválido", "Ingresa un monto correcto.");
    return;
  }
  if (monto > saldo) {
    Alert.alert("Saldo insuficiente", "No tienes suficiente saldo simulado.");
    return;
  }

  setCargando(true);

  // Simulamos un delay de red de 1.5 segundos
  setTimeout(() => {
    const nuevaTransaccion = {
      id: Date.now().toString(),
      titulo: `Envío a ${nombreDestinatario}`,
      subtitulo: `ID: ${destinatarioID}`,
      hora: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      monto: `- Bs. ${monto.toFixed(2)}`,
      colorMonto: '#e74c3c', // Rojo para salida de dinero
      icon: "paper-plane-outline"
    };

    setSaldo(prev => prev - monto);
    setOperaciones(prev => [nuevaTransaccion, ...prev]);
    setCargando(false);
    setModalTransferVisible(false);
    setMontoTransferir('');
    setDestinatarioID('');
    
    Alert.alert("¡Transferencia Exitosa!", `Has enviado Bs. ${monto} a ${nombreDestinatario}`);
  }, 1500);
};

  // --- FUNCIONES DE SALDO Y BD ---
  const obtenerSaldoReal = async () => {
    try {
      const userid = await getuserid();
      if (!userid) return;

      const { data, error } = await supabase
        .from('Saldo_usuarios')
        .select('saldo')
        .eq('external_user_id', userid.trim())
        .maybeSingle(); 

      if (error) { console.log("Error saldo:", error.message); return; }
      if (data) setSaldo(data.saldo);
      else setSaldo(0.00);
    } catch (error) { console.log("Error crítico:", error); }
  };

  const getuserid = async () => {
    const session = await AsyncStorage.getItem('@Sesion_usuario');
    if (!session) return null;
    return JSON.parse(session)._id;
  };

  const getusername = async () => {
    const session = await AsyncStorage.getItem('@Sesion_usuario');
    if (!session) return "";
    return JSON.parse(session).fullName;
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

  const cargarHistorial = async () => {
    try {
      const userid = await getuserid();
      if (!userid) return;

      const { data, error } = await supabase
        .from('validaciones_pago')
        .select('*')
        .eq('external_user_id', userid.trim())
        .order('created_at', { ascending: false });

      if (data) {
        const formateados = data.map(item => ({
          id: item.id.toString(),
          titulo: item.estado === 'completado' ? 'Recarga Exitosa' : 'Validación en curso',
          subtitulo: `Ref: ${item.referencia}`,
          hora: new Date(item.created_at).toLocaleDateString() + ' ' + 
                new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          monto: `Bs. ${item.monto_informado}`,
          colorMonto: item.estado === 'completado' ? '#2ecc71' : '#f39c12',
          icon: item.estado === 'completado' ? "checkmark-circle" : "time-outline"
        }));
        setOperaciones(formateados);
      }
    } catch (error) { console.log("Error historial:", error); } 
    finally { setCargandoHistorial(false); }
  };

    const registrarYValidar2 = async () => {
if (!image || !referencia || !montoInput) {
    Alert.alert("Campos incompletos", "Por favor sube el comprobante y llena los datos.");
    return;
  }
  
  setCargando(true);

  try {
    const userid = await getuserid();
    const cleanUserId = userid.trim();
    const montoARecargar = parseFloat(montoInput);

    // 1. Subir la imagen al storage
    const fileName = `captures/${Date.now()}.jpg`;
    const formData = new FormData();
    formData.append('file', { uri: image, name: fileName, type: 'image/jpeg' });

    const { error: storageError } = await supabase.storage.from('comprobantes').upload(fileName, formData);
    if (storageError) throw storageError;

    // 2. Insertar el reporte en validaciones_pago
    const { error: dbError } = await supabase.from('validaciones_pago').insert([{
      external_user_id: cleanUserId,
      referencia: referencia,
      monto_informado: montoARecargar,
      evidencia_url: fileName,
      estado: 'completado' 
    }]);
    if (dbError) throw dbError;

    // 3. Lógica de Saldo (UPSERT)
    // Calculamos el nuevo total sumando el saldo que ya tenemos en el estado de React
    const nuevoSaldoCalculado = saldo + montoARecargar;

    const { error: saldoError } = await supabase
      .from('Saldo_usuarios')
      .upsert(
        { 
          external_user_id: cleanUserId, 
          saldo: nuevoSaldoCalculado 
        }, 
        { onConflict: 'external_user_id' } // Esta es la clave para que no se duplique
      );

    if (saldoError) throw saldoError;

    // 4. Actualizar la interfaz (UI)
    setSaldo(nuevoSaldoCalculado);
    Alert.alert("Recarga Exitosa", `Tu saldo ha sido actualizado. Nuevo saldo: Bs. ${nuevoSaldoCalculado.toFixed(2)}`);
    
    setModalVisible(false);
    cargarHistorial();

  } catch (error) {
    console.error("Error en proceso:", error);
    Alert.alert("Error", "No pudimos procesar el reporte: " + error.message);
  } finally {
    setCargando(false);
    setImage(null);
    setReferencia('');
    setMontoInput('');
  }
  };

  // --- RENDER ITEM ---
  const renderItem = ({ item }) => (
    <View style={styles.transactionItem}>
      <View style={styles.iconCircle}>
        <Ionicons name={item.icon} size={22} color="#003366" />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle}>{item.titulo}</Text>
        <Text style={styles.itemSubtitle}>{item.subtitulo}</Text>
        <Text style={styles.itemTime}>{item.hora}</Text>
      </View>
      <Text style={[styles.itemAmount, { color: item.colorMonto }]}>{item.monto}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.background_2}}>
      <StatusBar barStyle="dark-content" translucent={true}/>
      
      {/* HEADER CON BOTÓN "ATRÁS" REAL */}
      <View style={styles.headerContainer}>
        <Image source={require('../../../assets/img/wallet.png')} style={styles.headerImage}/>
        
        {/* BOTÓN VOLVER (Router Back) */}
        <TouchableOpacity 
            onPress={() => router.back()} // <--- ESTO ES LO QUE DA LA FLUIDEZ
            style={styles.backButton}
        >
            <Ionicons name="arrow-back" size={28} color="#003366" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.refreshButton} onPress={cargarHistorial}>
           <Ionicons name="refresh-circle" size={30} color="#003366" />
        </TouchableOpacity>
      </View>
    
      <FlatList
        data={operaciones}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={
          <>
            <View style={styles.balanceCard}>
              <View>
                <Text style={styles.balanceLabel}>Saldo Actual</Text>
                <Text style={styles.balanceAmount}>Bs. {saldo.toFixed(2)}</Text>
              </View>
              <MaterialCommunityIcons name="contactless-payment" size={45} color="rgba(255,255,255,0.6)" />
            </View>

            <View style={styles.actionPanel}>
              <TouchableOpacity onPress={() => { setStep(1); setModalVisible(true); }} style={styles.actionButton}>
                <View style={styles.actionIconContainer}>
                  <Ionicons name="wallet" size={26} color="white" />
                </View>
                <Text style={styles.actionText}>RECARGAR</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => setModalTransferVisible(true)} style={styles.actionButton}>
                <View style={[styles.actionIconContainer, { backgroundColor: '#5D6D7E' }]}>
                  <Ionicons name="swap-horizontal" size={26} color="white" />
                </View>
                <Text style={styles.actionText}>TRANSFERIR</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Últimos Movimientos</Text>
          </>
        }
        ListEmptyComponent={
          cargandoHistorial ? (
            <ActivityIndicator size="large" color="#003366" style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={50} color="#BDC3C7" />
              <Text style={styles.emptyText}>No tienes transacciones aún</Text>
            </View>
          )
        }
      />

      {/* MODAL (Sin cambios) */}
      <Modal animationType="slide" transparent visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{step === 1 ? 'Datos de Pago' : 'Reportar Pago'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={30} color="#BDC3C7" />
              </TouchableOpacity>
            </View>

            {step === 1 ? (
              <View>
                <Text style={styles.modalSubtitle}>Transfiere a través de Pago Móvil:</Text>
                <View style={styles.dataBox}>
                  <Text style={styles.dataText}>Banco: <Text style={styles.boldText}>{datosBancarios.banco}</Text></Text>
                  <Text style={styles.dataText}>Teléfono: <Text style={styles.boldText}>{datosBancarios.telefono}</Text></Text>
                  <Text style={styles.dataText}>CI: <Text style={styles.boldText}>{datosBancarios.identidad}</Text></Text>
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
                  {image ? <Image source={{ uri: image }} style={styles.previewImage} /> : 
                    <View style={{alignItems:'center'}}>
                      <Ionicons name="cloud-upload" size={40} color="#003366" />
                      <Text style={{ color: '#95a5a6', fontWeight: 'bold' }}>Subir Capture</Text>
                    </View>}
                </TouchableOpacity>
                <TextInput placeholder="Referencia (últimos 6 dígitos)" style={styles.inputPro} keyboardType="numeric" value={referencia} onChangeText={setReferencia}/>
                <TextInput placeholder="Monto enviado (Bs.)" style={styles.inputPro} keyboardType="numeric" value={montoInput} onChangeText={setMontoInput}/>
                <TouchableOpacity style={[styles.btnPrincipal, { backgroundColor: cargando ? '#BDC3C7' : '#27ae60' }]} onPress={registrarYValidar2} disabled={cargando}>
                  {cargando ? <ActivityIndicator color="white" /> : <Text style={styles.btnPrincipalText}>CONFIRMAR RECARGA</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setStep(1)} style={{marginTop:15}}><Text style={{textAlign:'center', color:'#7F8C8D'}}>Atrás</Text></TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
      {/* MODAL DE TRANSFERENCIA (SIMULADO) */}
<Modal animationType="slide" transparent visible={modalTransferVisible}>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Enviar Dinero</Text>
        <TouchableOpacity onPress={() => setModalTransferVisible(false)}>
          <Ionicons name="close-circle" size={30} color="#BDC3C7" />
        </TouchableOpacity>
      </View>

      <Text style={styles.modalSubtitle}>Ingresa el ID del usuario (Prueba con 12345 o 67890)</Text>

      <TextInput 
        placeholder="ID del Destinatario" 
        style={styles.inputPro} 
        value={destinatarioID}
        onChangeText={setDestinatarioID}
        keyboardType="numeric"
      />

      {nombreDestinatario && (
        <View style={{flexDirection:'row', alignItems:'center', marginBottom: 15, paddingLeft: 5}}>
          <Ionicons name="person-circle" size={20} color="#27ae60" />
          <Text style={{color: '#27ae60', fontWeight: 'bold', marginLeft: 5}}>Destinatario: {nombreDestinatario}</Text>
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
        style={[styles.btnPrincipal, { backgroundColor: (!nombreDestinatario || cargando) ? '#BDC3C7' : '#5D6D7E' }]} 
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
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  scrollContent: { paddingBottom: 30 },
  
  // HEADER
  headerContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, height: 60, backgroundColor: '#F8FAFB' }, // Color fijo para consistencia
  headerImage: { position:'absolute', height:150, width:150, top:0, left:10 },
  backButton: { marginLeft: 5, padding: 5 }, // Ajuste para el touch area
  refreshButton: { marginLeft: 'auto', padding: 5 }, // marginLeft: auto empuja a la derecha

  balanceCard: {
    backgroundColor: '#003366', marginTop:30, margin: 20, padding: 25, borderRadius: 25,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#003366', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  balanceAmount: { color: 'white', fontSize: 34, fontWeight: 'bold' },

  actionPanel: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 },
  actionButton: { alignItems: 'center', width: '30%' },
  actionIconContainer: { backgroundColor: '#D99015', width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8, elevation: 5 },
  actionText: { fontSize: 11, fontWeight: 'bold', color: '#34495E' },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 25, marginTop: 20, marginBottom: 15, color: '#2C3E50' },
  transactionItem: { backgroundColor: 'white', marginHorizontal: 20, marginBottom: 10, padding: 15, borderRadius: 20, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, elevation: 2 },
  iconCircle: { width: 45, height: 45, borderRadius: 15, backgroundColor: '#F0F4F8', justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1, marginLeft: 15 },
  itemTitle: { fontWeight: 'bold', fontSize: 14, color: '#2C3E50' },
  itemSubtitle: { color: '#95A5A6', fontSize: 11, marginTop: 2 },
  itemTime: { fontSize: 10, color: '#BDC3C7', marginTop: 4 },
  itemAmount: { fontWeight: 'bold', fontSize: 15 },

  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#BDC3C7', marginTop: 10, fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 30, minHeight: 500 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#003366' },
  modalSubtitle: { fontSize: 15, color: '#7F8C8D', marginBottom: 20 },
  dataBox: { backgroundColor: '#FDF7ED', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#FAD7A0' },
  dataText: { fontSize: 16, marginBottom: 10, color: '#34495E' },
  boldText: { fontWeight: 'bold', color: '#003366' },
  btnCopiar: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  btnCopiarText: { marginLeft: 8, color: '#D99015', fontWeight: 'bold', fontSize: 14 },
  btnPrincipal: { backgroundColor: '#003366', padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 25, elevation: 3 },
  btnPrincipalText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  imageSelector: { height: 160, backgroundColor: '#F8F9F9', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderStyle: 'dashed', borderWidth: 2, borderColor: '#BDC3C7' },
  previewImage: { width: '100%', height: '100%', borderRadius: 20 },
  inputPro: { backgroundColor: '#F2F4F4', padding: 18, borderRadius: 15, marginBottom: 15, fontSize: 16, color: '#2C3E50' }
});