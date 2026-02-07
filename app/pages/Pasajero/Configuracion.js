import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, Alert, Image,StatusBar, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Volver from '../../Components/Botones_genericos/Volver';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../Components/Temas_y_colores/ThemeContext';
import { useTranslation } from 'react-i18next';
import '../../Components/i18n/i18n';
import Destinos from "../../Components/Destinos.json";

export default function Configuracion() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isGpsOptimized, setIsGpsOptimized] = useState(true);
  const [profileImage, setProfileImage] = useState(null);
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme, isDark } = useTheme(); //temas oscuro y claro

  const [isReady, setIsReady] = useState(false);
  const [modalDestinosVisible, setModalDestinosVisible] = useState(false);
  const [destinoSeleccionado, setDestinoSeleccionado] = useState(null);

  useEffect(() => {
    // 1. Cargamos imagen
    (async () => {
      try {
        const img = await AsyncStorage.getItem('@profile_image');
        if (img) setProfileImage(img);
      } catch (e) { console.log('load image error', e); }
    })();

    // 2. Forzamos a que i18n esté realmente listo antes de mostrar nada
    if (i18n.isInitialized) {
      setIsReady(true);
    } else {
      i18n.on('initialized', () => setIsReady(true));
    }
  }, [i18n]);
  useEffect(() => {
    (async () => {
      try {
        const img = await AsyncStorage.getItem('@profile_image');
        if (img) setProfileImage(img);
      } catch (e) { console.log('load profile image error', e); }
    })();
  }, []);
  
  const selectLanguage = () => {
    Alert.alert(
      t('idioma'), // Título (puedes usar traducción o texto fijo)
      t('selecciona_idioma'), // Mensaje descriptivo
      [
        {
          text: 'Español',
          onPress: () => i18n.changeLanguage('es'),
        },
        {
          text: 'English',
          onPress: () => i18n.changeLanguage('en'),
        },
        {
          text: t('cancelar'), // Opción para cerrar sin cambios
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };


  // Si no está listo, mostramos un fondo limpio (esto evita ver las variables)
  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: theme.background }} />;
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.background }}>
      <StatusBar backgroundColor={theme.barstyle_2 } barStyle={'light-content'}/>
      <View style={styles.header}>
        <Text style={{fontSize: 28, fontWeight: '700', color: theme.text_2 , marginTop: 10}}>{t('configuracion')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <Text style={styles.sectionTitle}>{t('preferencias')}</Text>
        
        <View style={styles.row}>
          <View>
            <Text style={styles.rowText}>{t('modo_oscuro')}</Text>
            <Text style={styles.subText}>{t('aspecto')}</Text>
          </View>
          <Switch 
            value={isDark} 
            onValueChange={ toggleTheme}
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
            <Text style={styles.rowText}>{t('foto_perfil')}</Text>
            <Text style={styles.subText}>{t('foto')}</Text>
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

        <TouchableOpacity onPress={selectLanguage} style={styles.row}>
          <View>
            <Text style={styles.rowText}>{t('idioma')}</Text>
            <Text style={styles.subText}>{t('espanol')}</Text>
          </View>
          <Ionicons name="language-outline" size={23} color="#D99015" />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 25 }]}>{t('sistema_mapas')}</Text>

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

        <TouchableOpacity onPress={() => setModalDestinosVisible(true)} style={styles.row}>
          <View>
            <Text style={styles.rowText}>Rutas Preferidas</Text>
            <Text style={styles.subText}>{destinoSeleccionado ? destinoSeleccionado : "Selecciona tus destinos usuales"}</Text>
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

      <Volver route={"./Profile"} color={theme.volver_button} style={{ top: 60, left: 10 }} />
      {/* Modal de Rutas con estilos inline */}
<Modal
  visible={modalDestinosVisible}
  transparent={true}
  animationType="slide"
  onRequestClose={() => setModalDestinosVisible(false)}
>
  <View style={{
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  }}>
    <View style={{
      width: '90%',
      backgroundColor: theme.background, // Usa el fondo de tu tema
      borderRadius: 25,
      padding: 25,
      maxHeight: '70%',
      elevation: 10,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 10
    }}>
      <Text style={{
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.text_2,
        marginBottom: 20,
        textAlign: 'center'
      }}>
        {t('rutas_preferidas')}
      </Text>

      <ScrollView contentContainerStyle={{height:'155%'}} style={{height:190}}>
        {Destinos.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 18,
              borderBottomWidth: 1,
              borderBottomColor: theme.isDark ? '#444' : '#f0f0f0'
            }}
            onPress={() => {
              setDestinoSeleccionado(item.nombre);
              setModalDestinosVisible(false);
            }}
          >
            <Ionicons name="location" size={20} color="#D99015" style={{ marginRight: 15 }} />
            <Text style={{ fontSize: 16, color: theme.text_2 }}>
              {item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={{
          marginTop: 20,
          backgroundColor: '#D99015',
          padding: 15,
          borderRadius: 15,
          alignItems: 'center'
        }}
        onPress={() => setModalDestinosVisible(false)}
      >
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
          {t('cancelar')}
        </Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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