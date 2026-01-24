import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Volver from '../../Components/Botones_genericos/Volver';

export default function CambiarContras() {
	const [contraActual, setContraActual] = useState('');
	const [nuevaContra, setNuevaContra] = useState('');
	const [confirmarContra, setconfirmarContra] = useState('');
	const [showContraActual, setShowContraActual] = useState(false);
	const [showNueva, setShowNueva] = useState(false);
	const [showConfirmar, setShowConfirmar] = useState(false);

    //Simulacion de la actualizacion de la contraseña
	const handleActualizarContra = () => {
		if (!contraActual) {
			Alert.alert('Error', 'Ingrese la contraseña actual');
			return;
		}
		if (nuevaContra !== confirmarContra) {
			Alert.alert('Error', 'Las contraseñas nuevas no coinciden');
			return;
		}
		if (nuevaContra.length < 6) {
			Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
			return;
		}

		// llamada al backend para actualizar la contraseña de verdad
		Alert.alert('Éxito', 'Su contraseña ha sido actualizada');
		setContraActual('');
		setNuevaContra('');
		setconfirmarContra('');
	};

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>Cambiar Contraseña</Text>
			</View>

			<ScrollView contentContainerStyle={styles.content}>
				<Text style={styles.sectionTitle}>SEGURIDAD</Text>

				<View style={styles.inputCard}>
					<Text style={styles.rowText}>Contraseña actual</Text>
					<View style={styles.inputRow}>
						<TextInput
							style={styles.input}
							placeholder="Ingrese la contraseña actual"
							secureTextEntry={!showContraActual}
							value={contraActual}
							onChangeText={setContraActual}
						/>
						<TouchableOpacity onPress={() => setShowContraActual(s => !s)} style={styles.eyeButton}>
							<Ionicons name={showContraActual ? 'eye-off' : 'eye'} size={22} color="#D99015" />
						</TouchableOpacity>
					</View>
				</View>

				<View style={styles.inputCard}>
					<Text style={styles.rowText}>Nueva contraseña</Text>
					<View style={styles.inputRow}>
						<TextInput
							style={styles.input}
							placeholder="Ingrese la nueva contraseña"
							secureTextEntry={!showNueva}
							value={nuevaContra}
							onChangeText={setNuevaContra}
						/>
						<TouchableOpacity onPress={() => setShowNueva(s => !s)} style={styles.eyeButton}>
							<Ionicons name={showNueva ? 'eye-off' : 'eye'} size={22} color="#D99015" />
						</TouchableOpacity>
					</View>
				</View>

				<View style={styles.inputCard}>
					<Text style={styles.rowText}>Confirmar nueva contraseña</Text>
					<View style={styles.inputRow}>
						<TextInput
							style={styles.input}
							placeholder="Repita la nueva contraseña"
							secureTextEntry={!showConfirmar}
							value={confirmarContra}
							onChangeText={setconfirmarContra}
						/>
						<TouchableOpacity onPress={() => setShowConfirmar(s => !s)} style={styles.eyeButton}>
							<Ionicons name={showConfirmar ? 'eye-off' : 'eye'} size={22} color="#D99015" />
						</TouchableOpacity>
					</View>
				</View>

				<TouchableOpacity style={styles.button} onPress={handleActualizarContra}>
					<Text style={styles.buttonText}>Actualizar Contraseña</Text>
				</TouchableOpacity>
			</ScrollView>

			<Volver route={"./Privacidad"} color={"#333"} style={{ top: 50, left: 10 }} />
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#F8F9FA' },
	header: { padding: 25, marginTop: 40 },
	title: { fontSize: 28, fontWeight: 'bold', color: '#2D3436' },
	content: { paddingHorizontal: 20 },
	sectionTitle: { fontSize: 12, fontWeight: '800', color: '#B2BEC3', marginBottom: 15, letterSpacing: 1 },
	inputCard: {
		backgroundColor: '#FDF7ED',
		padding: 17,
		borderRadius: 20,
		marginBottom: 12,
		elevation: 2,
		borderWidth: 1,
		borderColor: '#FAD7A0',
	},
	input: {
		marginTop: 8,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 20,
		height: 44,
		flex: 1,
		paddingRight: 44,
		borderWidth: 1,
		borderColor: '#FAD7A0',
		backgroundColor: '#ffffff',
		fontSize: 15
	},
	inputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		position: 'relative'
	},
	eyeButton: {
		position: 'absolute',
		right: 12,
		top: 18,
	},
	rowText: { fontSize: 16, fontWeight: '600', color: '#2D3436' },
	button: {
		backgroundColor: '#003366',
		padding: 15,
		borderRadius: 20,
		alignItems: 'center',
		marginTop: 10
	},
	buttonText: { color: 'white', fontWeight: '700', fontSize: 16 }
});

