import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../Components/Temas_y_colores/ThemeContext';
import Volver from '../../Components/Botones_genericos/Volver';

export default function Soporte() {
  const [expanded, setExpanded] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { theme, isDark } = useTheme(); //temas oscuro y claro
  
  const faqs = [
    { id: '1', q: '¿Cómo recargo mi saldo?', a: 'Pueded recargar tu saldo por Pago Móvil transfiriendo el monto que disponga a los datos que se indican. Sube la captura y registra la referencia en tu billetera.' },
    { id: '2', q: '¿Cómo solicito un subsidio?', a: 'Ve al apartado de Subsidios, selecciona el tipo de subsidio y sube la documentación requerida. Nuestro equipo de SUBA evaluará tu solicitud y responderá de forma acorde.' },
    { id: '3', q: '¿Cómo reporto un problema con mi viaje?', a: 'En Perfil → Soporte podrás contactar a un agente para asistencia directa en caso de querer reportar alguna situación.' }
  ];

  const toggle = (id) => setExpanded(prev => (prev === id ? null : id));


  const contactarWhatsapp = async () => {
    // Número en formato internacional para wa.me
    const waNumber = '584123927644';
    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent('Hola, necesito hablar con un agente.')}`;
    try {
      await Linking.openURL(url);
    } catch (_e) {
      Alert.alert('Error', 'No se pudo abrir WhatsApp.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Soporte</Text>
          <Text style={styles.description}>Encuentra respuestas rápidas o contacta a un agente de soporte.</Text>
        </View>

        <View style={{ marginTop: 10 }}>
          {faqs.map(item => (
            <View key={item.id} style={styles.faqBox}>
              <TouchableOpacity style={styles.faqRow} onPress={() => toggle(item.id)}>
                <Ionicons name={expanded === item.id ? 'chevron-up' : 'chevron-down'} size={20} color="#7F8C8D" style={styles.faqIcon} />
                <Text style={styles.faqQuestion}>{item.q}</Text>
              </TouchableOpacity>
              {expanded === item.id && (
                <View style={styles.faqAnswerBox}>
                  <Text style={styles.faqAnswer}>{item.a}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.contactButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.contactButtonText}>Contacta a un agente</Text>
        </TouchableOpacity>
      </ScrollView>
    
      <Modal animationType="slide" transparent visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flex: 1, justifyContent: 'space-between' }}>
              <View>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Contacta a un agente</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close-circle" size={30} color="#BDC3C7" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalSubtitle}>Presiona el botón para iniciar una conversación en WhatsApp con un agente de SUBA.</Text>
              </View>

              <View>
                <TouchableOpacity style={[styles.btnPrincipal, { backgroundColor: '#25D366' }]} onPress={contactarWhatsapp}>
                  <Text style={styles.btnPrincipalText}>Contactar por WhatsApp</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Volver route={"./Configuracion"} color={"#333"} style={{ top: 60, left: 10 }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { paddingHorizontal: 20, paddingBottom: 30 },
  header: { padding: 9, marginTop: 50 },
  title: { fontSize: 28, fontWeight: '700', color: '#2D3436', marginTop: 10 },
  description: { fontSize: 14, color: '#636E72', marginTop: 8 },
  faqBox: { marginBottom: 12, backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', elevation: 1 },
  faqRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  faqIcon: { marginRight: 12 },
  faqQuestion: { fontSize: 16, fontWeight: '700', color: '#2D3436' },
  faqAnswerBox: { paddingHorizontal: 16, paddingBottom: 14 },
  faqAnswer: { color: '#636E72', marginTop: 6, lineHeight: 20 },

  contactButton: { backgroundColor: '#003366', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  contactButtonText: { color: 'white', fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, minHeight: 260 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#003366' },
  modalSubtitle: { fontSize: 13, color: '#7F8C8D', marginBottom: 12 },
  btnPrincipal: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  btnPrincipalText: { color: 'white', fontWeight: '700' }
});
