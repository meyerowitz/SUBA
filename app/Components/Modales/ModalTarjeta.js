import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; // Asegúrate de tenerlo instalado
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

const ModalTarjeta = ({ visible, onClose, onConfirm }) => {
  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        
        {/* CONTENEDOR DEL DEGRADADO (EL BORDE) */}
        <LinearGradient
          // Colores aproximados a tu imagen: Naranja -> Azul -> Morado
          colors={['#ff8a00', '#405de6', '#833ab4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientBorder}
        >
          {/* CONTENIDO BLANCO (EL INTERIOR) */}
          <View style={styles.modalContent}>
            
            <Image source={require('../../../assets/img/tarjeta.png')} style={styles.iconContainer}>
            </Image>

            <Text style={styles.title}>¿Antes de acceder a Wallet?</Text>
            <Text style={styles.subtitle}>
              Complete su perfil de usuario por favor , nuestra administración se ocupara del resto
            </Text>

            <View style={styles.buttonGroup}>
              <TouchableOpacity style={styles.btnSecondary} onPress={onClose}>
                <Text style={styles.btnTextSecondary}>Ahora no</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.btnPrimary} onPress={onConfirm}>
                <Text style={styles.btnTextPrimary}>Solicitar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.19)', // Fondo oscuro para resaltar el modal
  },
  gradientBorder: {
    width: width * 0.85,
    borderRadius: 25, // Bordes redondeados del marco
    padding: 5, // <--- ESTO define el grosor del "bordecito colorido"
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    marginTop:-90
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 22, // Un poco menor que el gradientBorder para que encaje
    padding: 25,
    paddingBottom:40,
    marginTop:10,
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 25,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 10,
    borderRadius: 12,
    backgroundColor: '#003366',
    alignItems: 'center',
  },
  btnTextSecondary: {
    color: '#666',
    fontWeight: '600',
  },
  btnTextPrimary: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ModalTarjeta;