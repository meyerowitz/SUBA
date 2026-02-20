import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar, Modal, Pressable } from 'react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useRouter } from 'expo-router';

// 💡 1. IMPORTAMOS NUESTRO CENTRO DE CONTROL MAGICO
import { MOCK_BACKEND } from '../../../lib/SimuladorBackend';

export default function BilleteraCentral() {
  const router = useRouter();
  
  // 💡 2. LEEMOS TODO DEL SIMULADOR
  const saldoBs = MOCK_BACKEND.saldo;
  const TASA_DOLAR = MOCK_BACKEND.tasa_bcv; 
  const saldoUSD = (saldoBs / TASA_DOLAR).toFixed(2);

  // 'SIN_TARJETA' | 'APROBADA' | 'VINCULADA'
  const estadoTarjetaFisica = MOCK_BACKEND.estado_tarjeta; 
  
  // Control de menús desplegables (Acordeones)
  const [seccionAbierta, setSeccionAbierta] = useState<string | null>(null);
  
  // Modal de Transacciones (El botón amarillo)
  const [modalDineroVisible, setModalDineroVisible] = useState(false);

  const toggleSeccion = (seccion: string) => {
    setSeccionAbierta(seccionAbierta === seccion ? null : seccion);
  };

  const historial = [
    { id: '1', fecha: '18 Feb 2026, 08:30 AM', monto: '- 5.00 Bs', tipo: 'Pasaje - Ruta Alta Vista', icono: 'bus', color: '#475569' },
    { id: '2', fecha: '17 Feb 2026, 02:15 PM', monto: '+ 150.00 Bs', tipo: 'Recarga Pago Móvil', icono: 'arrow-down', color: '#16A34A' },
  ];

  return (
    <View style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* --- ENCABEZADO --- */}
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome6 name="arrow-left" size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.topHeaderTitle}>Mi Billetera</Text>
          <TouchableOpacity style={styles.helpButton} onPress={() => alert('Guía: ¿Cómo usar mi billetera SUBA?')}>
            <FontAwesome6 name="circle-question" size={22} color="#0284C7" />
          </TouchableOpacity>
        </View>

        {/* --- 1. LA TARJETA DIGITAL (Identidad SUBA) --- */}
        <View style={styles.walletCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardLabel}>Saldo disponible</Text>
              <Text style={styles.cardBalanceBs}>Bs. {saldoBs.toFixed(2)}</Text>
              <Text style={styles.cardBalanceUsd}>$ ~ {saldoUSD} USD</Text>
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
            {/* 💡 Ícono NFC eliminado como solicitaste */}
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
                {estadoTarjetaFisica === 'SIN_TARJETA' ? 'Solicítala por 5$' : estadoTarjetaFisica === 'APROBADA' ? 'Lista para vincular' : 'Activa y configurada'}
              </Text>
            </View>
            <FontAwesome6 name={seccionAbierta === 'tarjeta' ? "chevron-up" : "chevron-down"} size={16} color="#94A3B8" />
          </TouchableOpacity>
          
          {seccionAbierta === 'tarjeta' && (
            <View style={styles.accordionContent}>
              {estadoTarjetaFisica === 'SIN_TARJETA' && (
                <View>
                  <Text style={styles.accordionTextInfo}>Si te quedas sin batería a veces, pide tu tarjeta de plástico con chip NFC para pagar en el bus sin depender de tu celular.</Text>
                  <TouchableOpacity style={styles.btnAccordionPrimary} onPress={() => alert('Ir a pagar 5$')}>
                    <Text style={styles.btnAccordionPrimaryText}>Solicitar Tarjeta (5$)</Text>
                  </TouchableOpacity>
                </View>
              )}
              {estadoTarjetaFisica === 'APROBADA' && (
                <View>
                  <Text style={styles.accordionTextInfo}>El administrador aprobó tu pago. Recoge tu plástico en taquilla y presiona este botón para activarla.</Text>
                  <TouchableOpacity style={[styles.btnAccordionPrimary, {backgroundColor: '#2563EB'}]} onPress={() => alert('Abriendo lector NFC')}>
                    <Text style={styles.btnAccordionPrimaryText}>Vincular Plástico</Text>
                  </TouchableOpacity>
                </View>
              )}
              {estadoTarjetaFisica === 'VINCULADA' && (
                <View>
                  <Text style={styles.accordionTextInfo}>Tu tarjeta NFC (UID: 04:A3:55) está vinculada a este saldo. En caso de pérdida, puedes bloquearla temporalmente.</Text>
                  <TouchableOpacity style={[styles.btnAccordionPrimary, {backgroundColor: '#FEE2E2'}]} onPress={() => alert('Tarjeta Congelada')}>
                    <Text style={[styles.btnAccordionPrimaryText, {color: '#EF4444'}]}>Congelar Tarjeta</Text>
                  </TouchableOpacity>
                </View>
              )}
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
              <Text style={styles.accordionTextInfo}>Si eres estudiante activo o posees un certificado de discapacidad (CONAPDIS), puedes optar por exoneraciones en el pasaje.</Text>
              <TouchableOpacity style={styles.btnAccordionSecondary} onPress={() => alert('Abrir formulario de constancias')}>
                <Text style={styles.btnAccordionSecondaryText}>Cargar Constancias</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>

        {/* --- 3. HISTORIAL --- */}
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>Últimos Movimientos</Text>
            <TouchableOpacity><Text style={styles.historyLink}>Ver todos</Text></TouchableOpacity>
          </View>

          {historial.map((item) => (
            <View key={item.id} style={styles.transactionItem}>
              <View style={styles.transactionLeft}>
                <View style={[styles.transactionIcon, { backgroundColor: item.monto.includes('+') ? '#DCFCE7' : '#F1F5F9' }]}>
                  <FontAwesome6 name={item.icono} size={14} color={item.color} />
                </View>
                <View>
                  <Text style={styles.transactionType}>{item.tipo}</Text>
                  <Text style={styles.transactionDate}>{item.fecha}</Text>
                </View>
              </View>
              <Text style={[styles.transactionAmount, { color: item.monto.includes('+') ? '#16A34A' : '#0F172A' }]}>
                {item.monto}
              </Text>
            </View>
          ))}
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
                router.push('/pages/Pasajero/RecargarSaldo'); // 💡 AQUÍ ESTÁ LA MAGIA
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
                router.push('/pages/Pasajero/TransferirSaldo'); // 💡 AQUÍ ESTÁ EL CAMBIO
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
              onPress={() => { 
                setModalDineroVisible(false); 
                router.push('/pages/Pasajero/RetirarSaldo'); // 💡 LO CONECTAMOS AQUÍ
              }}
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

    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' }, // Le quitamos el paddingTop extra
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
  modalDragHandle: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#0F172A', marginBottom: 5 },
  modalSubtitle: { fontSize: 15, color: '#64748B', marginBottom: 25 },
  modalOptionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalOptionIcon: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  modalOptionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 2 },
  modalOptionSub: { fontSize: 13, color: '#64748B' }
});