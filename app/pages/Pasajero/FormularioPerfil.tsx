import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Image, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy'; 
import { decode } from 'base64-arraybuffer';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==========================================
// 🎭 SIMULACROS DE API (KYC Light y Subsidios)
// ==========================================
const mockCompletarPerfil = async (datosPerfil) => {
  return new Promise((resolve) => {
    console.log("1. Enviando Perfil al Backend (KYC Light):", datosPerfil);
    setTimeout(() => {
      resolve({ success: true, message: "Perfil completado" });
    }, 1500); 
  });
};

// 💡 NUEVO SIMULADOR PARA EL SUBSIDIO
const mockSolicitarDescuento = async (datosDescuento) => {
  return new Promise((resolve) => {
    console.log("2. Enviando Solicitud de Subsidio Automática:", datosDescuento);
    setTimeout(() => {
      resolve({ success: true, message: "Subsidio en revisión" });
    }, 1000); 
  });
};
// ==========================================

export default function FormularioPerfil() {
  const router = useRouter();
  const [pasoActual, setPasoActual] = useState(1);
  const [enviando, setEnviando] = useState(false);

  // --- VARIABLES PASO 1 (Identidad) ---
  const [tipoDoc, setTipoDoc] = useState('V'); 
  const [cedula, setCedula] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState(''); 
  const [fechaNac, setFechaNac] = useState(new Date());
  const [fechaTexto, setFechaTexto] = useState('');
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [modalDocVisible, setModalDocVisible] = useState(false); 

  // --- VARIABLES PASO 2 (Documento) ---
  const [fotoCedula, setFotoCedula] = useState(null);

  // Lógica automática de Tercera Edad
  const edadUsuario = React.useMemo(() => {
    if (!fechaTexto) return 0;
    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const mes = hoy.getMonth() - fechaNac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
      edad--;
    }
    return edad;
  }, [fechaNac, fechaTexto]);

  const esTerceraEdad = edadUsuario >= 60; 

  const cambiarFecha = (event, fechaSeleccionada) => {
    const fechaActual = fechaSeleccionada || fechaNac;
    setMostrarCalendario(Platform.OS === 'ios'); 
    setFechaNac(fechaActual);
    const dia = fechaActual.getDate().toString().padStart(2, '0');
    const mes = (fechaActual.getMonth() + 1).toString().padStart(2, '0');
    const anio = fechaActual.getFullYear();
    setFechaTexto(`${dia}/${mes}/${anio}`);
    if (Platform.OS === 'android') setMostrarCalendario(false);
  };

  const seleccionarFotoCedula = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], 
      allowsEditing: true, 
      quality: 0.5,
    });
    if (!result.canceled) {
      setFotoCedula(result.assets[0].uri);
    }
  };

  const subirImagenASupabase = async (uri, prefijo) => {
    if (!uri) return null;
    try {
      const ext = uri.substring(uri.lastIndexOf('.') + 1) || 'jpg';
      const fileName = `${prefijo}_${Date.now()}.${ext}`;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const { error } = await supabase.storage.from('documentos_suba').upload(fileName, decode(base64), { contentType: `image/${ext}` });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('documentos_suba').getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (error) {
      console.log(`Error crítico subiendo imagen:`, error);
      return null;
    }
  };

  const avanzar = async () => {
    if (pasoActual === 1) {
      if (!cedula || !nombres || !apellidos || !telefono || !fechaTexto) { 
        Alert.alert('Faltan Datos', 'Completa todos tus datos personales para continuar.'); 
        return; 
      }
      setPasoActual(2);
    } 
    else if (pasoActual === 2) {
      if (!fotoCedula) {
        Alert.alert('Documento Requerido', 'Debes subir una foto de tu documento de identidad para validar tu cuenta.');
        return;
      }
      setPasoActual(3);
    }
    else if (pasoActual === 3) {
      setEnviando(true);
      try {
        const sessionString = await AsyncStorage.getItem('@Sesion_usuario');
        if (!sessionString) {
          Alert.alert('Error de Sesión', 'No pudimos identificar tu cuenta. Inicia sesión de nuevo.');
          setEnviando(false); return;
        }

        const urlCedula = await subirImagenASupabase(fotoCedula, 'cedula_kyc');
        const documentoCompleto = `${tipoDoc}-${cedula}`;

        // 🧠 1. PAYLOAD KYC: Lo que pide el backend para actualizar el usuario
        const payloadBackend = {
          fullName: `${nombres} ${apellidos}`,
          cedula: documentoCompleto, 
          phone: telefono, 
          birthDate: fechaNac.toISOString(), 
          idDocumentImageUrl: urlCedula 
        };

        await mockCompletarPerfil(payloadBackend);

        // 💡 2. MAGIA AUTOMÁTICA: Si es Tercera Edad, disparamos el subsidio
        if (esTerceraEdad) {
          const payloadSubsidio = {
            discountType: 'tercera_edad',
            documentType: 'cedula_senior',
            documentNumber: documentoCompleto, 
            documentImageUrl: urlCedula
          };
          await mockSolicitarDescuento(payloadSubsidio);
        }

        await AsyncStorage.setItem('@Perfil_Completado', 'true');

        Alert.alert(
          '¡Billetera Activada!', 
          esTerceraEdad 
            ? 'Tu perfil está completo. Se ha enviado automáticamente tu cédula para aprobar tu exoneración de Tercera Edad.' 
            : 'Tu perfil está completo. Ya puedes usar los servicios de recarga y pagos.', 
          [{ text: 'Ir a mi Billetera', onPress: () => router.back() }]
        );

      } catch (error) {
        Alert.alert('Error de conexión', 'No pudimos activar la billetera. Intenta de nuevo.');
        console.log(error);
      } finally {
        setEnviando(false);
      }
    }
  };

  const retroceder = () => {
    if (pasoActual === 1) router.back();
    else setPasoActual(pasoActual - 1);
  };

  const renderPaso1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconWrapper}><FontAwesome6 name="id-card-clip" size={50} color="#023A73" /></View>
      <Text style={styles.title}>Completa tu Perfil</Text>
      <Text style={styles.subtitle}>Necesitamos unos datos básicos para habilitar tus funciones financieras.</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Documento de Identidad</Text>
        <View style={styles.cedulaContainer}>
          <TouchableOpacity style={styles.cedulaPrefix} onPress={() => setModalDocVisible(true)}>
            <Text style={styles.cedulaPrefixText}>{tipoDoc}</Text>
            <FontAwesome6 name="chevron-down" size={12} color="#023A73" style={{marginLeft: 5}} />
          </TouchableOpacity>
          <TextInput 
            style={styles.cedulaInput} 
            placeholder="Ej: 28123456" 
            keyboardType={tipoDoc === 'P' ? 'default' : 'numeric'} 
            autoCapitalize="characters"
            value={cedula} 
            onChangeText={setCedula} 
          />
        </View>
      </View>

      <View style={styles.rowInputs}>
        <View style={[styles.inputGroup, { flex: 1 }]}><Text style={styles.label}>Nombres</Text><TextInput style={styles.input} placeholder="Ej: Ana Maria" value={nombres} onChangeText={setNombres} autoCapitalize="words" /></View>
        <View style={[styles.inputGroup, { flex: 1 }]}><Text style={styles.label}>Apellidos</Text><TextInput style={styles.input} placeholder="Ej: Pérez" value={apellidos} onChangeText={setApellidos} autoCapitalize="words" /></View>
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Número de Teléfono</Text>
        <TextInput style={styles.input} placeholder="Ej: 04141234567" keyboardType="numeric" maxLength={11} value={telefono} onChangeText={setTelefono} />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Fecha de Nacimiento</Text>
        <TouchableOpacity style={styles.inputDate} onPress={() => setMostrarCalendario(true)}><Text style={fechaTexto ? styles.dateText : styles.datePlaceholder}>{fechaTexto || "Seleccionar fecha..."}</Text><FontAwesome6 name="calendar-day" size={20} color="#999" /></TouchableOpacity>
        {mostrarCalendario && (
          <DateTimePicker value={fechaNac} mode="date" display="default" onChange={cambiarFecha} maximumDate={new Date()} minimumDate={new Date(1900, 0, 1)} />
        )}
      </View>
    </View>
  );

  const renderPaso2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconWrapper}><FontAwesome6 name="camera-retro" size={50} color="#023A73" /></View>
      <Text style={styles.title}>Foto de Identidad</Text>
      <Text style={styles.subtitle}>Sube una foto clara de tu documento para validar tu cuenta en el sistema SUBA.</Text>
      
      <TouchableOpacity style={styles.fotoBtn} onPress={seleccionarFotoCedula}>
        {fotoCedula ? (
          <Image source={{ uri: fotoCedula }} style={styles.fotoPreview} />
        ) : (
          <View style={styles.fotoPlaceholder}>
            <FontAwesome6 name="id-card" size={32} color="#999" />
            <Text style={styles.fotoPlaceholderText}>Toca para subir la foto</Text>
          </View>
        )}
      </TouchableOpacity>
      {esTerceraEdad && (
        <Text style={{textAlign: 'center', color: '#16A34A', marginTop: 10, paddingHorizontal: 20}}>
          <FontAwesome6 name="circle-info" /> Al tener más de 60 años, usaremos esta foto para procesar tu subsidio automáticamente.
        </Text>
      )}
    </View>
  );

  const renderPaso3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconWrapper}><FontAwesome6 name="clipboard-check" size={50} color="#023A73" /></View>
      <Text style={styles.title}>Confirmación</Text>
      <Text style={styles.subtitle}>Verifica que tus datos sean correctos. La información no podrá ser modificada fácilmente después.</Text>

      <View style={styles.resumenCard}>
        <Text style={styles.resumenSectionTitle}>Datos de Identidad</Text>
        <View style={styles.resumenFila}><Text style={styles.resumenLabel}>Documento:</Text><Text style={styles.resumenValor}>{tipoDoc}-{cedula}</Text></View>
        <View style={styles.resumenFila}><Text style={styles.resumenLabel}>Nombre:</Text><Text style={styles.resumenValor}>{nombres} {apellidos}</Text></View>
        <View style={styles.resumenFila}><Text style={styles.resumenLabel}>Teléfono:</Text><Text style={styles.resumenValor}>{telefono}</Text></View>
        <View style={styles.resumenFila}><Text style={styles.resumenLabel}>Nacimiento:</Text><Text style={styles.resumenValor}>{fechaTexto}</Text></View>
        <View style={{marginTop: 10}}>
          <Text style={styles.resumenLabel}>Documento Adjunto:</Text>
          {fotoCedula && <Image source={{ uri: fotoCedula }} style={styles.resumenMiniatura} />}
        </View>
      </View>

      <View style={[styles.resumenCard, { backgroundColor: esTerceraEdad ? '#F0FDF4' : '#FAFAFA', borderColor: esTerceraEdad ? '#BBF7D0' : '#DFDFDF' }]}>
        <Text style={[styles.resumenSectionTitle, { color: esTerceraEdad ? '#166534' : '#023A73', borderBottomColor: esTerceraEdad ? '#BBF7D0' : '#DFDFDF' }]}>Beneficio de Transporte</Text>
        {esTerceraEdad ? (
          <View>
            <View style={[styles.resumenFila, {marginBottom: 5}]}><Text style={styles.resumenLabel}>Condición:</Text><Text style={[styles.resumenValor, {color: '#16A34A'}]}>Tercera Edad (60+)</Text></View>
            <Text style={{fontSize: 13, color: '#15803D', marginTop: 5}}>Al activar tu billetera, enviaremos tu documento para aprobar la exoneración de pasaje.</Text>
          </View>
        ) : (
          <View>
            <Text style={styles.resumenValor}>Tarifa General</Text>
            <Text style={{fontSize: 13, color: '#64748B', marginTop: 8}}>Si eres estudiante o posees alguna discapacidad, podrás solicitar tu subsidio desde las opciones de tu Billetera.</Text>
          </View>
        )}
      </View>
      <View style={{height: 20}} />
    </View>
  );

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={retroceder} style={styles.backButton} disabled={enviando}><FontAwesome6 name="arrow-left" size={24} color={enviando ? "#ccc" : "#023A73"} /></TouchableOpacity>
          <View style={styles.progressContainer}><View style={[styles.progressBar, { width: `${(pasoActual / 3) * 100}%` }]} /></View>
          <Text style={styles.stepText}>{pasoActual}/3</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {pasoActual === 1 && renderPaso1()}
          {pasoActual === 2 && renderPaso2()}
          {pasoActual === 3 && renderPaso3()}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.button} onPress={avanzar} disabled={enviando}>
            {enviando ? (
              <ActivityIndicator color="#023A73" size="small" />
            ) : (
              <Text style={styles.buttonText}>{pasoActual === 3 ? 'ACTIVAR BILLETERA' : 'SIGUIENTE'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={modalDocVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tipo de Documento</Text>
            <TouchableOpacity style={styles.modalOption} onPress={() => { setTipoDoc('V'); setModalDocVisible(false); }}>
              <Text style={styles.modalOptionText}>V - Venezolano</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => { setTipoDoc('E'); setModalDocVisible(false); }}>
              <Text style={styles.modalOptionText}>E - Extranjero</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalOption, {borderBottomWidth: 0}]} onPress={() => { setTipoDoc('P'); setModalDocVisible(false); }}>
              <Text style={styles.modalOptionText}>P - Pasaporte</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 10 },
  backButton: { padding: 5, marginRight: 15 },
  progressContainer: { flex: 1, height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden', marginRight: 15 },
  progressBar: { height: '100%', backgroundColor: '#FFA311' },
  stepText: { fontSize: 14, fontWeight: 'bold', color: '#544F4F' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 30, paddingTop: 30, paddingBottom: 30, justifyContent: 'center' },
  stepContainer: { flex: 1 },
  iconWrapper: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#212121', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#544F4F', textAlign: 'center', marginBottom: 30, lineHeight: 24 },
  
  rowInputs: { flexDirection: 'row', gap: 15 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#023A73', marginBottom: 8, marginLeft: 5 },
  input: { width: '100%', height: 60, padding: 15, borderWidth: 1, borderColor: '#DFDFDF', borderRadius: 15, fontSize: 16, color: '#212121', backgroundColor: '#FAFAFA' },
  inputDate: { width: '100%', height: 60, padding: 15, borderWidth: 1, borderColor: '#DFDFDF', borderRadius: 15, backgroundColor: '#FAFAFA', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateText: { fontSize: 16, color: '#212121' },
  datePlaceholder: { fontSize: 16, color: '#999' },
  
  cedulaContainer: { flexDirection: 'row', height: 60, borderWidth: 1, borderColor: '#DFDFDF', borderRadius: 15, backgroundColor: '#FAFAFA', overflow: 'hidden' },
  cedulaPrefix: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRightWidth: 1, borderRightColor: '#DFDFDF', backgroundColor: '#F0F5FA', justifyContent: 'center' },
  cedulaPrefixText: { fontSize: 16, fontWeight: 'bold', color: '#023A73' },
  cedulaInput: { flex: 1, paddingHorizontal: 15, fontSize: 16, color: '#212121' },

  fotoBtn: { width: '100%', height: 180, borderRadius: 15, overflow: 'hidden', borderWidth: 2, borderColor: '#DFDFDF', backgroundColor: '#FAFAFA', borderStyle: 'dashed', marginTop: 10, marginBottom: 10 },
  fotoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 15 },
  fotoPlaceholderText: { color: '#666', fontSize: 15, fontWeight: '500' },
  fotoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },

  resumenCard: { backgroundColor: '#FAFAFA', padding: 20, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#DFDFDF' },
  resumenSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#023A73', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#DFDFDF', paddingBottom: 5 },
  resumenFila: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  resumenLabel: { fontSize: 15, color: '#544F4F' },
  resumenValor: { fontSize: 15, fontWeight: 'bold', color: '#212121' },
  resumenMiniatura: { width: '100%', height: 100, borderRadius: 10, resizeMode: 'cover', borderWidth: 1, borderColor: '#DFDFDF', marginTop: 8 }, 

  footer: { paddingHorizontal: 30, paddingBottom: Platform.OS === 'ios' ? 40 : 30, paddingTop: 15, backgroundColor: '#FFFFFF' },
  button: { backgroundColor: '#FFA311', width: '100%', height: 60, borderRadius: 100, justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 4 },
  buttonText: { color: '#023A73', fontSize: 16, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, width: '80%', padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#023A73', marginBottom: 15 },
  modalOption: { width: '100%', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center' },
  modalOptionText: { fontSize: 16, color: '#212121' }
});