import React, {useEffect, useState} from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Expo ya incluye Ionicons
import { useRouter } from 'expo-router';
import { useTheme } from '../Temas_y_colores/ThemeContext';

export default function Volver({route,color,style}) {
  const router = useRouter();
  const { theme, isDark } = useTheme(); //temas oscuro y claro

  const colors = color || theme?.volver_button || "gray";

  return (
    <TouchableOpacity 
      style={[{backgroundColor: 'rgba(255, 255, 255, 0)', position:'absolute'},style]} 
      onPress={() => router.replace(route)}
      activeOpacity={0.7}
    >
      <Ionicons name="chevron-back" size={30} color={colors} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0)', position:'absolute'
  },
});