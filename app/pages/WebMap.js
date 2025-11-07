import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

const { height, width } = Dimensions.get('window');

// ⚠️ IMPORTANTE: Este es el contenido del archivo Map.html como string
// En un proyecto real, es mejor leer el archivo usando expo-file-system o 
// importarlo si tu bundler lo permite, o simplemente copiar el HTML aquí.
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>OpenStreetMap con Leaflet</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        body { margin: 0; padding: 0; }
        #mapid { height: 100vh; width: 100%; }
    </style>
</head>
<body>
    <div id="mapid"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        // Coordenadas iniciales (ej. Caracas)
        const initialLat = 10.5000;
        const initialLon = -66.9167;

        var map = L.map('mapid').setView([initialLat, initialLon], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: 'Datos &copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        // Ejemplo de marcador
        L.marker([initialLat, initialLon]).addTo(map)
            .bindPopup("¡Hola, desde Venezuela!")
            .openPopup();

        // 💡 FUNCIÓN DE COMUNICACIÓN (opcional)
        // Puedes inyectar una función para enviar datos de vuelta a React Native
        // Si el usuario hace clic, puedes enviar las coordenadas de vuelta
        map.on('click', function(e) {
            const latlng = { lat: e.latlng.lat, lng: e.latlng.lng };
            window.ReactNativeWebView.postMessage(JSON.stringify(latlng));
        });
    </script>
</body>
</html>
`;


export default function WebMap() {
  
  const handleWebViewMessage = (event) => {
    // Recibe el mensaje (coordenadas) desde el HTML
    const data = JSON.parse(event.nativeEvent.data);
    console.log("Coordenadas del clic:", data);
    // Aquí podrías guardar la ubicación o hacer algo con ella
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: htmlContent }}
        style={styles.map}
        onMessage={handleWebViewMessage}
        // Este ajuste es importante para que el mapa se muestre bien en Android e iOS
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Asegura que el WebView ocupe todo el espacio
  },
  map: {
    flex: 1,
    // Puedes darle dimensiones fijas si lo necesitas, pero flex: 1 es lo habitual
  },
});