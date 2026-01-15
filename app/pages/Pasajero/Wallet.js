import React,{useState, useEffect} from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal,  Linking, Alert ,Image, TextInput} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import Volver from '../../Components/Botones_genericos/Volver';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabase = createClient(EXPO_PUBLIC_SUPABASE_URL , EXPO_PUBLIC_SUPABASE_ANON_KEY);

export default function WalletScreen() {
 const [operaciones, setOperaciones] = useState([
    { id: '1', titulo: 'Pago', subtitulo: 'san felix', hora: '1:00 pm', monto: '$503.12' },
    { id: '2', titulo: 'pago', subtitulo: 'alta vista', hora: '6:00 am', monto: '$26927' },
    { id: '3', titulo: 'Pago', subtitulo: 'Atlantico', hora: '11:00 am', monto: '$90' },
    { id: '4', titulo: 'PAGO', subtitulo: 'Villa asia', hora: '7:00 am', monto: '$100' },
  ]); // Ahora es un estado vacío
const [cargandoHistorial, setCargandoHistorial] = useState(true);


const [modalVisible, setModalVisible] = useState(false);
const [step, setStep] = useState(1); // Paso 1: Copiar, Paso 2: Registro
const [image, setImage] = useState(null);
const [saldo, setSaldo] = useState(0.01); // Saldo inicial

const [referencia, setReferencia] = useState('');
  const [montoInput, setMontoInput] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
  cargarHistorial();
}, []);

const cargarHistorial = async () => {
  try {
    const userid = await getuserid(); // Obtenemos el ID del usuario activo
    
    const { data, error } = await supabase
      .from('validaciones_pago')
      .select('*')
      .eq('external_user_id', userid) // FILTRO CRÍTICO
      .order('created_at', { ascending: false }); // Más recientes primero

    if (error) throw error;
    setOperaciones(data || [{id: '1', titulo: 'Pago', subtitulo: 'san felix', hora: '1:00 pm', monto: '$503.12'}]);
  } catch (error) {
    console.error("Error cargando historial:", error);
  } finally {
    setCargandoHistorial(false);
  }
};

  const getuserid = async ()=>{
      const userid = await AsyncStorage.getItem('@Sesion_usuario');
      const Jsonuserid = JSON.parse(userid)
      console.log(Jsonuserid._id);
      return Jsonuserid._id
  }

    const getusername = async ()=>{
      const userid = await AsyncStorage.getItem('@Sesion_usuario');
      const Jsonuserid = JSON.parse(userid)
      console.log(Jsonuserid.fullName);
      return Jsonuserid.fullName
  }
  const registrarYValidar = async () => {
    if (!image || !referencia || !montoInput) {
      Alert.alert("Error", "Completa todos los campos y sube el capture.");
      return;
    }

    setCargando(true);

    try {
      // 1. Subir imagen al Storage
      const fileName = `captures/${Date.now()}.jpg`;
      const formData = new FormData();
      formData.append('file', {
        uri: image,
        name: fileName,
        type: 'image/jpeg',
      });
      const userid = await getuserid();
      const { data: storageData, error: storageError } = await supabase.storage
        .from('comprobantes')
        .upload(fileName, formData);

      if (storageError) throw storageError;

      // 2. Insertar registro en la tabla de validaciones
      const { error: dbError } = await supabase
        .from('validaciones_pago')
        .insert([{
          external_user_id: userid, // Aquí pasas el ID del usuario
          referencia: referencia,
          monto_informado: parseFloat(montoInput),
          evidencia_url: fileName,
          estado: 'pendiente'
        }]);

      if (dbError) throw dbError;

      // 3. Suscribirse al cambio en tiempo real (Para la magia de la demo)
      const channel = supabase
        .channel('cambios-pago')
        .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'validaciones_pago', filter: `referencia=eq.${referencia}` },
          (payload) => {
            if (payload.new.estado === 'completado') {
              Alert.alert("¡Éxito!", "El SMS ha sido validado automáticamente. Tu saldo se ha actualizado.");
              setSaldo(prev => prev + parseFloat(montoInput));
              setModalVisible(false);
              supabase.removeChannel(channel);
            }
          }
        ).subscribe();

      Alert.alert("Pendiente", "Estamos esperando el SMS de confirmación del banco.");
      
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setCargando(false);
    }
  };
  // Datos bancarios (puedes editarlos)
  const datosBancarios = {
    banco: "Banco de Venezuela",
    telefono: "04128695918",
    identidad: "30366440"
  };

  // Función para seleccionar la captura
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

const copiarTodo = async () => {
    try {
      // Verificamos si Clipboard existe antes de usarlo para evitar el crash
      if (Clipboard && Clipboard.setStringAsync) {
        const textoCompleto = `Datos para Pago Móvil:\n📌 Banco: ${datosBancarios.banco}\n📌 CI: ${datosBancarios.pagoMovil}\n📌 Telf: ${datosBancarios.telefono}`;
        
        await Clipboard.setStringAsync(textoCompleto);
        Alert.alert("¡Copiado!", "Todos los datos bancarios han sido copiados."+textoCompleto);
      } else {
        throw new Error("El módulo de Clipboard no está disponible");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo copiar al portapapeles. Reinicia la app.");
    }
  };
  const abrirBancoVenezuela = () => {
    // Intenta abrir la app, si no, abre la web
    const urlApp = "bdvenlinea://"; 
    const urlWeb = "https://bdvenlinea.banvenez.com/";
/*
    Linking.canOpenURL(urlApp).then(supported => {
      if (supported) {
        Linking.openURL(urlApp);
      } else {
        Linking.openURL(urlWeb);
      }
    });
    */
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Text style={[styles.greeting,{marginLeft:20}]}>Wallet { getusername()}</Text>

        {/* Tarjeta de Saldo */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo actual</Text>
          <Text style={styles.balanceAmount}>{saldo}</Text>
        </View>

        {/* Panel de Acciones Azul */}
        <View style={styles.actionPanel}>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.actionButton}>
            <Ionicons name="wallet-outline" size={32} color="white" />
            <Text style={styles.actionText}>RECARGA</Text>
          </TouchableOpacity>
          
          <View style={styles.divider} />

          <TouchableOpacity style={styles.actionButton}>
            <MaterialCommunityIcons name="history" size={32} color="white" />
            <Text style={styles.actionText}>HISTORIAL</Text>
          </TouchableOpacity>
        </View>

        {/* Sección de Operaciones */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Operaciones</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {/* Contenedor Rojo de Transacciones */}
        <View style={styles.transactionsContainer}>
          {operaciones.map((item) => (
            <View key={item.id} style={styles.transactionItem}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemTitle}>{item.titulo}</Text>
                <Text style={styles.itemSubtitle}>{item.subtitulo}</Text>
              </View>
              <View style={styles.itemCenter}>
                <Text style={styles.itemTime}>{item.hora}</Text>
              </View>
              <View style={styles.itemRight}>
                <Text style={styles.itemAmount}>{item.monto}</Text>
              </View>
            </View>
          ))}
        </View>
<Volver route={"./Profile"} color={"black"} style={{top:20, left:10}}></Volver>
      </ScrollView>
          {/* --- MODAL DE RECARGA --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
    {step === 1 ? (
              // PASO 1: COPIAR E IR AL BANCO
              <View>
                <Text style={styles.modalTitle}>Paso 1: Pagar</Text>
                <TouchableOpacity style={styles.copyRow} onPress={() => {}}>
                  <Text style={styles.copyLabel}>Teléfono:</Text>
                  <Text style={styles.copyValue}>{datosBancarios.telefono} <Ionicons name="copy-outline" /></Text>
                </TouchableOpacity>
                
                <View style={styles.copyRow}>
                  <Text style={styles.copyLabel}>Banco:</Text>
                  <Text style={[styles.copyValue, {color: '#c57e14ff'}]}>{datosBancarios.banco}</Text>
                </View>
                <TouchableOpacity style={styles.copyAllButton} onPress={copiarTodo}>
              <Ionicons name="copy" size={20} color="#003366" />
            </TouchableOpacity>
                <TouchableOpacity style={styles.bdvButton} onPress={() => {
                 // Linking.openURL("https://bdvenlinea.banvenez.com/");
                  setStep(2); // Pasamos automáticamente al paso de registro
                }}>
                  <Text style={styles.bdvButtonText}>IR AL BANCO Y REGISTRAR</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // PASO 2: REGISTRAR DEPÓSITO
              <View>
                <Text style={styles.modalTitle}>Paso 2: Registrar Depósito</Text>
                <Text style={styles.modalSubtitle}>Sube el capture de tu transferencia</Text>
                
                <TouchableOpacity style={styles.imagePlaceholder} onPress={pickImage}>
                  {image ? (
                    <Image source={{ uri: image }} style={styles.previewImage} />
                  ) : (
                    <View style={{alignItems: 'center'}}>
                      <Ionicons name="camera" size={40} color="#666" />
                      <Text>Subir Capture</Text>
                    </View>
                  )}
                </TouchableOpacity>
                  <TextInput
                      placeholder="Últimos 6 dígitos de la referencia"
                      style={styles.input} // Crea este estilo
                      value={referencia}
                      onChangeText={setReferencia}
                      keyboardType="numeric"
                  />
                  <TextInput
                      placeholder="Monto enviado (Bs)"
                      style={styles.input}
                      value={montoInput}
                      onChangeText={setMontoInput}
                      keyboardType="numeric"
                  />
                <TouchableOpacity style={styles.validarButton} onPress={registrarYValidar}>
                  <Text style={styles.validarButtonText}>CONFIRMAR PAGO</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setStep(1)}>
                  <Text style={{textAlign: 'center', color: '#666', marginTop: 10}}>Atrás</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
          
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  scrollContent: { padding: 30 },
  greeting: { fontSize: 28, fontWeight: 'bold', marginVertical: 20, color: '#333' },
  
  // Saldo
  balanceCard: {
    backgroundColor: '#D99015',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
  },
  balanceLabel: { color: 'white', fontSize: 14 },
  balanceAmount: { color: 'white', fontSize: 22, fontWeight: 'bold', marginTop: 5 },

  // Panel Azul
  actionPanel: {
    backgroundColor: '#003366',
    flexDirection: 'row',
    borderRadius: 15,
    padding: 15,
    marginBottom: 30,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  input: {
    width: 270,
    height: 60,
    padding: 10,
    borderWidth: 1,
    borderColor: "#DFDFDF",
    borderRadius: 10,
    fontFamily: "roboto",
    fontSize: 18,
    marginVertical: 10,
  },
  actionButton: { alignItems: 'center' },
  actionText: { color: 'white', fontSize: 10, marginTop: 5, fontWeight: 'bold' },
  divider: { width: 1, height: '80%', backgroundColor: 'rgba(255,255,255,0.3)' },

  // Operaciones
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold' },
  seeAll: { color: '#D99015', fontSize: 12 },

  transactionsContainer: {
    backgroundColor: '#C82323', // El fondo rojo de la imagen
    borderRadius: 25,
    padding: 15,
    paddingTop: 25,
  },
  transactionItem: {
    backgroundColor: '#FDECEC', // Color rosado muy claro de los items
    flexDirection: 'row',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  itemLeft: { flex: 1.5 },
  itemTitle: { color: '#C82323', fontWeight: 'bold', fontSize: 16 },
  itemSubtitle: { color: '#888', fontSize: 12 },
  itemCenter: { flex: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#DDD', alignItems: 'center' },
  itemTime: { fontSize: 10, color: '#555' },
  itemRight: { flex: 1, alignItems: 'flex-end' },
  itemAmount: { color: '#C82323', fontWeight: 'bold', fontSize: 15 },

  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#EEE',
    backgroundColor: 'white'
  },

  // Estilos del Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    elevation: 10
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#003366' },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 15 },
  copyRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  copyLabel: { fontWeight: '600', color: '#333' },
  copyValue: { color: '#D99015', fontWeight: 'bold' },
  bdvButton: {
    backgroundColor: '#C82323',
    flexDirection: 'row',
    marginTop: 25,
    padding: 15,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  bdvButtonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  copyAllButton: {
    flexDirection: 'row',
    backgroundColor: '#E8F0FE', // Un azul muy claro
    borderWidth: 1,
    borderColor: '#003366',
    padding: 15,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  copyAllText: {
    color: '#003366',
    fontWeight: 'bold',
    marginLeft: 10
  },

  copyBox: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  infoText: { fontSize: 16, marginBottom: 5 },
  
  bdvButton: { backgroundColor: '#C82323', padding: 15, borderRadius: 12, marginTop: 20, alignItems: 'center' },
  bdvButtonText: { color: 'white', fontWeight: 'bold' },

  imagePlaceholder: { width: '100%', height: 150, backgroundColor: '#eee', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10, overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%' },
  
  validarButton: { backgroundColor: '#28a745', padding: 15, borderRadius: 12, marginTop: 20, alignItems: 'center' },
  validarButtonText: { color: 'white', fontWeight: 'bold' }
});