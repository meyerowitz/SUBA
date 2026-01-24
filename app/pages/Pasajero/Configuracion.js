import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Volver from '../../Components/Botones_genericos/Volver';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Configuracion() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isGpsOptimized, setIsGpsOptimized] = useState(true);
  const [profileImage, setProfileImage] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const img = await AsyncStorage.getItem('@profile_image');
        if (img) setProfileImage(img);
      } catch (e) { console.log('load profile image error', e); }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Configuración</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <Text style={styles.sectionTitle}>PREFERENCIAS</Text>
        
        <View style={styles.row}>
          <View>
            <Text style={styles.rowText}>Modo Oscuro</Text>
            <Text style={styles.subText}>Cambia el aspecto visual</Text>
          </View>
          <Switch 
            value={isDarkMode} 
            onValueChange={setIsDarkMode}
            trackColor={{ false: "#D1D1D1", true: "#D99015" }} 
          />
        </View>

        <TouchableOpacity style={styles.row} onPress={async () => {
            try {
              // para solicitar el permiso de la galeria
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') { Alert.alert('Permiso requerido', 'Se necesita permiso para acceder a las imágenes.'); return; }
              const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 });
              if (!result.canceled) {
                //guardar la imagen en asyncstorage
                const uri = result.assets ? result.assets[0].uri : result.uri;
                await AsyncStorage.setItem('@profile_image', uri);
                setProfileImage(uri);
                Alert.alert('Listo', 'Foto de perfil actualizada (local).');
              }
            } catch (e) { console.log('pickImage error', e); Alert.alert('Error', 'No se pudo actualizar la foto.'); }
          }}>
          <View>
            <Text style={styles.rowText}>Foto de Perfil</Text>
            <Text style={styles.subText}>Actualiza tu foto de perfil</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={{ width: 42, height: 42, borderRadius: 12 }} />
            ) : (
              <Ionicons name="person" size={23} color="#D99015" />
            )}

            {profileImage && (
              <TouchableOpacity
                style={styles.trashButton}
                onPress={() => {
                  Alert.alert(
                    'Eliminar foto',
                    '¿Seguro que quieres eliminar tu foto de perfil?',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Eliminar',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            // eliminar la imagen de asyncstorage
                            await AsyncStorage.removeItem('@profile_image');
                            setProfileImage(null);
                            Alert.alert('Eliminado', 'La foto de perfil se ha eliminado.');
                          } catch (e) {
                            console.log('remove profile image error', e);
                            Alert.alert('Error', 'No se pudo eliminar la foto.');
                          }
                        }
                      }
                    ]
                  );
                }}
              >
                <View style={styles.trashIconWrap}>
                  <Ionicons name="trash" size={20} color="#C0392B" />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row}>
          <View>
            <Text style={styles.rowText}>Idioma</Text>
            <Text style={styles.subText}>Español (Latinoamérica)</Text>
          </View>
          <Ionicons name="language-outline" size={23} color="#D99015" />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 25 }]}>SISTEMA Y MAPAS</Text>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowText}>Optimización de GPS</Text>
            <Text style={styles.subText}>Mejora la precisión de las rutas</Text>
          </View>
          <Switch 
            value={isGpsOptimized} 
            onValueChange={setIsGpsOptimized}
            trackColor={{ false: "#D1D1D1", true: "#D99015" }} 
          />
        </View>

        <TouchableOpacity style={styles.row}>
          <View>
            <Text style={styles.rowText}>Rutas Preferidas</Text>
            <Text style={styles.subText}>Selecciona tus rutas usuales</Text>
          </View>
          <Ionicons name="chevron-down" size={20} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row}>
          <View>
            <Text style={styles.rowText}>Unidades de Distancia</Text>
            <Text style={styles.subText}>Kilómetros (km)</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 25 }]}>SOPORTE</Text>

        <TouchableOpacity style={styles.row} onPress={() => router.push('/pages/Pasajero/Soporte')}>
          <View>
            <Text style={styles.rowText}>Centro de Ayuda</Text>
            <Text style={styles.subText}>Preguntas frecuentes y soporte</Text>
          </View>
          <Ionicons name="help-circle-outline" size={23} color="#D99015" />
        </TouchableOpacity>

      </ScrollView>

      <Volver route={"./Profile"} color={"#333"} style={{ top: 60, left: 10 }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { padding: 25, marginTop: 40 },
  title: { fontSize: 28, fontWeight: '700', color: '#2D3436', marginTop: 10 },
  content: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#B2BEC3', marginBottom: 15, letterSpacing: 1.5 },
  row: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    backgroundColor: 'white', padding: 18, borderRadius: 20, marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5
  },
  rowText: { fontSize: 16, fontWeight: '600', color: '#2D3436' },
  subText: { fontSize: 12, color: '#636E72' },
  trashButton: { marginLeft: 10 },
  trashIconWrap: { backgroundColor: '#FFF0F0', padding: 10, borderRadius: 12 }
});