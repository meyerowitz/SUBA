import React, { useState , useEffect} from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, ScrollView , Alert} from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Volver from '../../Components/Botones_genericos/Volver';
import { router } from 'expo-router';
import {getuseremail,getusername} from '../../Components/AsyncStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {GoogleSignin} from '@react-native-google-signin/google-signin';


export default function Profile() {
  // Simulación de estados
  const [isStudent, setIsStudent] = useState(true);
  const [isSenior, setIsSenior] = useState(true);

  const [UserName, setUserName] = useState("---");
  const [UserEmail, setUserEmail] = useState("---");
    
  useEffect(()=>{
    const name = getusername();
    const email = getuseremail();

    setUserName(name);
    setUserEmail(email);

  },[])

  const handleLogout = () => {
  Alert.alert(
    "Cerrar Sesión",
    "¿Estás segura de que quieres salir?",
    [
      { text: "Cancelar", style: "cancel" },
      { 
        text: "Sí, salir", 
        onPress: async () => {
          await AsyncStorage.removeItem('@Sesion_usuario');
          GoogleSignin.signOut();//CIERRA SESION DE GOOGLE, SI NO SE COLOCA QUEDARA ABIERTA A PESAR DE HABER CERRADO SESION
          router.replace('/Login');
        } 
      }
    ]
  );}

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar  backgroundColor='#D99015' barStyle="light-content" />
      
      {/* ScrollView para que toda la pantalla sea deslizable */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Cabecera Naranja */}
        <View style={styles.orangeHeader} />

        {/* Caja de Perfil Blanca (Insignias dentro) */}
        <View style={styles.profileBox}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person-outline" size={60} color="white" />
          </View>
          
          <Text style={styles.userName}>{UserName}</Text>
          <Text style={styles.userEmail}>{UserEmail}</Text>

          {/* Sección de Insignias/Roles con estilo de la imagen */}
          {(isStudent || isSenior) && (
            <View style={styles.badgesWrapper}>
              {isStudent && (
                <View style={styles.badgeItem}>
                  <View style={[styles.iconCircle, { backgroundColor: '#4A90E2' }]}>
                    <FontAwesome5 name="graduation-cap" size={12} color="white" />
                  </View>
                  <Text style={styles.badgeText}>Estudiante</Text>
                </View>
              )}

              {isSenior && (
                <View style={styles.badgeItem}>
                  <View style={[styles.iconCircle, { backgroundColor: '#FF7043' }]}>
                    <MaterialCommunityIcons name="heart" size={14} color="white" />
                  </View>
                  <Text style={styles.badgeText}>Adulto Mayor</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Sección de Opciones */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>GENERAL</Text>
          
          <MenuOption 
            icon="settings-sharp" 
            color="#1976D2" 
            bgColor="#E3F2FD"
            title="Configuración" 
            subtitle="Actualiza y modifica tu perfil" 
            onPress={()=>{router.push("/pages/Pasajero/Configuracion")}}
          />

          <MenuOption 
            icon="shield-checkmark" 
            color="#2E7D32" 
            bgColor="#E8F5E9"
            title="Privacidad" 
            subtitle="Cambia tu contraseña" 
            onPress={()=>{router.push("/pages/Pasajero/Privacidad")}}
          />

          <MenuOption 
            icon="notifications" 
            color="#FBC02D" 
            bgColor="#FFFDE7"
            title="Notificaciones" 
            subtitle="Configura tus alertas" 
            onPress={()=>{router.push("/pages/Pasajero/Notificaciones")}}
          />

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>BILLETERA</Text>

          <TouchableOpacity 
            onPress={() => router.replace("./Wallet")} 
            style={styles.menuItem}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="wallet" size={20} color="#7B1FA2" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuMainText}>Mi Wallet</Text>
              <Text style={styles.menuSubText}>Ver saldo y movimientos</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>
        </View>

        {/* Botón de Cerrar Sesión al final del scroll */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>CERRAR SESIÓN</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Botón Volver fijo arriba */}
      <Volver route={"./Navigation"} color={"white"} style={styles.btnVolver} />
    </SafeAreaView>
  );

}

// Componente pequeño para no repetir código de los botones del menú
const MenuOption = ({ icon, title, subtitle, color, bgColor, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.menuItem}>
    <View style={[styles.menuIconBox, { backgroundColor: bgColor }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <View style={styles.menuTextContainer}>
      <Text style={styles.menuMainText}>{title}</Text>
      <Text style={styles.menuSubText}>{subtitle}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#CCC" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scrollContent: { paddingBottom: 40 },
  orangeHeader: { 
    backgroundColor: '#D99015', height: 180, 
    borderBottomRightRadius: 40 
  },
  profileBox: {
    backgroundColor: 'white', width: '90%', alignSelf: 'center',
    marginTop: -110, borderRadius: 25, padding: 20, alignItems: 'center',
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, 
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 }
  },
  avatarCircle: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: '#003366',
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
    borderWidth: 4, borderColor: 'white'
  },
  userName: { fontSize: 22, fontWeight: '700', color: '#2D3436' },
  userEmail: { fontSize: 14, color: '#636E72', marginBottom: 15 },
  badgesWrapper: {
    flexDirection: 'row', backgroundColor: '#F1F2F6', borderRadius: 15,
    padding: 12, width: '100%', justifyContent: 'space-evenly'
  },
  badgeItem: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: {
    width: 24, height: 24, borderRadius: 12, justifyContent: 'center',
    alignItems: 'center', marginRight: 8
  },
  badgeText: { fontSize: 13, fontWeight: '700', color: '#2D3436' },
  menuSection: { paddingHorizontal: 20, marginTop: 25 },
  sectionTitle: { 
    fontSize: 12, fontWeight: '800', color: '#B2BEC3', 
    marginBottom: 10, marginLeft: 5, letterSpacing: 1 
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    padding: 15, borderRadius: 18, marginBottom: 10, elevation: 2
  },
  menuIconBox: {
    width: 42, height: 42, borderRadius: 12, 
    justifyContent: 'center', alignItems: 'center'
  },
  menuTextContainer: { flex: 1, marginLeft: 15 },
  menuMainText: { fontSize: 16, fontWeight: '600', color: '#2D3436' },
  menuSubText: { fontSize: 12, color: '#636E72' },
  logoutButton: {
    backgroundColor: '#D99015', marginHorizontal: 25, marginTop: 30,
    paddingVertical: 16, borderRadius: 20, alignItems: 'center'
  },
  logoutText: { color: '#003366', fontWeight: '800', fontSize: 16 },
  btnVolver: { position: 'absolute', top: 50, left: 10 }
});