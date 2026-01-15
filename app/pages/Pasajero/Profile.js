import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Viene por defecto en Expo
import { SafeAreaView } from 'react-native-web';
import Volver from '../../Components/Botones_genericos/Volver';
import { router } from 'expo-router';

export default function Profile() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Sección Superior Naranja */}
        <View style={styles.orangeHeader} />

        {/* Caja de Perfil Blanca */}
        <View style={styles.profileBox}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person-outline" size={60} color="white" />
          </View>
          <Text style={styles.userName}>Christian Vasquez</Text>
        </View>

        {/* Cuerpo de la Tarjeta */}
        <View style={styles.content}>
          <TouchableOpacity style={styles.settingsRow}>
            <Ionicons name="settings-outline" size={24} color="#555" />
            <Text style={styles.settingsText}>settings</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          <TouchableOpacity onPress={()=>{router.replace("./Wallet")}} style={styles.settingsRow}>
            <Ionicons name="wallet" size={24} color="#555" />
            <Text style={styles.settingsText}>Wallet</Text>
          </TouchableOpacity>
        </View>

        {/* Botón de Cerrar Sesión */}
        <TouchableOpacity style={styles.logoutButton}>
          <Text style={styles.logoutText}>CERRAR SESIÓN</Text>
        </TouchableOpacity>
      </View>
      <Volver route={"./Navigation"} color={"white"} style={{top:20, left:10}}></Volver>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0E0E0', // Fondo gris de la app
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    
    overflow: 'hidden', // Para que el header naranja respete el borde redondeado
    elevation: 10, // Sombra en Android
    shadowColor: '#000', // Sombra en iOS
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  orangeHeader: {
    backgroundColor: '#D99015',
    height: '25%',
    width: '100%',
  },
  profileBox: {
    backgroundColor: 'white',
    width: '85%',
    alignSelf: 'center',
    marginTop: -70, // Eleva la caja blanca sobre el fondo naranja
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#003366', // Azul oscuro del icono
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  content: {
    paddingHorizontal: 25,
    paddingTop: 30,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsText: {
    fontSize: 18,
    marginLeft: 10,
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#D99015',
    marginHorizontal: 30,
    marginBottom: 40,
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginTop:220
  },
  logoutText: {
    color: '#003366', // Color de texto oscuro como en la imagen
    fontWeight: 'bold',
    fontSize: 16,
  },
});