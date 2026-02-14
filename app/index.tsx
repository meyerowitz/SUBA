import { Text, View } from "react-native";
import { useEffect } from "react";
import Navigation from "./pages/Pasajero/Navigation";
import ChooseRol from "./ChoseaRol";
import SplashScreen from "./SplashScreen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Login from "./Login";

export default function Index() {
  return (
    <SafeAreaProvider>
      <SplashScreen></SplashScreen>
    </SafeAreaProvider>
  );
}