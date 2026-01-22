import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Alert,
	TextInput,
	Modal,
	Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome, FontAwesome5, Ionicons } from '@expo/vector-icons';
import Volver from '../../Components/Botones_genericos/Volver';
import * as ImagePicker from 'expo-image-picker';
export default function Subsidios() {
	const [selectedOption, setSelectedOption] = useState(null); // 'estudiante' | 'adulto' | 'discapacitado'
	const [modalVisible, setModalVisible] = useState(false);

	// Estudiante
	const [university, setUniversity] = useState('');
	const [studentImage, setStudentImage] = useState(null);

	// Adulto mayor
	const [seniorPersonImage, setSeniorPersonImage] = useState(null);
	const [seniorIdImage, setSeniorIdImage] = useState(null);

	// Discapacitado
	const [disabledDocImage, setDisabledDocImage] = useState(null);

	useEffect(() => {
		(async () => {
			const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
			if (status !== 'granted') {
				Alert.alert('Permiso requerido', 'Se necesita permiso para acceder a las imágenes.');
			}
		})();
	}, []);

	const openOption = (opt) => {
		setSelectedOption(opt);
		setModalVisible(true);
	};

	const pickImage = async (setter) => {
		try {
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				quality: 0.7,
				allowsEditing: true
			});

			if (!result.canceled) {
				const uri = result.assets ? result.assets[0].uri : result.uri;
				setter(uri);
			}
		} catch (e) {
			console.log('pickImage error', e);
			Alert.alert('Error', 'No se pudo seleccionar la imagen.');
		}
	};

	const handleSubmit = () => {
		if (selectedOption === 'estudiante') {
			if (!university.trim() || !studentImage) {
				Alert.alert('Faltan datos', 'Por favor indica la universidad y sube la constancia.');
				return;
			}
			Alert.alert('Enviado', 'Solicitud como estudiante registrada.');
			setUniversity('');
			setStudentImage(null);
		}

		if (selectedOption === 'adulto') {
			if (!seniorPersonImage || !seniorIdImage) {
				Alert.alert('Faltan fotos', 'Sube la foto de la persona y la cédula.');
				return;
			}
			Alert.alert('Enviado', 'Solicitud como adulto mayor registrada.');
			setSeniorPersonImage(null);
			setSeniorIdImage(null);
		}

		if (selectedOption === 'discapacitado') {
			if (!disabledDocImage) {
				Alert.alert('Faltan fotos', 'Sube el carnet o constancia de discapacidad.');
				return;
			}
			Alert.alert('Enviado', 'Solicitud como persona con discapacidad registrada.');
			setDisabledDocImage(null);
		}

		setModalVisible(false);
		setSelectedOption(null);
	};

	const renderModalContent = () => {
		if (!selectedOption) return null;

		if (selectedOption === 'estudiante') {
			return (
				<View>
					<Text style={styles.modalTitle}>Subsidio de tipo: Estudiante</Text>
					<Text style={styles.modalSubtitle}>Indica tu universidad y sube la constancia</Text>

					<Text style={styles.label}>Universidad</Text>
					<TextInput
						placeholder="Nombre de la universidad"
						value={university}
						onChangeText={setUniversity}
						style={styles.inputPro}
					/>

					<Text style={[styles.label, { marginTop: 10 }]}>Constancia de estudios</Text>
					<TouchableOpacity style={styles.imageSelector} onPress={() => pickImage(setStudentImage)}>
						{studentImage ? (
							<Image source={{ uri: studentImage }} style={styles.previewImage} />
						) : (
							<View style={{ alignItems: 'center' }}>
								<Ionicons name="cloud-upload-outline" size={36} color="#D99015" />
								<Text style={{ color: '#7F8C8D', marginTop: 8 }}>Subir constancia</Text>
							</View>
						)}
					</TouchableOpacity>

					<TouchableOpacity style={styles.btnPrincipal} onPress={handleSubmit}>
						<Text style={styles.btnPrincipalText}>Enviar solicitud</Text>
					</TouchableOpacity>
				</View>
			);
		}

		if (selectedOption === 'adulto') {
			return (
				<View>
					<Text style={styles.modalTitle}>Subsidio de Tipo: Adulto Mayor</Text>
					<Text style={styles.modalSubtitle}>Sube una foto tuya y la de tu cédula</Text>

					<Text style={styles.label}>Foto de la persona</Text>
					<TouchableOpacity style={styles.imageSelector} onPress={() => pickImage(setSeniorPersonImage)}>
						{seniorPersonImage ? (
							<Image source={{ uri: seniorPersonImage }} style={styles.previewImage} />
						) : (
							<View style={{ alignItems: 'center' }}>
								<Ionicons name="person" size={36} color="#D99015" />
								<Text style={{ color: '#7F8C8D', marginTop: 8 }}>Subir foto</Text>
							</View>
						)}
					</TouchableOpacity>

					<Text style={[styles.label, { marginTop: 10 }]}>Foto de la cédula</Text>
					<TouchableOpacity style={styles.imageSelector} onPress={() => pickImage(setSeniorIdImage)}>
						{seniorIdImage ? (
							<Image source={{ uri: seniorIdImage }} style={styles.previewImage} />
						) : (
							<View style={{ alignItems: 'center' }}>
								<Ionicons name="document-text" size={36} color="#D99015" />
								<Text style={{ color: '#7F8C8D', marginTop: 8 }}>Subir cédula</Text>
							</View>
						)}
					</TouchableOpacity>

					<TouchableOpacity style={styles.btnPrincipal} onPress={handleSubmit}>
						<Text style={styles.btnPrincipalText}>Enviar solicitud</Text>
					</TouchableOpacity>
				</View>
			);
		}

		if (selectedOption === 'discapacitado') {
			return (
				<View>
					<Text style={styles.modalTitle}>Subsidio de Tipo: Persona con Discapacidad</Text>
					<Text style={styles.modalSubtitle}>Sube el carnet o constancia</Text>

					<Text style={[styles.label, { marginTop: 10 }]}>Carnet / Constancia</Text>
					<TouchableOpacity style={styles.imageSelector} onPress={() => pickImage(setDisabledDocImage)}>
						{disabledDocImage ? (
							<Image source={{ uri: disabledDocImage }} style={styles.previewImage} />
						) : (
							<View style={{ alignItems: 'center' }}>
								<Ionicons name="document-text" size={36} color="#D99015" />
								<Text style={{ color: '#7F8C8D', marginTop: 8 }}>Subir documento</Text>
							</View>
						)}
					</TouchableOpacity>

					<TouchableOpacity style={styles.btnPrincipal} onPress={handleSubmit}>
						<Text style={styles.btnPrincipalText}>Enviar solicitud</Text>
					</TouchableOpacity>
				</View>
			);
		}

		return null;
	};

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView contentContainerStyle={styles.content}>
				<View style={styles.header}>
					<Text style={styles.title}>Subsidios</Text>
					<Text style={styles.description}>Selecciona la categoría que aplica para solicitar un subsidio.</Text>
				</View>

				<View style={{ marginTop: 20 }}>
					<TouchableOpacity style={styles.row} onPress={() => openOption('estudiante')}>
						<View>
							<Text style={styles.rowText}>Como Estudiante</Text>
							<Text style={styles.subText}>Sube tu constancia de estudios</Text>
						</View>
						<FontAwesome5 name="graduation-cap" size={20} color="#003366" />
					</TouchableOpacity>

					<TouchableOpacity style={styles.row} onPress={() => openOption('adulto')}>
						<View>
							<Text style={styles.rowText}>Como Adulto Mayor</Text>
							<Text style={styles.subText}>Sube una foto y tu cédula</Text>
						</View>
						<Ionicons name="accessibility" size={20} color="#D99015" />
					</TouchableOpacity>

					<TouchableOpacity style={styles.row} onPress={() => openOption('discapacitado')}>
						<View>
							<Text style={styles.rowText}>Persona con Discapacidad</Text>
							<Text style={styles.subText}>Sube tu carnet o constancia</Text>
						</View>
						<Ionicons name="heart-sharp" size={20} color="#003366" />
					</TouchableOpacity>
				</View>
			</ScrollView>

			<Modal visible={modalVisible} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<ScrollView>
							{renderModalContent()}

							<TouchableOpacity
								onPress={() => { setModalVisible(false); setSelectedOption(null); }}
								style={[styles.btnPrincipal, { backgroundColor: '#CCCCCC', marginTop: 15 }]}
							>
								<Text style={[styles.btnPrincipalText, { color: '#333' }]}>Cancelar</Text>
							</TouchableOpacity>
						</ScrollView>
					</View>
				</View>
			</Modal>

			<Volver route={"./Profile"} color={"#333"} style={{ top: 60, left: 10 }} />
		</SafeAreaView>
	);
}

	const styles = StyleSheet.create({
		container: { flex: 1, backgroundColor: '#F8F9FA' },
		content: { paddingHorizontal: 20, paddingBottom: 30 },
		header: { padding: 9, marginTop: 50 },
		title: { fontSize: 28, fontWeight: '700', color: '#2D3436', marginTop: 10 },
		description: { fontSize: 14, color: '#636E72', marginTop: 8 },
		row: { 
			flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
			backgroundColor: 'white', padding: 18, borderRadius: 20, marginBottom: 12,
			elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5
		},
		rowText: { fontSize: 16, fontWeight: '600', color: '#2D3436' },
		subText: { fontSize: 12, color: '#636E72' },


		modalOverlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
		modalContent: { backgroundColor: 'white', borderRadius:20, padding: 20, minHeight: 300 },
		modalTitle: { fontSize: 28, fontWeight: '700', color: '#003366' },
		modalSubtitle: { fontSize: 13, color: '#7F8C8D', marginBottom: 12 },
		label: { fontSize: 13, fontWeight: '700', color: '#2D3436', marginTop: 12 },
		inputPro: { backgroundColor: '#F2F4F4', padding: 12, borderRadius: 20, marginTop: 8 },
		imageSelector: { height: 160, backgroundColor: '#F8F9F9', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10, borderStyle: 'dashed', borderWidth: 2, borderColor: '#BDC3C7' },
		previewImage: { width: '100%', height: '100%', borderRadius: 12 },
		btnPrincipal: { backgroundColor: '#003366', padding: 14, borderRadius: 20, alignItems: 'center', marginTop: 12 },
		btnPrincipalText: { color: 'white', fontWeight: '700' }
	});

