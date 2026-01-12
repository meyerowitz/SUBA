import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Text , Image, ImageBackground, StatusBar} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import { Canvas, Circle, RadialGradient, vec , BlurMask} from "@shopify/react-native-skia";
import { useRouter } from 'expo-router';
import * as SplashScreenNative from 'expo-splash-screen';


export default function SplashScreen () {
  const fadeAnim = useRef(new Animated.Value(0)).current; // Opacidad inicial 0
  const size = 806;
  const center = size / 2;

 
  const router = useRouter();

  useEffect(() => {
    SplashScreenNative.hideAsync();
    Animated.sequence([
      // 1. Aparecer (Fade In)
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // 2. Mantenerse visible
      Animated.delay(3000), 
      // 3. Desaparecer (Fade Out)
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Esta función se ejecuta cuando TODA la secuencia termina
      // Asegúrate de que el nombre coincida con tu archivo en la carpeta /app
      router.replace('/Login'); 
    });
  }, [fadeAnim, router]);



  return (
    <View style={{flex:1}}>
        <StatusBar translucent={true} backgroundColor="transparent" barStyle="ligth-content"></StatusBar>
        
      <Animated.View style={{  flex:1, opacity: fadeAnim }}>
        <LinearGradient
        colors={[ '#0a98f6ff','#0020abff',  '#001677ff', '#001677ff','#001677ff',  '#001677ff']}
        style={{position:'absolute', top:0, left:0, width:'100%', height:'100%'}}
      />
      <ImageBackground
        source={require('../assets/img/texturas/fiber.png')}
        resizeMode="repeat"
        style={{flex:1,  alignItems:'center'}}
        imageStyle={{ 
            opacity: 1, 
            width: '100%', 
            height: '100%',
            tintColor: '#ffffffff' 
        }}
      >

        <View style={{ marginTop:'60%',width:'100%',justifyContent:'center', alignItems:'center',shadowColor: '#000',shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,shadowRadius: 10,elevation: 10,}}>
            <View style={{width:200, height:200, borderRadius:70,shadowOpacity: 0.25,shadowRadius: 10,elevation: 10,shadowColor: '#000',shadowOffset: { width: 0, height: 10 },}}>
                <Image source={require('../assets/img/icono_android.png')} style={{width:'110%', height:'100%', marginLeft:-10,}}></Image>
            </View>
            <Image source={require('../assets/img/wordmark.png')} style={{height:100, width:220, margin:10}}></Image>
       </View>
        <View style={{width:'100%',justifyContent:'center', alignItems:'center', marginTop:'45%'}}>
            <Text style={{color:'white', }}>Bienvenido a SUBA</Text>
            <Text style={{color:'white',textAlign: 'center'}}>Proyecto realizado por los estudiantes de la Universidad Nacional Experimental de Guayana</Text>
        </View>
       
      </ImageBackground>
      
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // Color de fondo de tu splash
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#333',
  },
});
