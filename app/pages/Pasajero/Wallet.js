import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Modal, Alert, Image,
  TextInput, FlatList, StatusBar, ActivityIndicator
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import Volver from '../../Components/Botones_genericos/Volver';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../Components/Temas_y_colores/ThemeContext';
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
  const { theme, isDark } = useTheme(); //temas oscuro y claro
// --- 1. NUEVA FUNCIÓN PARA OBTENER EL SALDO DESDE "Saldo_usuarios" ---
const obtenerSaldoReal = async () => {
  try {
    const userid = await getuserid();
    if (!userid) return;

    // Cambiamos .single() por .maybeSingle() para evitar el error de "0 o múltiples filas"
    const { data, error } = await supabase
      .from('Saldo_usuarios')
      .select('saldo')
      .eq('external_user_id', userid.trim())
      .maybeSingle(); 

    if (error) {
      console.log("Error consultando saldo:", error.message);
      return;
    }

    if (data) {
      // Si existe el registro, cargamos el saldo
      setSaldo(data.saldo);
    } else {
      // Si data es null, significa que el usuario no tiene fila en esa tabla todavía
      console.log("El usuario no tiene registro de saldo. Iniciando en 0.");
      setSaldo(0.00);
      
      // OPCIONAL: Podrías crear la fila automáticamente aquí si quieres
      /*
      await supabase.from('Saldo_usuarios').insert([
        { external_user_id: userid.trim(), saldo: 0.00 }
      ]);
      */
    }
  } catch (error) {
    console.log("Error crítico en obtenerSaldoReal:", error);
  }
};

  // --- DATOS BANCARIOS ---
  const datosBancarios = {
    banco: "Banco de Venezuela",
    telefono: "04128695918",
    identidad: "V-30366440"
  };

  // --- EFECTOS ---
// --- 2. ACTUALIZAR EL EFECTO INICIAL ---
useEffect(() => {
  const inicializar = async () => {
    const nombre = await getusername();
    setUserName(nombre || "Usuario");
    
    // Cargamos ambas cosas
    await obtenerSaldoReal(); 
    await cargarHistorial();
  };
  inicializar();
}, []);


  // --- FUNCIONES DE APOYO ---
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
      quality: 0.5, // Calidad optimizada para subida rápida
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // --- LÓGICA DE BASE DE DATOS ---
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
    } catch (error) {
      console.log("Error cargando historial:", error);
    } finally {
      setCargandoHistorial(false);
    }
  };

const registrarYValidar = async () => {
  if (!image || !referencia || !montoInput) {
    Alert.alert("Campos incompletos", "Por favor sube el comprobante y llena los datos.");
    return;
  }
  setCargando(true);
//lalalalalllalal
  try {
    const userid = await getuserid();
    
    // 1. Preparar la imagen para Supabase (Sin librerías extrañas)
    const fileName = `captures/${Date.now()}.jpg`;
    const formData = new FormData();
    formData.append('file', {
      uri: image,
      name: fileName,
      type: 'image/jpeg',
    });

    // Subida al Storage
    const { error: storageError } = await supabase.storage
      .from('comprobantes')
      .upload(fileName, formData);

    if (storageError) throw storageError;

    // 2. Insertar Registro en validaciones_pago
const { error: dbError } = await supabase
  .from('validaciones_pago')
  .insert([{
    external_user_id: userid.trim(),
    referencia: referencia,
    monto_informado: parseFloat(montoInput),
    evidencia_url: fileName,
    estado: 'completado' // <-- Lo ponemos como completado para probar
  }]);

if (dbError) throw dbError;

// --- AQUÍ ESTÁ EL TRUCO: ACTUALIZAR EL SALDO REAL ---
// 3. Actualizar la tabla Saldo_usuarios
const nuevoSaldoCalculado = saldo + parseFloat(montoInput);

const { error: saldoError } = await supabase
  .from('Saldo_usuarios')
  .update({ saldo: nuevoSaldoCalculado })
  .eq('external_user_id', userid.trim());

if (saldoError) {
  console.log("Error actualizando saldo:", saldoError.message);
} else {
  setSaldo(nuevoSaldoCalculado); // Actualizamos la vista
}

    // 4. Suscripción al cambio de SALDO (Saldo_usuarios)
    const channelSaldo = supabase
      .channel('cambios-saldo')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'Saldo_usuarios', filter: `external_user_id=eq.${userid}` },
        (payload) => {
          setSaldo(payload.new.saldo); // Actualiza el monto en la tarjeta azul
          cargarHistorial();
        }
      ).subscribe();

    Alert.alert("Reporte enviado", "Estamos verificando tu transacción.");
    setModalVisible(false);
    cargarHistorial();

  } catch (error) {
    Alert.alert("Error", "No pudimos procesar el reporte: " + error.message);
  } finally {
    setCargando(false);
    setImage(null);
    setReferencia('');
    setMontoInput('');
  }
};
  // --- RENDER DE ITEMS ---
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
      <StatusBar barStyle="dark-content" backgroundColor={'#003366'}/>
      
      <View style={{flexDirection: 'row',  alignItems: 'center', paddingHorizontal: 20, height: 60, backgroundColor: theme.background_2}}>
        <Image source={require('../../../assets/img/wallet.png')} style={{position:'absolute', height:150, width:150, top:0, left:10}}/>
        <Volver route={"./Profile"} color={theme.volver_button} />
        <TouchableOpacity style={{marginLeft:'91%'}} onPress={cargarHistorial()}>
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
              
              <TouchableOpacity style={styles.actionButton}>
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

      {/* --- MODAL RECARGA --- */}
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
                  {image ? (
                    <Image source={{ uri: image }} style={styles.previewImage} />
                  ) : (
                    <View style={{alignItems:'center'}}>
                      <Ionicons name="cloud-upload" size={40} color="#003366" />
                      <Text style={{ color: '#95a5a6', fontWeight: 'bold' }}>Subir Capture</Text>
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
                  style={[styles.btnPrincipal, { backgroundColor: cargando ? '#BDC3C7' : '#27ae60' }]}
                  onPress={registrarYValidar}
                  disabled={cargando}
                >
                  {cargando ? <ActivityIndicator color="white" /> : <Text style={styles.btnPrincipalText}>CONFIRMAR RECARGA</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setStep(1)} style={{marginTop:15}}>
                   <Text style={{textAlign:'center', color:'#7F8C8D'}}>Atrás</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  header: { flexDirection: 'row',  alignItems: 'center', paddingHorizontal: 20, height: 60, backgroundColor: 'white' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#003366' },
  welcomeSection: { paddingHorizontal: 20, marginTop: 15 },
  userLabel: { fontSize: 24, fontWeight: 'bold', color: '#2C3E50' },
  scrollContent: { paddingBottom: 30 },
  
  balanceCard: {
    backgroundColor: '#003366',
    marginTop:30,
    margin: 20,
    padding: 25,
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#003366',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  balanceAmount: { color: 'white', fontSize: 34, fontWeight: 'bold' },

  actionPanel: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 },
  actionButton: { alignItems: 'center', width: '30%' },
  actionIconContainer: { 
    backgroundColor: '#D99015', 
    width: 60, height: 60, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 8,
    elevation: 5
  },
  actionText: { fontSize: 11, fontWeight: 'bold', color: '#34495E' },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 25, marginTop: 20, marginBottom: 15, color: '#2C3E50' },
  
  transactionItem: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    elevation: 2,
  },
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