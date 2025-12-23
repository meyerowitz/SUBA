import React, { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { 
    SafeAreaView, 
    View, 
    Text, 
    TouchableOpacity, 
    StyleSheet, 
    StatusBar,
    Dimensions,
    TextInput,
    ScrollView,
    ImageBackground, 
    Image, 
    Modal,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// COLORES
const COLORS = {
    primaryBlue: '#102957',     
    secondaryOrange: '#FF9800',
    white: '#FFFFFF',
    darkText: '#333333',
    lightGray: '#F0F0F0',       
    inputBorder: '#CCCCCC',     
    neutralGray: '#666666',   
    gris: '#F2F2F2',  
};

//Lista de paradas de destino :D
const DESTINATION_STOPS = [
    'Macrocentro',
    'Uneg Villa Asia',
    'Unexpo',
    'Uneg Atlantico'
];

// Rutas de las imágenes
const BACKGROUND_IMAGE_SOURCE = require('./assets/images/Travel.png'); 

// Simulamos los iconos de tu carpeta assets:
const ASSET_IMAGES = {
    PROFILE_PLACEHOLDER: require('./assets/images/perfil.png'), 
    NAV_HOME_ACTIVE: require('./assets/images/home_activo.png'), 
    NAV_LOCATION_ACTIVE: require('./assets/images/ubi_activo.png'), 
    SEARCH_ICON: require('./assets/images/icono_flechas.png'),
    ICON_LOCATION: require('./assets/images/icono_ubicacion.png'),
};


const DestinationModal = ({ visible, stops, onSelect, onClose }) => (
    <Modal visible={visible} transparent={true} animationType="fade">
        <View style={modalStyles.overlay}>
            <View style={modalStyles.content}>
                <Text style={modalStyles.title}>Selecciona tu destino</Text>
                {stops.map((stop, index) => (
                    <TouchableOpacity 
                        key={index} 
                        style={modalStyles.item} 
                        onPress={() => onSelect(stop)}
                    >
                        <Text style={modalStyles.itemText}>{stop}</Text>
                    </TouchableOpacity>
                ))}
                <TouchableOpacity style={modalStyles.closeButton} onPress={onClose}>
                    <Text style={modalStyles.closeButtonText}>Cancelar</Text>
                </TouchableOpacity>
            </View>
        </View>
    </Modal>
);

const ScrollingText = ({ text, style }) => {
    return (
        <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ alignItems: 'center' }}
        >
            <Text style={style}>{text}</Text>
        </ScrollView>
    );
};

const TravelHomeScreen = () => {

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [currentLocationString, setCurrentLocationString] = useState('Buscando ubicación...');
    const [destinoSeleccionado, setDestinoSeleccionado] = useState('Selecciona tu destino');

       // FUNCIÓN PARA OBTENER LA UBICACIÓN 
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
            setCurrentLocationString('Permiso de ubicación denegado.');
            return;
            }

            let location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Highest,
            });
            const { latitude, longitude } = location.coords;

            

            let geocode = await Location.reverseGeocodeAsync({ latitude, longitude });

            if (geocode && geocode.length > 0) {
                const address = geocode[0];
                
            
                const detailedAddress = [
                    address.name && address.name !== address.street ? address.name : null,
                    address.street,
                    address.streetNumber,
                    address.district, 
                    address.city
                ]
                .filter(Boolean) 
                .join(', ');                   
                setCurrentLocationString(detailedAddress || 'Ubicación Desconocida');
            } else {
                setCurrentLocationString(`Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`);
            }
        })();
    }, []);
    // Nombre de usuario simulado
    const userName = "Miguel Gomez"; 
    
    // Simulación de la foto de perfil 
    const [profileImageUri, setProfileImageUri] = useState(null); 
    
    // Estado para navegación activa en el footer
    const [activeTab, setActiveTab] = useState('home');

    // Funciones
    const searchRoute = () => console.log("Buscar Ruta");
    const goToProfile = () => alert("Navegando a la pantalla de Perfil...");
        


    const handleSelectDestination = (destino) => {
        setDestinoSeleccionado(destino);
        setIsModalVisible(false);
        console.log(`Destino seleccionado: ${destino}`);
    };


    const renderProfileButton = () => {
    return (
        <TouchableOpacity 
            style={[styles.profileButton]} // Forzamos que esté al frente
            onPress={() => {
                console.log("¡Botón de Perfil Presionado!")
                goToProfile(true);
            }}
            activeOpacity={0.7}
        >
            <Image
                source={profileImageUri || ASSET_IMAGES.PROFILE_PLACEHOLDER}
                style={styles.profileImage}
                resizeMode="cover"
            />
        </TouchableOpacity>
    );
};

    return (
        <SafeAreaView style={styles.container}>
            
            <ImageBackground 
                source={BACKGROUND_IMAGE_SOURCE} 
                style={styles.backgroundImage}
                resizeMode="cover" 
                pointerEvents="box-none"
            >
              
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.greetingText}>Hola</Text>
                        <Text style={styles.greetingText}>{userName}</Text>
                        <Text style={styles.welcomeText}>¡Bienvenido de nuevo!</Text>
                    </View>
                    
                </View>

            </ImageBackground>


            <ScrollView contentContainerStyle={styles.scrollViewContent} style={styles.scrollViewStyle}>
                
                
                <TouchableOpacity style={styles.searchBar} onPress={() => console.log("Abrir Búsqueda General")}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar..."
                        placeholderTextColor={COLORS.neutralGray}
                        editable={false} 
                    />
                    <Text style={styles.searchIcon}>🔍</Text>
                </TouchableOpacity>


              
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceTitle}>Saldo actual</Text>
                    <Text style={styles.balanceAmount}>Bs. 54.59</Text>
                </View>

                <View style={styles.routeSectionWrapper}>
                    
                   
                    <View style={styles.routeInputsContainer}>
                        
                   
                    <View style={styles.routeFieldContainer}>

                        <View style={styles.labelWithIcon}>
                            <Image
                                source={ASSET_IMAGES.NAV_LOCATION_ACTIVE}
                                style={styles.labelIcon}
                            />
                            <Text style={styles.routeLabel}>Origen</Text>
                        </View>
    
                        <View style={[styles.textInput, { justifyContent: 'center' }]}>
                            <ScrollingText 
                            text={currentLocationString.includes('+') 
                            ? currentLocationString.split(',').slice(1).join(',').trim() 
                            : currentLocationString} 
                            style={{ color: COLORS.darkText, fontSize: 17 }} 
                        />
                        </View>

                    </View>                                                                  

                       
                    <View style={styles.routeFieldContainer}>
                    
                    <View style={styles.labelWithIcon}>
                        <Image
                            source={ASSET_IMAGES.NAV_LOCATION_ACTIVE}
                            style={styles.labelIcon}
                        />
                        <Text style={styles.routeLabel}>Destino</Text>
                    </View>
                    
                    <TouchableOpacity 
                            style={[styles.textInput, styles.dropdownInput]}
                            onPress={() => setIsModalVisible(true)}
                    >
                            <Text style={[styles.dropdownText, destinoSeleccionado === 'Selecciona tu destino' && { color: COLORS.neutralGray }]}>
                                {destinoSeleccionado}
                            </Text>
                            <Text style={styles.dropdownIcon}>▼</Text>
                    </TouchableOpacity>

                        </View>

                   </View>
                    <TouchableOpacity style={styles.searchButton} onPress={searchRoute}>
                        <Image
                         source={ASSET_IMAGES.SEARCH_ICON}
                         style={styles.searchButtonImage}
                        />
                    </TouchableOpacity>

                </View>
            </ScrollView>

            {/* PANTALLA FLOTANTE */}
            <DestinationModal 
                visible={isModalVisible} 
                stops={DESTINATION_STOPS} 
                onSelect={handleSelectDestination}
                onClose={() => setIsModalVisible(false)}
            />
                <View style={styles.footerNav}>
                    <TouchableOpacity style={styles.navButton} onPress={() => setActiveTab('home')}>
                        <Image 
                            source={ASSET_IMAGES.NAV_HOME_ACTIVE}
                            style={styles.navImage}
                        />
                    </TouchableOpacity>
                
               
                    <TouchableOpacity style={styles.navButton} onPress={() => setActiveTab('location')}>
                        <Image 
                            source={ASSET_IMAGES.NAV_LOCATION_ACTIVE}
                            style={styles.navImage}
                    />
                </TouchableOpacity>
              
            </View>

        <View style={styles.floatingProfileContainer}>
            <TouchableOpacity 
                style={styles.profileButton} 
                onPress={() => {
                console.log("¡Mensaje desde el Contenedor Flotante!");
                goToProfile();
                }}
            activeOpacity={0.8}
            >
                <Image
                    source={profileImageUri || ASSET_IMAGES.PROFILE_PLACEHOLDER}
                    style={styles.profileImage}
                    resizeMode="cover"
                />
            </TouchableOpacity>
        </View>                        
        
            
        </SafeAreaView>
    );
};

// --- ESTILOS ---
const modalStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)', // Fondo oscurecido
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: '85%',
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 20,
        elevation: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.primaryBlue,
        marginBottom: 15,
        textAlign: 'center',
    },
    item: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
    },
    itemText: { fontSize: 18, color: COLORS.darkText },
    closeButton: { marginTop: 15, alignItems: 'center' },
    closeButtonText: { color: 'red', fontWeight: 'bold' },
});

const styles = StyleSheet.create({
    
    floatingProfileContainer: {
    position: 'absolute', 
    top: 50,              
    right: 15,            
    zIndex: 999,         
    elevation: 10,     
    },


    container: {
        flex: 1, 
        backgroundColor: 'transparent',
    },

    backgroundImage: {
        height: height, 
        position: 'absolute',
        width: '100%',
        top: 0,
        zIndex: 0,
    },
    
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 25,
        paddingTop: 40, 
        zIndex: 110,
    
    },
    greetingText: {
        fontSize: 24, 
        fontWeight: 'bold',
        color: COLORS.white,
        lineHeight: 28,
    },
    welcomeText: {
        fontSize: 25, 
        fontWeight: 'bold', 
        color: COLORS.white,
        lineHeight: 50,
        marginLeft: 30,
        marginTop: 25, 
    },
    
  
    profileButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: COLORS.white,
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        marginBottom: 70, 
        zIndex:999,
    },
    profileImage: {
        width: '100%',
        height: '100%',
    },
    profilePlaceholderIcon: {
        width: '60%', 
        height: '60%',
        tintColor: COLORS.white, 
    },
    

    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 15,
        marginHorizontal: 0,
        position: 'absolute',
        bottom: 20, 
        left: 25,
        right: 25,
        paddingHorizontal: 15,
        paddingVertical: 10,
        elevation: 5,
        shadowColor: COLORS.darkText,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        zIndex: 3,
        marginBottom: 420,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.darkText,
        paddingVertical: 0,
    },
    searchIcon: {
        fontSize: 20,
        color: COLORS.neutralGray,
    },

   
    scrollViewStyle: {
        flex: 1,
        zIndex: 1,
    },
    scrollViewContent: {
        paddingTop: height * 0.45 - 50, 
        paddingHorizontal: 25,
        backgroundColor: 'transparent', 
        minHeight: height * 0.6, 
    },

    balanceCard: {
        backgroundColor: COLORS.secondaryOrange,
        borderRadius: 15,
        padding: 20,
        alignItems: 'flex-start',
        marginBottom: 10, 
        marginTop: -20, 
        elevation: 8,
        shadowColor: COLORS.darkText,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        marginHorizontal: 0, 
    },
    balanceTitle: {
        fontSize: 18,
        color: COLORS.white,
        marginBottom: 5,
        fontWeight: 'bold',
    },
    balanceAmount: {
        fontSize: 40,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    
    routeSectionWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-start', 
        paddingTop: 30, 
        paddingBottom: 20,       
        padding: 15,
        marginTop: 5, 
    },

    
    routeInputsContainer: {
        flex: 1, 
        marginRight: 10, 
    },


    routeFieldContainer: {
        marginBottom: 15, 
    },
    
    labelWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8, 
    },

    labelIcon: {
        width: 20, 
        height: 20,
        resizeMode: 'contain',
        tintColor: COLORS.darkText, 
        marginRight: 8, 
    },

    routeLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.darkText,
        marginBottom: 8,
    },
    textInput: {
        height: 60,
        borderColor: COLORS.inputBorder,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 15,
        fontSize: 18,
        color: COLORS.darkText,
        backgroundColor: COLORS.lightGray, 
        justifyContent: 'center', 
    },

    
    dropdownInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingRight: 15,
        backgroundColor: COLORS.white, 
    },
    dropdownText: {
        fontSize: 18,
        color: COLORS.darkText,
    },
    dropdownIcon: {
        fontSize: 12,
        color: COLORS.darkText,
    },
    

    searchButton: {
        backgroundColor: COLORS.gris,
        width: 50,
        height: 50,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        marginTop: 100,
        marginRight: -5,
    },
    searchButtonImage: {
        width: 30, 
        height: 30,
        resizeMode: 'contain',
        tintColor: COLORS.primaryBlue,
    },

   
    footerNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: COLORS.white,
        paddingVertical: 20,
        borderTopWidth: 1,
        borderColor: COLORS.inputBorder,
        elevation: 10, 
    },
    navButton: {
        padding: 10,
        alignItems: 'center',
    },
    navImage: {
        width: 40, 
        height: 40,
        resizeMode: 'contain',
        marginBottom: 30,
        marginTop: -10,
    },
    
});

export default TravelHomeScreen;