import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Alert, Image, Modal, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy'; 
import { decode } from 'base64-arraybuffer';
import { getuserid } from '../../Components/AsyncStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BANCOS_VENEZUELA = [
  "Banco de Venezuela (0102)", "Banesco (0134)", "Mercantil (0105)", "Provincial (0108)", 
  "BNC (0191)", "Bancaribe (0114)", "Bicentenario (0175)", "Tesoro (0163)", 
  "Exterior (0115)", "Bancamiga (0172)", "Banplus (0174)", "Plaza (0138)", "Otro"
];

export default function FormularioSolicitud() {
  const router = useRouter();
  const [pasoActual, setPasoActual] = useState(1);
  const [enviando, setEnviando] = useState(false);

  // --- VARIABLES PASO 1 ---
  const [cedula, setCedula] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState(''); 
  const [fechaNac, setFechaNac] = useState(new Date());
  const [fechaTexto, setFechaTexto] = useState('');
  const [mostrarCalendario, setMostrarCalendario] = useState(false);

  // 🧠 LÓGICA AUTOMÁTICA DE EDAD Y TERCERA EDAD
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

  const esTerceraEdad = edadUsuario >= 60; // En Venezuela, consideramos 60+ años

  const cambiarFecha = (event: any, fechaSeleccionada?: Date) => {
    const fechaActual = fechaSeleccionada || fechaNac;
    setMostrarCalendario(Platform.OS === 'ios'); 
    setFechaNac(fechaActual);
    const dia = fechaActual.getDate().toString().padStart(2, '0');
    const mes = (fechaActual.getMonth() + 1).toString().padStart(2, '0');
    const anio = fechaActual.getFullYear();
    setFechaTexto(`${dia}/${mes}/${anio}`);
    if (Platform.OS === 'android') setMostrarCalendario(false);
  };

  // --- VARIABLES PASO 2 ---
  const [tieneSubsidio, setTieneSubsidio] = useState<boolean | null>(null); 
  const [esEstudiante, setEsEstudiante] = useState(false);
  const [esDiscapacitado, setEsDiscapacitado] = useState(false);
  const [fotoEstudiante, setFotoEstudiante] = useState<string | null>(null);
  const [fotoDiscapacidad, setFotoDiscapacidad] = useState<string | null>(null);

  // --- VARIABLES PASO 3 ---
  const [bancoOrigen, setBancoOrigen] = useState('');
  const [referenciaPago, setReferenciaPago] = useState('');
  const [fotoPago, setFotoPago] = useState<string | null>(null);
  const [modalBancosVisible, setModalBancosVisible] = useState(false);

  const seleccionarFoto = async (tipo: 'ESTUDIANTE' | 'DISCAPACIDAD' | 'PAGO') => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, quality: 0.5,
    });
    if (!result.canceled) {
      if (tipo === 'ESTUDIANTE') setFotoEstudiante(result.assets[0].uri);
      if (tipo === 'DISCAPACIDAD') setFotoDiscapacidad(result.assets[0].uri);
      if (tipo === 'PAGO') setFotoPago(result.assets[0].uri);
    }
  };

  const copiarDatoIndividual = async (nombreDato: string, valor: string) => { await Clipboard.setStringAsync(valor); };
  const copiarTodo = async () => { await Clipboard.setStringAsync(`Pago Móvil SUBA\nBanco: 0134 (Banesco)\nTeléfono: 04141234567\nCédula: J123456789\nMonto: 50,00 Bs`); };

  const subirImagenASupabase = async (uri: string, prefijo: string) => {
    if (!uri) return null;
    try {
      const ext = uri.substring(uri.lastIndexOf('.') + 1) || 'jpg';
      const fileName = `${prefijo}_${Date.now()}.${ext}`;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const { data, error } = await supabase.storage.from('documentos_suba').upload(fileName, decode(base64), { contentType: `image/${ext}` });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('documentos_suba').getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (error) {
      console.log(`Error crítico subiendo imagen (${prefijo}):`, error);
      return null;
    }
  };

  // --- LÓGICA DE AVANCE Y ENVÍO ---
  const avanzar = async () => {
    if (pasoActual === 1) {
      if (!cedula || !nombres || !apellidos || !telefono || !fechaTexto) { Alert.alert('Faltan Datos', 'Completa todos tus datos personales.'); return; }
      setPasoActual(2);
    } 
    else if (pasoActual === 2) {
      if (tieneSubsidio === true) {
        if (!esEstudiante && !esDiscapacitado) {
          Alert.alert('¿Continuar sin subsidio extra?', 'Si seleccionaste SÍ pero no marcas condición, avanzaremos. Si eres Tercera Edad, se aplicará automáticamente.', [
            { text: 'Elegir condición', style: 'cancel' },
            { text: 'Avanzar', onPress: () => { setTieneSubsidio(false); setPasoActual(3); } }
          ]); return;
        }
        if (esEstudiante && !fotoEstudiante) { Alert.alert('Falta Constancia', 'Adjunta tu constancia de estudio.'); return; }
        if (esDiscapacitado && !fotoDiscapacidad) { Alert.alert('Falta Certificado', 'Adjunta tu certificado de discapacidad.'); return; }
      }
      setPasoActual(3); 
    } 
    else if (pasoActual === 3) {
      if (!bancoOrigen || !referenciaPago) { Alert.alert('Faltan Datos', 'Ingresa tu banco y la referencia.'); return; }
      if (referenciaPago.length < 6) { Alert.alert('Referencia Inválida', 'La referencia debe tener al menos 6 dígitos.'); return; }
      if (!fotoPago) { Alert.alert('Falta el Capture', 'Sube la captura de tu pago móvil.'); return; }
      setPasoActual(4);
    }
    else if (pasoActual === 4) {
      setEnviando(true);
      try {
        // 🧠 Leemos la memoria directamente, sin usar el helper global
        const sessionString = await AsyncStorage.getItem('@Sesion_usuario');
        if (!sessionString) {
          Alert.alert('Error de Sesión', 'No pudimos identificar tu cuenta. Por favor, inicia sesión de nuevo.');
          setEnviando(false);
          return;
        }

        const sessionData = JSON.parse(sessionString);
        // Sacamos el ID usando la lógica segura de forma local
        const miUsuarioId = sessionData.id || sessionData._id;

        if (!miUsuarioId) {
           Alert.alert('Error de Sesión', 'ID de usuario no encontrado en la memoria.');
           setEnviando(false);
           return;
        }

        const urlEstudiante = fotoEstudiante ? await subirImagenASupabase(fotoEstudiante, 'estudiante') : null;
        const urlDiscapacidad = fotoDiscapacidad ? await subirImagenASupabase(fotoDiscapacidad, 'discapacidad') : null;
        const urlPago = fotoPago ? await subirImagenASupabase(fotoPago, 'pago') : null;

        const { error } = await supabase.from('solicitudes_tarjetas').insert([{
          user_id: miUsuarioId.trim(), // 👈 AQUÍ PONEMOS EL ID REAL
          cedula: cedula,
          nombre_completo: `${nombres} ${apellidos}`,
          telefono: telefono,
          fecha_nacimiento: fechaTexto,
          tiene_subsidio: tieneSubsidio === true || esTerceraEdad,
          es_tercera_edad: esTerceraEdad,
          es_estudiante: esEstudiante,
          constancia_estudio_url: urlEstudiante,
          es_discapacitado: esDiscapacitado,
          constancia_discapacidad_url: urlDiscapacidad,
          banco_origen: bancoOrigen,
          referencia_pago: referenciaPago,
          captura_pago_url: urlPago,
          estado: 'pendiente_revision'
        }]);

        if (error) throw error;

        Alert.alert('¡Solicitud Enviada!', 'Tus datos están en revisión. Te avisaremos cuando tu tarjeta sea aprobada.', [
          { text: 'Entendido', onPress: () => router.back() }
        ]);

      } catch (error) {
        Alert.alert('Error de conexión', 'No pudimos enviar la solicitud. Intenta de nuevo.');
        console.log(error);
      } finally {
        setEnviando(false);
      }
    }
  };

  const retroceder = () => {
    if (pasoActual === 1) router.back();
    else if (pasoActual === 2) { if (tieneSubsidio === true) setTieneSubsidio(null); else setPasoActual(1); }
    else if (pasoActual === 3) { setTieneSubsidio(null); setPasoActual(2); }
    else setPasoActual(pasoActual - 1);
  };

  const renderPaso1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconWrapper}><FontAwesome6 name="id-card" size={50} color="#023A73" /></View>
      <Text style={styles.title}>Tus Datos Personales</Text>
      <Text style={styles.subtitle}>Verifica tu identidad para asociarla a tu nueva tarjeta SUBA.</Text>
      <View style={styles.inputGroup}><Text style={styles.label}>Cédula de Identidad</Text><TextInput style={styles.input} placeholder="Ej: 28123456" keyboardType="numeric" value={cedula} onChangeText={setCedula} /></View>
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
          <DateTimePicker 
            value={fechaNac} 
            mode="date" 
            display="default" 
            onChange={cambiarFecha} 
            maximumDate={new Date()} // No pueden nacer en el futuro
            minimumDate={new Date(1900, 0, 1)} // 👈 LA LÍNEA MÁGICA (Desde el 1 de Enero de 1900)
          />
        )}
      </View>
    </View>
  );

  const renderPaso2 = () => {
    if (tieneSubsidio === null) {
      return (
        <View style={styles.stepContainer}>
          <View style={styles.iconWrapper}><FontAwesome6 name="hand-holding-heart" size={50} color="#023A73" /></View>
          <Text style={styles.title}>Optación para Subsidio</Text>
          <Text style={styles.subtitle}>Conoce los beneficios disponibles para los usuarios de SUBA.</Text>
          <View style={styles.infoCardMid}><View style={styles.infoHeaderMid}><FontAwesome6 name="book-open" size={20} color="#023A73" /><Text style={styles.infoTitleMid}>Estudiante Activo</Text></View><Text style={styles.infoTextMid}>Otorga 50% de descuento. Requiere validación de constancia de estudios o carnet vigente.</Text></View>
          <View style={styles.infoCardMid}><View style={styles.infoHeaderMid}><FontAwesome6 name="wheelchair" size={20} color="#023A73" /><Text style={styles.infoTitleMid}>Discapacidad</Text></View><Text style={styles.infoTextMid}>Exoneración total (100%). Requiere subir el certificado emitido por CONAPDIS.</Text></View>
          <View style={[styles.infoCardMid, {backgroundColor: '#E5F0FF'}]}><View style={styles.infoHeaderMid}><FontAwesome6 name="person-cane" size={20} color="#023A73" /><Text style={styles.infoTitleMid}>Tercera Edad (60+ años)</Text></View><Text style={styles.infoTextMid}>Este beneficio (100% de exoneración) se aplica de forma automática al detectar tu fecha de nacimiento.</Text></View>
        </View>
      );
    }
    return (
      <View style={styles.stepContainer}>
        <View style={styles.iconWrapper}><FontAwesome6 name="file-arrow-up" size={50} color="#023A73" /></View>
        <Text style={styles.title}>Adjuntar Recaudos</Text>
        <Text style={styles.subtitle}>Selecciona tu condición y sube una foto clara de tu soporte.</Text>
        <View style={styles.subsidioOpciones}>
          <TouchableOpacity style={[styles.opcionBtn, esEstudiante && styles.opcionBtnActive]} onPress={() => setEsEstudiante(!esEstudiante)}><FontAwesome6 name="book-open" size={20} color={esEstudiante ? "#023A73" : "#999"} /><Text style={[styles.opcionText, esEstudiante && styles.opcionTextActive]}>Estudiante Activo</Text>{esEstudiante && <FontAwesome6 name="circle-check" size={20} color="#023A73" style={{marginLeft: 'auto'}} />}</TouchableOpacity>
          {esEstudiante && (<TouchableOpacity style={styles.fotoBtn} onPress={() => seleccionarFoto('ESTUDIANTE')}>{fotoEstudiante ? <Image source={{ uri: fotoEstudiante }} style={styles.fotoPreview} /> : <View style={styles.fotoPlaceholder}><FontAwesome6 name="camera" size={24} color="#999" /><Text style={styles.fotoPlaceholderText}>Subir Constancia</Text></View>}</TouchableOpacity>)}
          <TouchableOpacity style={[styles.opcionBtn, {marginTop: 15}, esDiscapacitado && styles.opcionBtnActive]} onPress={() => setEsDiscapacitado(!esDiscapacitado)}><FontAwesome6 name="wheelchair" size={20} color={esDiscapacitado ? "#023A73" : "#999"} /><Text style={[styles.opcionText, esDiscapacitado && styles.opcionTextActive]}>Certificado Discapacidad</Text>{esDiscapacitado && <FontAwesome6 name="circle-check" size={20} color="#023A73" style={{marginLeft: 'auto'}} />}</TouchableOpacity>
          {esDiscapacitado && (<TouchableOpacity style={styles.fotoBtn} onPress={() => seleccionarFoto('DISCAPACIDAD')}>{fotoDiscapacidad ? <Image source={{ uri: fotoDiscapacidad }} style={styles.fotoPreview} /> : <View style={styles.fotoPlaceholder}><FontAwesome6 name="camera" size={24} color="#999" /><Text style={styles.fotoPlaceholderText}>Subir Certificado</Text></View>}</TouchableOpacity>)}
        </View>
      </View>
    );
  };

  const renderPaso3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconWrapper}><FontAwesome6 name="money-bill-transfer" size={50} color="#023A73" /></View>
      <Text style={styles.title}>Pago de Emisión</Text>
      <Text style={styles.subtitle}>Realiza el pago móvil para la emisión del plástico de tu tarjeta SUBA.</Text>
      <View style={styles.pagoCard}>
        <View style={styles.pagoMontoContainer}><Text style={styles.pagoMonto}>50,00 Bs</Text><TouchableOpacity style={styles.iconCopyBox} onPress={() => copiarDatoIndividual('Monto', '50.00')}><FontAwesome6 name="copy" size={16} color="#0661BC" /></TouchableOpacity></View>
        <View style={styles.pagoDetalleFila}><Text style={styles.pagoLabel}>Banco:</Text><View style={styles.datoCopiar}><Text style={styles.pagoValor}>Banesco (0134)</Text><TouchableOpacity onPress={() => copiarDatoIndividual('Banco', '0134')}><FontAwesome6 name="copy" size={16} color="#0661BC" /></TouchableOpacity></View></View>
        <View style={styles.pagoDetalleFila}><Text style={styles.pagoLabel}>Teléfono:</Text><View style={styles.datoCopiar}><Text style={styles.pagoValor}>0414-1234567</Text><TouchableOpacity onPress={() => copiarDatoIndividual('Teléfono', '04141234567')}><FontAwesome6 name="copy" size={16} color="#0661BC" /></TouchableOpacity></View></View>
        <View style={styles.pagoDetalleFila}><Text style={styles.pagoLabel}>Cédula / RIF:</Text><View style={styles.datoCopiar}><Text style={styles.pagoValor}>J-12345678-9</Text><TouchableOpacity onPress={() => copiarDatoIndividual('Cédula', 'J123456789')}><FontAwesome6 name="copy" size={16} color="#0661BC" /></TouchableOpacity></View></View>
        <TouchableOpacity style={styles.btnCopiarTodo} onPress={copiarTodo}><FontAwesome6 name="copy" size={14} color="#FFFFFF" /><Text style={styles.btnCopiarTodoText}>Copiar todos los datos</Text></TouchableOpacity>
      </View>
      <View style={styles.inputGroup}><Text style={styles.label}>Banco de Origen</Text><TouchableOpacity style={styles.inputDate} onPress={() => setModalBancosVisible(true)}><Text style={bancoOrigen ? styles.dateText : styles.datePlaceholder}>{bancoOrigen || "Selecciona tu banco..."}</Text><FontAwesome6 name="chevron-down" size={16} color="#999" /></TouchableOpacity></View>
      <View style={styles.inputGroup}><Text style={styles.label}>N° de Referencia</Text><TextInput style={styles.input} placeholder="Pega la referencia completa (mín. 6 dígitos)" keyboardType="numeric" maxLength={20} value={referenciaPago} onChangeText={setReferenciaPago} /></View>
      <Text style={styles.label}>Capture del Pago (Requerido)</Text>
      <TouchableOpacity style={styles.fotoBtn} onPress={() => seleccionarFoto('PAGO')}>{fotoPago ? <Image source={{ uri: fotoPago }} style={styles.fotoPreview} /> : <View style={styles.fotoPlaceholder}><FontAwesome6 name="image" size={24} color="#999" /><Text style={styles.fotoPlaceholderText}>Subir captura de pantalla</Text></View>}</TouchableOpacity>
      <View style={{height: 20}} /> 
    </View>
  );

  const renderPaso4 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconWrapper}><FontAwesome6 name="clipboard-check" size={50} color="#023A73" /></View>
      <Text style={styles.title}>Resumen de Solicitud</Text>
      <Text style={styles.subtitle}>Verifica que todos tus datos sean correctos antes de enviar.</Text>

      <View style={styles.resumenCard}>
        <Text style={styles.resumenSectionTitle}>Datos Personales</Text>
        <View style={styles.resumenFila}><Text style={styles.resumenLabel}>Cédula:</Text><Text style={styles.resumenValor}>{cedula}</Text></View>
        <View style={styles.resumenFila}><Text style={styles.resumenLabel}>Nombre:</Text><Text style={styles.resumenValor}>{nombres} {apellidos}</Text></View>
        <View style={styles.resumenFila}><Text style={styles.resumenLabel}>Teléfono:</Text><Text style={styles.resumenValor}>{telefono}</Text></View>
        <View style={styles.resumenFila}><Text style={styles.resumenLabel}>Nacimiento:</Text><Text style={styles.resumenValor}>{fechaTexto}</Text></View>
        {/* 🧠 AQUÍ MOSTRAMOS LA EDAD CALCULADA */}
        <View style={styles.resumenFila}><Text style={styles.resumenLabel}>Edad calculada:</Text><Text style={styles.resumenValor}>{edadUsuario} años</Text></View>
      </View>

      <View style={styles.resumenCard}>
        <Text style={styles.resumenSectionTitle}>Perfil de Subsidio</Text>
        
        {/* 🧠 EL TEXTO VERDE DE APROBACIÓN AUTOMÁTICA */}
        {esTerceraEdad && (
          <View style={[styles.resumenFila, {marginBottom: 15}]}>
            <Text style={styles.resumenLabel}>Tercera Edad (60+):</Text>
            <Text style={[styles.resumenValor, {color: '#28a745'}]}>Aprobado Automático</Text>
          </View>
        )}

        {!esEstudiante && !esDiscapacitado && !esTerceraEdad ? (
          <Text style={styles.resumenValor}>Ninguno / General</Text>
        ) : (
          <>
            {esEstudiante && (
              <View style={styles.resumenColumna}>
                <Text style={styles.resumenLabel}>Constancia Estudiantil:</Text>
                {fotoEstudiante && <Image source={{ uri: fotoEstudiante }} style={styles.resumenMiniatura} />}
              </View>
            )}
            {esDiscapacitado && (
              <View style={[styles.resumenColumna, {marginTop: esEstudiante ? 15 : 0}]}>
                <Text style={styles.resumenLabel}>Certificado Discapacidad:</Text>
                {fotoDiscapacidad && <Image source={{ uri: fotoDiscapacidad }} style={styles.resumenMiniatura} />}
              </View>
            )}
          </>
        )}
      </View>

      <View style={styles.resumenCard}>
        <Text style={styles.resumenSectionTitle}>Pago de Emisión</Text>
        <View style={styles.resumenFila}><Text style={styles.resumenLabel}>Banco:</Text><Text style={styles.resumenValor}>{bancoOrigen}</Text></View>
        <View style={styles.resumenFila}><Text style={styles.resumenLabel}>Referencia:</Text><Text style={styles.resumenValor}>{referenciaPago}</Text></View>
        <View style={styles.resumenColumna}>
          <Text style={styles.resumenLabel}>Capture del Pago:</Text>
          {fotoPago && <Image source={{ uri: fotoPago }} style={styles.resumenMiniatura} />}
        </View>
      </View>
      <View style={{height: 20}} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={retroceder} style={styles.backButton} disabled={enviando}><FontAwesome6 name="arrow-left" size={24} color={enviando ? "#ccc" : "#023A73"} /></TouchableOpacity>
          <View style={styles.progressContainer}><View style={[styles.progressBar, { width: `${(pasoActual / 4) * 100}%` }]} /></View>
          <Text style={styles.stepText}>{pasoActual}/4</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {pasoActual === 1 && renderPaso1()}
          {pasoActual === 2 && renderPaso2()}
          {pasoActual === 3 && renderPaso3()}
          {pasoActual === 4 && renderPaso4()}
        </ScrollView>

        <View style={styles.footer}>
          {pasoActual === 2 && tieneSubsidio === null ? (
            <View>
              <Text style={styles.preguntaFija}>¿Posees alguna de estas condiciones extras?</Text>
              <View style={styles.rowButtonsFooter}>
                <TouchableOpacity style={styles.btnNo} onPress={() => { setTieneSubsidio(false); setEsEstudiante(false); setEsDiscapacitado(false); setFotoEstudiante(null); setFotoDiscapacidad(null); setPasoActual(3); }}><Text style={styles.btnTextNo}>NO</Text></TouchableOpacity>
                <TouchableOpacity style={styles.btnSi} onPress={() => setTieneSubsidio(true)}><Text style={styles.btnTextSi}>SÍ</Text></TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.button} onPress={avanzar} disabled={enviando}>
              {enviando ? (
                <ActivityIndicator color="#023A73" size="small" />
              ) : (
                <Text style={styles.buttonText}>{pasoActual === 4 ? 'ENVIAR SOLICITUD' : 'SIGUIENTE'}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      <Modal visible={modalBancosVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecciona tu Banco</Text>
            <ScrollView style={{width: '100%'}}>
              {BANCOS_VENEZUELA.map((banco, index) => (
                <TouchableOpacity key={index} style={styles.modalOption} onPress={() => { setBancoOrigen(banco); setModalBancosVisible(false); }}>
                  <Text style={styles.modalOptionText}>{banco}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalBancosVisible(false)}><Text style={styles.modalCloseText}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 20, paddingBottom: 10 },
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
  
  infoCardMid: { backgroundColor: '#F0F5FA', padding: 20, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#E5F0FF' },
  infoHeaderMid: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  infoTitleMid: { fontSize: 17, fontWeight: 'bold', color: '#023A73' },
  infoTextMid: { fontSize: 15, color: '#544F4F', lineHeight: 22 },
  
  subsidioOpciones: { marginTop: 10 },
  opcionBtn: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#DFDFDF', gap: 15 },
  opcionBtnActive: { borderColor: '#023A73', borderWidth: 2, backgroundColor: '#F0F5FA' },
  opcionText: { fontSize: 16, color: '#544F4F', fontWeight: '500' },
  opcionTextActive: { color: '#023A73', fontWeight: 'bold' },
  fotoBtn: { width: '100%', height: 100, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#DFDFDF', backgroundColor: '#FAFAFA', borderStyle: 'dashed', marginTop: 10, marginBottom: 20 },
  fotoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10 },
  fotoPlaceholderText: { color: '#999', fontSize: 14, fontWeight: '500' },
  fotoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },

  pagoCard: { backgroundColor: '#F9FBFF', padding: 20, borderRadius: 15, marginBottom: 25, borderWidth: 1, borderColor: '#E5F0FF', alignItems: 'center' },
  pagoMontoContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 15 },
  pagoMonto: { fontSize: 32, fontWeight: 'bold', color: '#023A73' },
  iconCopyBox: { padding: 8, backgroundColor: '#E5F0FF', borderRadius: 8 },
  pagoDetalleFila: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F5FA' },
  pagoLabel: { fontSize: 16, color: '#544F4F', fontWeight: '500' },
  datoCopiar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pagoValor: { fontSize: 16, fontWeight: 'bold', color: '#212121' },
  btnCopiarTodo: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0661BC', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 100, marginTop: 15 },
  btnCopiarTodoText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },

  resumenCard: { backgroundColor: '#FAFAFA', padding: 20, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#DFDFDF' },
  resumenSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#023A73', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#DFDFDF', paddingBottom: 5 },
  resumenFila: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  resumenColumna: { flexDirection: 'column', marginTop: 5, gap: 8 }, 
  resumenLabel: { fontSize: 15, color: '#544F4F' },
  resumenValor: { fontSize: 15, fontWeight: 'bold', color: '#212121' },
  resumenMiniatura: { width: '100%', height: 120, borderRadius: 10, resizeMode: 'cover', borderWidth: 1, borderColor: '#DFDFDF', marginTop: 5 }, 

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, maxHeight: '60%', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#023A73', marginBottom: 15 },
  modalOption: { width: '100%', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalOptionText: { fontSize: 18, color: '#212121', textAlign: 'center' },
  modalCloseBtn: { marginTop: 15, padding: 15, width: '100%', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 15 },
  modalCloseText: { fontSize: 16, fontWeight: 'bold', color: '#FF3B30' },

  footer: { paddingHorizontal: 30, paddingBottom: Platform.OS === 'ios' ? 40 : 30, paddingTop: 15, backgroundColor: '#FFFFFF' },
  preguntaFija: { fontSize: 16, textAlign: 'center', fontWeight: 'bold', color: '#212121', marginBottom: 15 },
  rowButtonsFooter: { flexDirection: 'row', justifyContent: 'space-between', gap: 15 },
  btnNo: { flex: 1, height: 60, borderWidth: 2, borderColor: '#DFDFDF', borderRadius: 15, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  btnSi: { flex: 1, height: 60, borderRadius: 15, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFA311', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 4 },
  btnTextNo: { fontSize: 16, fontWeight: 'bold', color: '#999' },
  btnTextSi: { fontSize: 16, fontWeight: 'bold', color: '#023A73' },
  button: { backgroundColor: '#FFA311', width: '100%', height: 60, borderRadius: 100, justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 4 },
  buttonText: { color: '#023A73', fontSize: 16, fontWeight: 'bold' }
});