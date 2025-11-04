
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { UrlTile } from 'react-native-maps';

// Coordenadas de ejemplo (Caracas, Venezuela)
const CARACAS = {
  latitude: 10.5000,
  longitude: -66.9167,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

// URL de Tiles de OpenStreetMap (protocolo estándar sin API Key)
const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export default function Maps() {
    return(
        <>
        <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={CARACAS}
        provider={undefined} 
      >
        <UrlTile
          shouldReplaceMapContent={true} 
          urlTemplate={OSM_TILE_URL} 
          attribution="© OpenStreetMap contributors"
        />
        
        
      </MapView>
      <View style={styles.attributionBox}>
          <Text style={styles.attributionText}>Datos del mapa © OpenStreetMap contributors</Text>
      </View>
    </View>
        </>
    );
 

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  attributionBox: {
    padding: 5,
    backgroundColor: 'white',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#ccc',
  },
  attributionText: {
    fontSize: 10,
    color: '#333',
  }
});