import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function FormularioSolicitud() {
  const router = useRouter();
  const [pasoActual, setPasoActual] = useState(1);

  // --- VARIABLES PASO 1 ---
  const [cedula, setCedula] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [fechaNac, setFechaNac] = useState(new Date());
  const [fechaTexto, setFechaTexto] = useState('');
  const [mostrarCalendario, setMostrarCalendario] = useState(false);

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

  const seleccionarFoto = async (tipo: 'ESTUDIANTE' | 'DISCAPACIDAD') => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.5,
    });

    if (!result.canceled) {
      if (tipo === 'ESTUDIANTE') setFotoEstudiante(result.assets[0].uri);
      if (tipo === 'DISCAPACIDAD') setFotoDiscapacidad(result.assets[0].uri);
    }
  };

  // --- LÓGICA INTELIGENTE DE AVANCE ---
  const avanzar = () => {
    if (pasoActual === 1) {
      if (!cedula || !nombres || !apellidos || !fechaTexto) {
        Alert.alert('Faltan Datos', 'Por favor, completa todos tus datos personales.');
        return;
      }
      setPasoActual(2);
    } 
    else if (pasoActual === 2) {
      if (tieneSubsidio === true) {
        
        // LA NUEVA ALERTA AMIGABLE (Si no seleccionó ninguna opción)
        if (!esEstudiante && !esDiscapacitado) {
          Alert.alert(
            '¿Continuar sin subsidio?',
            'Te recomendamos adjuntar tu soporte ahora para disfrutar del beneficio desde el primer día. Sin embargo, puedes omitir este paso y actualizar tu perfil más adelante cuando tu tarjeta sea aprobada.',
            [
              { text: 'Adjuntar soporte', style: 'cancel' }, // Opción 1: Se queda en la pantalla
              { 
                text: 'Continuar sin subsidio', 
                style: 'default',
                onPress: () => {
                  // Opción 2: Limpiamos por si acaso y avanzamos al pago
                  setTieneSubsidio(false); 
                  setPasoActual(3); 
                } 
              }
            ]
          );
          return; // Detenemos la ejecución aquí para esperar la respuesta del usuario
        }

        // Si sí marcó una opción, le exigimos la foto obligatoriamente
        if (esEstudiante && !fotoEstudiante) {
          Alert.alert('Falta Constancia', 'Adjunta tu constancia de estudio o desmarca la opción de Estudiante.');
          return;
        }
        if (esDiscapacitado && !fotoDiscapacidad) {
          Alert.alert('Falta Certificado', 'Adjunta tu certificado de discapacidad o desmarca la opción.');
          return;
        }
      }
      setPasoActual(3); 
    } 
    else if (pasoActual === 3) {
      setPasoActual(4); 
    }
  };

  const retroceder = () => {
    if (pasoActual === 1) {
      router.back();
    } else if (pasoActual === 2) {
      if (tieneSubsidio === true) setTieneSubsidio(null); 
      else setPasoActual(1); 
    } else if (pasoActual === 3) {
      setTieneSubsidio(null); 
      setPasoActual(2);
    } else {
      setPasoActual(pasoActual - 1);
    }
  };

  const renderPaso1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconWrapper}>
        <FontAwesome6 name="id-card" size={50} color="#023A73" />
      </View>
      <Text style={styles.title}>Tus Datos Personales</Text>
      <Text style={styles.subtitle}>Verifica tu identidad para asociarla a tu nueva tarjeta SUBA.</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Cédula de Identidad</Text>
        <TextInput style={styles.input} placeholder="Ej: 28123456" keyboardType="numeric" value={cedula} onChangeText={setCedula} />
      </View>

      <View style={styles.rowInputs}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>Nombres</Text>
          <TextInput style={styles.input} placeholder="Ej: Ana Maria" value={nombres} onChangeText={setNombres} autoCapitalize="words" />
        </View>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>Apellidos</Text>
          <TextInput style={styles.input} placeholder="Ej: Pérez" value={apellidos} onChangeText={setApellidos} autoCapitalize="words" />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Fecha de Nacimiento</Text>
        <TouchableOpacity style={styles.inputDate} onPress={() => setMostrarCalendario(true)}>
          <Text style={fechaTexto ? styles.dateText : styles.datePlaceholder}>{fechaTexto || "Seleccionar fecha..."}</Text>
          <FontAwesome6 name="calendar-day" size={20} color="#999" />
        </TouchableOpacity>
        {mostrarCalendario && <DateTimePicker value={fechaNac} mode="date" display="default" onChange={cambiarFecha} maximumDate={new Date()} />}
      </View>
    </View>
  );

  const renderPaso2 = () => {
    if (tieneSubsidio === null) {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.title}>Perfil de Subsidio</Text>
          <Text style={styles.subtitle}>Conoce los beneficios disponibles para los usuarios de SUBA.</Text>

          {/* Tarjetas más compactas y menos invasivas */}
          <View style={styles.infoCardCompact}>
            <View style={styles.infoHeaderCompact}>
              <FontAwesome6 name="book-open" size={18} color="#023A73" />
              <Text style={styles.infoTitleCompact}>Estudiante Activo</Text>
            </View>
            <Text style={styles.infoTextCompact}>Otorga 50% de descuento. Requiere validación de constancia de estudios o carnet vigente.</Text>
          </View>

          <View style={styles.infoCardCompact}>
            <View style={styles.infoHeaderCompact}>
              <FontAwesome6 name="wheelchair" size={18} color="#023A73" />
              <Text style={styles.infoTitleCompact}>Discapacidad / 3ra Edad</Text>
            </View>
            <Text style={styles.infoTextCompact}>Exoneración total (100%). Requiere subir el certificado emitido por CONAPDIS.</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.stepContainer}>
        <View style={styles.iconWrapper}>
          <FontAwesome6 name="file-arrow-up" size={50} color="#023A73" />
        </View>
        <Text style={styles.title}>Adjuntar Recaudos</Text>
        <Text style={styles.subtitle}>Selecciona tu condición y sube una foto clara de tu soporte.</Text>

        <View style={styles.subsidioOpciones}>
          <TouchableOpacity style={[styles.opcionBtn, esEstudiante && styles.opcionBtnActive]} onPress={() => setEsEstudiante(!esEstudiante)}>
            <FontAwesome6 name="book-open" size={20} color={esEstudiante ? "#023A73" : "#999"} />
            <Text style={[styles.opcionText, esEstudiante && styles.opcionTextActive]}>Estudiante Activo</Text>
            {esEstudiante && <FontAwesome6 name="circle-check" size={20} color="#023A73" style={{marginLeft: 'auto'}} />}
          </TouchableOpacity>
          
          {esEstudiante && (
            <TouchableOpacity style={styles.fotoBtn} onPress={() => seleccionarFoto('ESTUDIANTE')}>
              {fotoEstudiante ? <Image source={{ uri: fotoEstudiante }} style={styles.fotoPreview} /> : 
              <View style={styles.fotoPlaceholder}><FontAwesome6 name="camera" size={24} color="#999" /><Text style={styles.fotoPlaceholderText}>Subir Constancia</Text></View>}
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.opcionBtn, {marginTop: 15}, esDiscapacitado && styles.opcionBtnActive]} onPress={() => setEsDiscapacitado(!esDiscapacitado)}>
            <FontAwesome6 name="wheelchair" size={20} color={esDiscapacitado ? "#023A73" : "#999"} />
            <Text style={[styles.opcionText, esDiscapacitado && styles.opcionTextActive]}>Certificado Discapacidad</Text>
            {esDiscapacitado && <FontAwesome6 name="circle-check" size={20} color="#023A73" style={{marginLeft: 'auto'}} />}
          </TouchableOpacity>

          {esDiscapacitado && (
            <TouchableOpacity style={styles.fotoBtn} onPress={() => seleccionarFoto('DISCAPACIDAD')}>
              {fotoDiscapacidad ? <Image source={{ uri: fotoDiscapacidad }} style={styles.fotoPreview} /> : 
              <View style={styles.fotoPlaceholder}><FontAwesome6 name="camera" size={24} color="#999" /><Text style={styles.fotoPlaceholderText}>Subir Certificado</Text></View>}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={retroceder} style={styles.backButton}>
            <FontAwesome6 name="arrow-left" size={24} color="#023A73" />
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${(pasoActual / 4) * 100}%` }]} />
          </View>
          <Text style={styles.stepText}>{pasoActual}/4</Text>
        </View>

        {/* ScrollView para el contenido principal */}
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {pasoActual === 1 && renderPaso1()}
          {pasoActual === 2 && renderPaso2()}
          {pasoActual === 3 && <Text style={styles.title}>Aquí irá el Pago Móvil...</Text>}
          {pasoActual === 4 && <Text style={styles.title}>Aquí irá el Resumen...</Text>}
        </ScrollView>

        {/* EL FOOTER MAGISTRAL */}
        <View style={styles.footer}>
          {pasoActual === 2 && tieneSubsidio === null ? (
            <View>
              {/* La pregunta ahora vive aquí, anclada encima de los botones */}
              <Text style={styles.preguntaFija}>¿Posees alguna de estas condiciones?</Text>
              
              <View style={styles.rowButtonsFooter}>
                <TouchableOpacity 
                  style={styles.btnNo} 
                  onPress={() => {
                    setTieneSubsidio(false); setEsEstudiante(false); setEsDiscapacitado(false); 
                    setFotoEstudiante(null); setFotoDiscapacidad(null);
                    setPasoActual(3); 
                  }}
                >
                  <Text style={styles.btnTextNo}>NO</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSi} onPress={() => setTieneSubsidio(true)}>
                  <Text style={styles.btnTextSi}>SÍ</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.button} onPress={avanzar}>
              <Text style={styles.buttonText}>{pasoActual === 4 ? 'ENVIAR SOLICITUD' : 'SIGUIENTE'}</Text>
            </TouchableOpacity>
          )}
        </View>

      </KeyboardAvoidingView>
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
  
  // Paso 1
  rowInputs: { flexDirection: 'row', gap: 15 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#023A73', marginBottom: 8, marginLeft: 5 },
  input: { width: '100%', height: 60, padding: 15, borderWidth: 1, borderColor: '#DFDFDF', borderRadius: 15, fontSize: 16, color: '#212121', backgroundColor: '#FAFAFA' },
  inputDate: { width: '100%', height: 60, padding: 15, borderWidth: 1, borderColor: '#DFDFDF', borderRadius: 15, backgroundColor: '#FAFAFA', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateText: { fontSize: 16, color: '#212121' },
  datePlaceholder: { fontSize: 16, color: '#999' },
  
  // Paso 2 - Tarjetas Compactas
  infoCardCompact: { backgroundColor: '#F0F5FA', padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5F0FF' },
  infoHeaderCompact: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 10 },
  infoTitleCompact: { fontSize: 16, fontWeight: 'bold', color: '#023A73' },
  infoTextCompact: { fontSize: 14, color: '#544F4F', lineHeight: 20 },
  
  subsidioOpciones: { marginTop: 10 },
  opcionBtn: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#DFDFDF', gap: 15 },
  opcionBtnActive: { borderColor: '#023A73', borderWidth: 2, backgroundColor: '#F0F5FA' },
  opcionText: { fontSize: 16, color: '#544F4F', fontWeight: '500' },
  opcionTextActive: { color: '#023A73', fontWeight: 'bold' },
  fotoBtn: { width: '100%', height: 100, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#DFDFDF', backgroundColor: '#FAFAFA', borderStyle: 'dashed', marginTop: 10 },
  fotoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10 },
  fotoPlaceholderText: { color: '#999', fontSize: 14, fontWeight: '500' },
  fotoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },

  // Footer con la Pregunta Anclada
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