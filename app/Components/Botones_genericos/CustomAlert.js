import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const CustomAlert = ({ visible, title, message, onClose, theme }) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.alertContainer, { backgroundColor: theme.background }]}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.message, { color: theme.text_secondary || '#666' }]}>{message}</Text>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    width: '80%',
    padding: 25,
    borderRadius: 25, // <--- ¡Aquí está la magia de los bordes!
    alignItems: 'center',
    elevation: 10,
  },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  message: { fontSize: 16, textAlign: 'center', marginBottom: 20 },
  button: {
    backgroundColor: '#003366',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 15,
  },
  buttonText: { color: 'white', fontWeight: 'bold' }
});

export default CustomAlert;