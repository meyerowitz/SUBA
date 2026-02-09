import React, { useState } from 'react'; // Importamos useState
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  interpolate,
} from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const Diamond = ({ theme }) => {
    const router= useRouter();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);
  const [isOpen, setIsOpen] = useState(false); // Estado para controlar si está abierto

  const MAX_UP = -40;

  const slowSpringConfig = {
    damping: 25,
    stiffness: 150,
    mass: 2, // Bajé un poco la masa de 25 a 2 para que responda mejor al click pero siga suave
  };

  // Función para manejar el Click
  const toggleMenu = () => {
    if (isOpen) {
      translateY.value = withSpring(0, slowSpringConfig);
    } else {
      translateY.value = withSpring(MAX_UP, slowSpringConfig);
    }
    setIsOpen(!isOpen);
  };

  const animatedButtonStyle = useAnimatedStyle(() => {
    const rotation = interpolate(translateY.value, [0, MAX_UP], [45, 135]);
    return {
      transform: [
        { translateY: translateY.value },
        { rotate: `${rotation}deg` }
      ],
    };
  });

  const iconStyle = useAnimatedStyle(() => {
    const rotation = interpolate(translateY.value, [0, MAX_UP], [-45, -135]);
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  const nfcStyle = useAnimatedStyle(() => {
    const translateX = interpolate(translateY.value, [0, MAX_UP], [0, -75]);
    const translateY_diagonal = interpolate(translateY.value, [0, MAX_UP], [0, -60]); 
    
    const opacity = interpolate(translateY.value, [0, MAX_UP / 1.5], [0, 1]);
    const scale = interpolate(translateY.value, [0, MAX_UP], [0.5, 1]);

    return {
      opacity,
      transform: [
        { translateX }, 
        { translateY: translateY_diagonal }, // <-- Nueva diagonal
        { scale }
      ],
    };
  });

  const qrStyle = useAnimatedStyle(() => {
    const translateX = interpolate(translateY.value, [0, MAX_UP], [0, 75]);
    const translateY_diagonal = interpolate(translateY.value, [0, MAX_UP], [0, -60]); 
    const opacity = interpolate(translateY.value, [0, MAX_UP / 1.5], [0, 1]);
    const scale = interpolate(translateY.value, [0, MAX_UP], [0.5, 1]);
    return {
      opacity,
      transform: [{ translateX }, { translateY: translateY_diagonal }, // <-- Nueva diagonal
        { scale }],
      
    };
  });

  return (
    <View style={[styles.mainContainer, { bottom: 19 + insets.bottom }]} pointerEvents="box-none">
      <View style={styles.optionsWrapper} pointerEvents="box-none">
        <Animated.View style={[styles.optionCircle, nfcStyle]}>
          <TouchableOpacity style={styles.touch} onPress={() => {console.log('NFC Pressed'), router.replace('/Components/ScannerQR')}}>
            <Ionicons name="contactless-payment" size={22} color="#FFF" />
            <Text style={styles.optionText}>NFC</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.optionCircle, qrStyle]}>
          <TouchableOpacity style={styles.touch} onPress={() => {console.log('QR Pressed'), router.replace('/Components/ScannerQR')}}>
            <Ionicons name="qr-code" size={22} color="#FFF" />
            <Text style={styles.optionText}>QR</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Reemplazamos GestureDetector por un Pressable animado */}
      <Pressable onPress={toggleMenu}>
        <Animated.View style={[styles.diamondWrapper, animatedButtonStyle]}>
          <LinearGradient colors={['#00a2e7','#2374c4']} style={styles.diamond}>
            <Animated.View style={iconStyle}>
                <Ionicons name="logo-paypal" size={28} color="#FFF" />
            </Animated.View>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
  );
};
const styles = StyleSheet.create({
  mainContainer: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 10,
    width: 250, // Un poco más ancho para que no se corten los botones
    height: 120,
    justifyContent: 'flex-end',
  },
  optionsWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  optionCircle: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2374c4',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  touch: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  diamondWrapper: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  diamond: {
    width: 60,
    height: 60,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  optionText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  }
});

export default Diamond;