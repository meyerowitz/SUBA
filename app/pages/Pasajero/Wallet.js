import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Alert,
  Image,
  TextInput,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Pressable,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../Components/Temas_y_colores/ThemeContext";
import { useRouter, useFocusEffect } from "expo-router";

// Configuración de Supabase (Solo para subir los comprobantes, NO para base de datos)
const supabase = createClient(
  "https://wkkdynuopaaxtzbchxgv.supabase.co",
  "sb_publishable_S18aNBlyLP3-hV_mRMcehA_zbCDMSGP",
);

// 🔗 CONEXIÓN AL BACKEND
const API_URL = "https://subapp-api.onrender.com";

export default function WalletScreen() {
  // --- ESTADOS DE SEGURIDAD ---
  const [verificando, setVerificando] = useState(true);

  // --- ESTADOS DE LOGICA (ORIGINALES) ---
  const [operaciones, setOperaciones] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [userName, setUserName] = useState("...");

  // Modals Antiguos
  const [modalVisible, setModalVisible] = useState(false); // Recarga
  const [step, setStep] = useState(1);
  const [image, setImage] = useState(null);
  const [saldo, setSaldo] = useState(0.0);
  const [referencia, setReferencia] = useState("");
  const [montoInput, setMontoInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const { theme } = useTheme();

  // Transferencia Interna
  const [modalTransferVisible, setModalTransferVisible] = useState(false);
  const [destinatarioID, setDestinatarioID] = useState("");
  const [montoTransferir, setMontoTransferir] = useState("");
  const [nombreDestinatario, setNombreDestinatario] = useState(null);

  // --- ESTADOS DE UI (NUEVOS) ---
  const [seccionAbierta, setSeccionAbierta] = useState(null);
  const [modalDineroVisible, setModalDineroVisible] = useState(false);

  const tasaDolar = 45.0;
  const estadoTarjetaFisica = "SIN_TARJETA";

  const router = useRouter();

  const datosBancarios = {
    banco: "Banco de Venezuela",
    telefono: "04128695918",
    identidad: "V-30366440",
  };

  const API_URL = "https://subapp-api.onrender.com";

  // 🛡️ GUARDIA DE SEGURIDAD (INTERCEPTOR KYC BLINDADO)

  useFocusEffect(
    useCallback(() => {
      /** Cambiar por el auth/me por donde este los datos para vericiar  */
      const verificarKYC = async () => {
        try {
          console.log("-----------------------------------------");
          console.log("🔍 [GUARDIA] Iniciando verificación...");
          setVerificando(true);

          // 1. 🔥 LEER SOLO EL TOKEN PARA AUTENTICAR 🔥
          const token = await AsyncStorage.getItem("@Token_acceso");
          console.log(
            "🔍 [GUARDIA] Token leído:",
            token ? "Encontrado" : "NULO",
          );

          if (!token) {
            console.log("🛑 [GUARDIA] No hay token -> Login");
            router.replace("/Login");
            return;
          }

          // 2. ⚡ CONSULTA DIRECTA AL BACKEND ⚡
          console.log("📡 [GUARDIA] GET /auth/me...");
          const response = await fetch(`${API_URL}/auth/me`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          const userData = await response.json();
          console.log("📡 [GUARDIA] Respuesta:", userData);

          if (response.ok && userData.success) {
            const user = userData.data;

            // 3. 🛡️ VERIFICACIÓN EN TIEMPO REAL 🛡️
            if (!user.cedula || !user.isProfileComplete) {
              console.log("🛑 [GUARDIA] KYC Incompleto en DB.");
              router.replace("/pages/Pasajero/FormularioPerfil");
              return;
            }

            // 4. 🔥 SINCRONIZAR LOCALMENTE 🔥
            // Actualizamos los datos locales por si el perfil cambió en BD
            await AsyncStorage.setItem("@Sesion_usuario", JSON.stringify(user));

            console.log("✅ [GUARDIA] KYC Completo. Acceso permitido.");
            await inicializar();
          } else {
            console.log("🛑 [GUARDIA] Token inválido o error en servidor.");
            router.replace("/Login");
          }
        } catch (error) {
          console.error("💥 [GUARDIA] Error:", error);
        } finally {
          console.log("🏁 [GUARDIA] Verificación finalizada.");
          console.log("-----------------------------------------");
          setVerificando(false);
        }
      };

      verificarKYC();
    }, []),
  );

  const inicializar = async () => {
    const nombre = await getusername();
    setUserName(nombre || "Usuario");
    await obtenerSaldoReal();
    await cargarHistorial();
  };

  useEffect(() => {
    // Simulación de búsqueda de usuario (Idealmente esto también iría al backend)
    if (destinatarioID.length >= 5) {
      if (destinatarioID === "12345") setNombreDestinatario("Juan Pérez");
      else if (destinatarioID === "67890")
        setNombreDestinatario("María García");
      else setNombreDestinatario("Usuario SUBA");
    } else {
      setNombreDestinatario(null);
    }
  }, [destinatarioID]);

  // --- FUNCIONES DE LÓGICA CON EL BACKEND ---
  const getToken = async () => {
    const session = await AsyncStorage.getItem("@Sesion_usuario");
    return session ? JSON.parse(session).token : null;
  };

  const getusername = async () => {
    const session = await AsyncStorage.getItem("@Sesion_usuario");
    return session ? JSON.parse(session).fullName : "";
  };

  const obtenerSaldoReal = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/billetera/saldo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (response.ok && data.saldo !== undefined) {
        setSaldo(data.saldo);
      } else {
        setSaldo(0.0);
      }
    } catch (error) {
      console.log("Error al obtener saldo del servidor:", error);
    }
  };

  const cargarHistorial = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/billetera/historial`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (response.ok && data.historial) {
        // Adaptamos el historial del backend a tu UI
        const formateados = data.historial.map((item) => ({
          id: item.id || item._id,
          titulo:
            item.estado === "completado" ? "Operación Exitosa" : "En proceso",
          subtitulo:
            item.tipo === "transferencia"
              ? `P2P`
              : `Ref: ${item.referencia || "N/A"}`,
          hora: new Date(
            item.createdAt || item.created_at,
          ).toLocaleDateString(),
          monto: item.monto,
          esIngreso: item.tipo === "recarga" || item.es_receptor,
          tipo:
            item.tipo === "transferencia"
              ? "Transferencia P2P"
              : "Recarga de Saldo",
          icono: item.tipo === "transferencia" ? "paper-plane" : "bolt",
        }));
        setOperaciones(formateados);
      }
    } catch (error) {
      console.log("Error cargando historial:", error);
    } finally {
      setCargandoHistorial(false);
    }
  };

  const copiarTodo = async () => {
    const textoCompleto = `Banco: ${datosBancarios.banco}\nTelf: ${datosBancarios.telefono}\nCI: ${datosBancarios.identidad}`;
    await Clipboard.setStringAsync(textoCompleto);
    Alert.alert("¡Copiado!", "Datos listos para tu Pago Móvil.");
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const registrarYValidar2 = async () => {
    if (!image || !referencia || !montoInput) {
      Alert.alert(
        "Campos incompletos",
        "Por favor sube el comprobante y llena los datos.",
      );
      return;
    }
    setCargando(true);
    try {
      const token = await getToken();
      const montoARecargar = parseFloat(montoInput);

      // 1. Subir imagen a Supabase Storage (Mantenemos tu lógica de Storage)
      const fileName = `captures/${Date.now()}.jpg`;
      const formData = new FormData();
      formData.append("file", {
        uri: Platform.OS === "android" ? image : image.replace("file://", ""),
        name: fileName,
        type: "image/jpeg",
      });

      const { error: storageError } = await supabase.storage
        .from("comprobantes")
        .upload(fileName, formData);
      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage
        .from("comprobantes")
        .getPublicUrl(fileName);

      // 2. Enviar la solicitud de recarga al Backend (El backend se encarga de sumar el saldo)
      const payload = {
        monto: montoARecargar,
        referencia: referencia,
        comprobanteUrl: urlData.publicUrl,
      };

      const response = await fetch(`${API_URL}/api/billetera/recarga`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Error al procesar la recarga");

      Alert.alert(
        "Recarga en Revisión",
        "Tu pago ha sido reportado exitosamente. En breve actualizaremos tu saldo.",
      );
      setModalVisible(false);
      await obtenerSaldoReal(); // Refrescamos el saldo
      await cargarHistorial(); // Refrescamos el historial
    } catch (error) {
      Alert.alert("Error", "No pudimos procesar el reporte: " + error.message);
    } finally {
      setCargando(false);
      setImage(null);
      setReferencia("");
      setMontoInput("");
      setStep(1);
    }
  };

  const ejecutarTransferenciaReal = async () => {
    const monto = parseFloat(montoTransferir);
    if (!nombreDestinatario) {
      Alert.alert("Error", "ID no encontrado.");
      return;
    }
    if (isNaN(monto) || monto <= 0) {
      Alert.alert("Monto inválido", "Ingresa un monto correcto.");
      return;
    }
    if (monto > saldo) {
      Alert.alert("Saldo insuficiente", "No tienes suficiente saldo.");
      return;
    }

    setCargando(true);
    try {
      const token = await getToken();

      // Enviar la transferencia al Backend
      const payload = {
        destinatarioId: destinatarioID.trim(),
        monto: monto,
      };

      const response = await fetch(`${API_URL}/api/billetera/transferir`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Error al realizar la transferencia");

      Alert.alert(
        "¡Transferencia Exitosa!",
        `Has enviado Bs. ${monto.toFixed(2)} a ${nombreDestinatario}`,
      );
      setModalTransferVisible(false);
      setMontoTransferir("");
      setDestinatarioID("");
      await obtenerSaldoReal(); // El backend ya restó el saldo, lo traemos fresco
      await cargarHistorial();
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setCargando(false);
    }
  };

  const toggleSeccion = (seccion) => {
    setSeccionAbierta(seccionAbierta === seccion ? null : seccion);
  };

  // 🛡️ Pantalla de carga mientras el Guardia verifica
  if (verificando) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#F8FAFC",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#023A73" />
        <Text style={{ marginTop: 10, color: "#023A73", fontWeight: "bold" }}>
          Cargando billetera segura...
        </Text>
      </View>
    );
  }

  // --- RENDER ---
  return (
    <View style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        translucent={true}
        backgroundColor="transparent"
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* --- ENCABEZADO --- */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <FontAwesome6 name="arrow-left" size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.topHeaderTitle}>Mi Billetera</Text>
          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => alert("Ayuda")}
          >
            <FontAwesome6 name="circle-question" size={22} color="#0284C7" />
          </TouchableOpacity>
        </View>

        {/* --- 1. LA TARJETA DIGITAL (Identidad SUBA) --- */}
        <View style={styles.walletCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardLabel}>Saldo disponible</Text>
              <Text style={styles.cardBalanceBs}>Bs. {saldo.toFixed(2)}</Text>
              <Text style={styles.cardBalanceUsd}>
                $ ~ {(saldo / tasaDolar).toFixed(2)} USD
              </Text>
            </View>

            {/* EL BOTÓN AMARILLO SUBA */}
            <TouchableOpacity
              style={styles.btnActionCircle}
              onPress={() => setModalDineroVisible(true)}
            >
              <FontAwesome6
                name="money-bill-transfer"
                size={20}
                color="#023A73"
              />
              <Text style={styles.btnActionText}>Mover</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardFooter}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <FontAwesome6
                name="circle-check"
                size={14}
                color="#FFA311"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.accountName}>Billetera SUBA Activa</Text>
            </View>
          </View>
        </View>

        {/* --- 2. GESTIÓN (Acordeones Desplegables) --- */}
        <Text style={styles.sectionTitle}>Gestión de Cuenta</Text>
        <View style={styles.accordionContainer}>
          {/* DESPLEGABLE: TARJETA FÍSICA */}
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => toggleSeccion("tarjeta")}
            activeOpacity={0.7}
          >
            <View style={styles.accordionIconLeft}>
              <FontAwesome6 name="credit-card" size={18} color="#0284C7" />
            </View>
            <View style={styles.accordionTitleBox}>
              <Text style={styles.accordionTitle}>Tarjeta Física SUBA</Text>
              <Text style={styles.accordionSubtitle}>
                {estadoTarjetaFisica === "SIN_TARJETA"
                  ? "Solicítala por 5$"
                  : estadoTarjetaFisica === "POR_VINCULAR"
                    ? "¡Lista para vincular!"
                    : "Activa y Protegida"}
              </Text>
            </View>
            <FontAwesome6
              name={
                seccionAbierta === "tarjeta" ? "chevron-up" : "chevron-down"
              }
              size={16}
              color="#94A3B8"
            />
          </TouchableOpacity>

          {seccionAbierta === "tarjeta" && (
            <View style={styles.accordionContent}>
              {/* ESTADO 1: SIN TARJETA */}
              {estadoTarjetaFisica === "SIN_TARJETA" && (
                <>
                  <Text style={styles.accordionTextInfo}>
                    Si te quedas sin batería a veces, pide tu tarjeta de
                    plástico con chip NFC para pagar en el bus sin depender de
                    tu celular.
                  </Text>
                  <TouchableOpacity
                    style={styles.btnAccordionPrimary}
                    onPress={() =>
                      router.push("/pages/Pasajero/SolicitarTarjeta")
                    }
                  >
                    <Text style={styles.btnAccordionPrimaryText}>
                      Solicitar Tarjeta Física
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/* ESTADO 2: SOLICITADA / POR VINCULAR */}
              {estadoTarjetaFisica === "POR_VINCULAR" && (
                <>
                  <Text style={styles.accordionTextInfo}>
                    Tu solicitud fue procesada. Si ya tienes el plástico físico
                    en tus manos, vincúlalo a tu cuenta para activarlo.
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.btnAccordionPrimary,
                      {
                        backgroundColor: "#16A34A",
                        flexDirection: "row",
                        justifyContent: "center",
                      },
                    ]}
                    onPress={() =>
                      router.push("/pages/Pasajero/VincularTarjeta")
                    }
                  >
                    <FontAwesome6
                      name="wifi"
                      size={16}
                      color="white"
                      style={{
                        marginRight: 10,
                        transform: [{ rotate: "90deg" }],
                      }}
                    />
                    <Text style={styles.btnAccordionPrimaryText}>
                      Vincular Mi Tarjeta
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/* ESTADO 3: VINCULADA (LA TARJETA VIRTUAL) */}
              {estadoTarjetaFisica === "VINCULADA" && (
                <View style={{ alignItems: "center", marginTop: 5 }}>
                  {/* Diseño de la Tarjeta */}
                  <View
                    style={{
                      width: "100%",
                      height: 180,
                      backgroundColor: "#1E293B",
                      borderRadius: 20,
                      padding: 20,
                      justifyContent: "space-between",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2,
                      shadowRadius: 5,
                      elevation: 5,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: "white",
                          fontSize: 20,
                          fontWeight: "900",
                          letterSpacing: 2,
                        }}
                      >
                        SUBA
                      </Text>
                      <FontAwesome6
                        name="wifi"
                        size={24}
                        color="rgba(255,255,255,0.5)"
                        style={{ transform: [{ rotate: "90deg" }] }}
                      />
                    </View>
                    <View>
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.6)",
                          fontSize: 12,
                          textTransform: "uppercase",
                          letterSpacing: 1,
                          marginBottom: 5,
                        }}
                      >
                        ID de Tarjeta
                      </Text>
                      <Text
                        style={{
                          color: "white",
                          fontSize: 18,
                          fontWeight: "bold",
                          letterSpacing: 3,
                        }}
                      >
                        {/* Aquí iría la variable del ID */} SUB-8492-X9
                      </Text>
                    </View>
                  </View>

                  {/* Botón de Congelar */}
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 20,
                      backgroundColor: "#FEF2F2",
                      paddingVertical: 12,
                      paddingHorizontal: 20,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#FECACA",
                    }}
                    onPress={() =>
                      Alert.alert(
                        "Congelar",
                        "¿Seguro que deseas bloquear esta tarjeta? No podrá usarse para pagar.",
                      )
                    }
                  >
                    <FontAwesome6 name="snowflake" size={16} color="#DC2626" />
                    <Text
                      style={{
                        color: "#DC2626",
                        fontWeight: "bold",
                        marginLeft: 10,
                      }}
                    >
                      Congelar Plástico
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <View style={styles.divider} />

          {/* DESPLEGABLE: SUBSIDIOS */}
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => toggleSeccion("subsidio")}
            activeOpacity={0.7}
          >
            <View
              style={[styles.accordionIconLeft, { backgroundColor: "#FEF3C7" }]}
            >
              <FontAwesome6 name="graduation-cap" size={18} color="#D97706" />
            </View>
            <View style={styles.accordionTitleBox}>
              <Text style={styles.accordionTitle}>Beneficios y Subsidios</Text>
              <Text style={styles.accordionSubtitle}>
                Estudiantes y Discapacidad
              </Text>
            </View>
            <FontAwesome6
              name={
                seccionAbierta === "subsidio" ? "chevron-up" : "chevron-down"
              }
              size={16}
              color="#94A3B8"
            />
          </TouchableOpacity>

          {seccionAbierta === "subsidio" && (
            <View style={styles.accordionContent}>
              <Text style={styles.accordionTextInfo}>
                Si eres estudiante activo o posees un certificado de
                discapacidad, puedes optar por exoneraciones en el pasaje.
              </Text>
              <TouchableOpacity
                style={styles.btnAccordionSecondary}
                onPress={() => router.push("/pages/Pasajero/Subsidios")}
              >
                <Text style={styles.btnAccordionSecondaryText}>
                  Cargar Constancias
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* --- 3. HISTORIAL --- */}
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>Últimos Movimientos</Text>
            <TouchableOpacity onPress={cargarHistorial}>
              <Text style={styles.historyLink}>Actualizar</Text>
            </TouchableOpacity>
          </View>

          {cargandoHistorial ? (
            <ActivityIndicator size="small" color="#023A73" />
          ) : operaciones.length === 0 ? (
            <Text
              style={{ textAlign: "center", color: "#94A3B8", marginTop: 20 }}
            >
              No hay movimientos recientes
            </Text>
          ) : (
            operaciones.map((item) => (
              <View key={item.id} style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <View
                    style={[
                      styles.transactionIcon,
                      {
                        backgroundColor: item.esIngreso ? "#DCFCE7" : "#F1F5F9",
                      },
                    ]}
                  >
                    <FontAwesome6
                      name={item.icono}
                      size={14}
                      color={item.esIngreso ? "#16A34A" : "#475569"}
                    />
                  </View>
                  <View>
                    <Text style={styles.transactionType}>{item.tipo}</Text>
                    <Text style={styles.transactionDate}>{item.hora}</Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.transactionAmount,
                    { color: item.esIngreso ? "#16A34A" : "#0F172A" },
                  ]}
                >
                  {item.esIngreso ? "+" : "-"} Bs. {item.monto}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ========================================== */}
      {/* MODAL BOTTOM SHEET: OPCIONES DE DINERO     */}
      {/* ========================================== */}
      <Modal
        visible={modalDineroVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalDineroVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalDineroVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalDragHandle} />
            <Text style={styles.modalTitle}>Transacciones</Text>
            <Text style={styles.modalSubtitle}>
              ¿Qué deseas hacer con tu dinero?
            </Text>

            {/* Opcion 1: Recargar */}
            <TouchableOpacity
              style={styles.modalOptionBtn}
              onPress={() => {
                setModalDineroVisible(false);
                router.push("/pages/Pasajero/RecargarSaldo"); // <--- ENCHUFE NUEVO 🔌
              }}
            >
              <View
                style={[styles.modalOptionIcon, { backgroundColor: "#DCFCE7" }]}
              >
                <FontAwesome6 name="bolt" size={20} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Recargar Saldo</Text>
                <Text style={styles.modalOptionSub}>
                  Ingresar dinero vía Pago Móvil
                </Text>
              </View>
              <FontAwesome6 name="chevron-right" size={14} color="#94A3B8" />
            </TouchableOpacity>

            {/* Opcion 2: Transferir */}
            <TouchableOpacity
              style={styles.modalOptionBtn}
              onPress={() => {
                setModalDineroVisible(false);
                router.push("/pages/Pasajero/TransferirSaldo"); // <--- ENCHUFE NUEVO 🔌
              }}
            >
              <View
                style={[styles.modalOptionIcon, { backgroundColor: "#E0F2FE" }]}
              >
                <FontAwesome6 name="paper-plane" size={20} color="#0284C7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Transferir (P2P)</Text>
                <Text style={styles.modalOptionSub}>
                  Enviar saldo a otro pasajero
                </Text>
              </View>
              <FontAwesome6 name="chevron-right" size={14} color="#94A3B8" />
            </TouchableOpacity>

            {/* Opcion 3: Retirar */}
            <TouchableOpacity
              style={styles.modalOptionBtn}
              onPress={() => {
                setModalDineroVisible(false);
                router.push("/pages/Pasajero/RetirarSaldo"); // <--- ENCHUFE NUEVO 🔌
              }}
            >
              <View
                style={[styles.modalOptionIcon, { backgroundColor: "#F3E8FF" }]}
              >
                <FontAwesome6
                  name="building-columns"
                  size={20}
                  color="#9333EA"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Retirar Saldo</Text>
                <Text style={styles.modalOptionSub}>
                  Enviar dinero a tu cuenta bancaria
                </Text>
              </View>
              <FontAwesome6 name="chevron-right" size={14} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ========================================== */}
      {/* MODALES ANTIGUOS (Lógica adaptada)         */}
      {/* ========================================== */}

      {/* MODAL RECARGA */}
      <Modal animationType="slide" transparent visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {step === 1 ? "Datos de Pago" : "Reportar Pago"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={30} color="#BDC3C7" />
              </TouchableOpacity>
            </View>

            {step === 1 ? (
              <View>
                <Text style={styles.modalSubtitle}>
                  Transfiere a través de Pago Móvil:
                </Text>
                <View style={styles.dataBox}>
                  <Text style={styles.dataText}>
                    Banco:{" "}
                    <Text style={styles.boldText}>{datosBancarios.banco}</Text>
                  </Text>
                  <Text style={styles.dataText}>
                    Teléfono:{" "}
                    <Text style={styles.boldText}>
                      {datosBancarios.telefono}
                    </Text>
                  </Text>
                  <Text style={styles.dataText}>
                    CI:{" "}
                    <Text style={styles.boldText}>
                      {datosBancarios.identidad}
                    </Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.btnCopiar}
                    onPress={copiarTodo}
                  >
                    <Ionicons name="copy-outline" size={18} color="#D99015" />
                    <Text style={styles.btnCopiarText}>
                      Copiar todos los datos
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.btnPrincipal}
                  onPress={() => setStep(2)}
                >
                  <Text style={styles.btnPrincipalText}>SIGUIENTE PASO</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <TouchableOpacity
                  style={styles.imageSelector}
                  onPress={pickImage}
                >
                  {image ? (
                    <Image
                      source={{ uri: image }}
                      style={styles.previewImage}
                    />
                  ) : (
                    <View style={{ alignItems: "center" }}>
                      <Ionicons name="cloud-upload" size={40} color="#003366" />
                      <Text style={{ color: "#95a5a6", fontWeight: "bold" }}>
                        Subir Capture
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TextInput
                  placeholder="Referencia (últimos 6 dígitos)"
                  style={styles.inputPro}
                  keyboardType="numeric"
                  value={referencia}
                  onChangeText={setReferencia}
                />
                <TextInput
                  placeholder="Monto enviado (Bs.)"
                  style={styles.inputPro}
                  keyboardType="numeric"
                  value={montoInput}
                  onChangeText={setMontoInput}
                />
                <TouchableOpacity
                  style={[
                    styles.btnPrincipal,
                    { backgroundColor: cargando ? "#BDC3C7" : "#27ae60" },
                  ]}
                  onPress={registrarYValidar2}
                  disabled={cargando}
                >
                  {cargando ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.btnPrincipalText}>
                      CONFIRMAR RECARGA
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setStep(1)}
                  style={{ marginTop: 15 }}
                >
                  <Text style={{ textAlign: "center", color: "#7F8C8D" }}>
                    Atrás
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL TRANSFERENCIA */}
      <Modal animationType="slide" transparent visible={modalTransferVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enviar Dinero</Text>
              <TouchableOpacity onPress={() => setModalTransferVisible(false)}>
                <Ionicons name="close-circle" size={30} color="#BDC3C7" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Ingresa el ID del usuario</Text>

            <TextInput
              placeholder="ID del Destinatario"
              style={styles.inputPro}
              value={destinatarioID}
              onChangeText={setDestinatarioID}
              keyboardType="numeric"
            />

            {nombreDestinatario && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 15,
                  paddingLeft: 5,
                }}
              >
                <Ionicons name="person-circle" size={20} color="#27ae60" />
                <Text
                  style={{
                    color: "#27ae60",
                    fontWeight: "bold",
                    marginLeft: 5,
                  }}
                >
                  Destinatario: {nombreDestinatario}
                </Text>
              </View>
            )}

            <TextInput
              placeholder="Monto a enviar (Bs.)"
              style={styles.inputPro}
              keyboardType="numeric"
              value={montoTransferir}
              onChangeText={setMontoTransferir}
            />

            <TouchableOpacity
              style={[
                styles.btnPrincipal,
                {
                  backgroundColor:
                    !nombreDestinatario || cargando ? "#BDC3C7" : "#5D6D7E",
                },
              ]}
              onPress={ejecutarTransferenciaReal}
              disabled={!nombreDestinatario || cargando}
            >
              {cargando ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.btnPrincipalText}>TRANSFERIR AHORA</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { flex: 1, paddingHorizontal: 20 },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingBottom: 15,
    marginBottom: 5,
  },
  backButton: { padding: 5, marginLeft: -5 },
  topHeaderTitle: { fontSize: 18, fontWeight: "bold", color: "#0F172A" },
  helpButton: { padding: 5 },

  // Tarjeta Azul SUBA
  walletCard: {
    backgroundColor: "#023A73",
    borderRadius: 24,
    padding: 25,
    shadowColor: "#023A73",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
    marginBottom: 25,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  cardLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  cardBalanceBs: {
    color: "white",
    fontSize: 34,
    fontWeight: "bold",
    marginBottom: 2,
  },
  cardBalanceUsd: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 15,
    fontWeight: "600",
  },

  // Botón Amarillo SUBA
  btnActionCircle: {
    backgroundColor: "#FFA311",
    width: 65,
    height: 65,
    borderRadius: 32.5,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FFA311",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  btnActionText: {
    color: "#023A73",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 2,
  },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingTop: 15,
  },
  accountName: { color: "white", fontSize: 14, fontWeight: "600" },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 15,
  },

  // Menús Desplegables (Acordeones)
  accordionContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 5,
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 30,
  },
  accordionHeader: { flexDirection: "row", alignItems: "center", padding: 15 },
  accordionIconLeft: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  accordionTitleBox: { flex: 1 },
  accordionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 2,
  },
  accordionSubtitle: { fontSize: 13, color: "#64748B" },
  accordionContent: { paddingHorizontal: 15, paddingBottom: 20, paddingTop: 5 },
  accordionTextInfo: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
    marginBottom: 15,
  },
  btnAccordionPrimary: {
    backgroundColor: "#D97706",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  btnAccordionPrimaryText: { color: "white", fontSize: 14, fontWeight: "bold" },
  btnAccordionSecondary: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  btnAccordionSecondaryText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "bold",
  },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginHorizontal: 15 },

  // Historial
  historyContainer: { flex: 1 },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  historyLink: { fontSize: 14, color: "#0284C7", fontWeight: "600" },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  transactionLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  transactionType: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  transactionDate: { fontSize: 12, color: "#64748B" },
  transactionAmount: { fontSize: 16, fontWeight: "bold" },

  // Modal Bottom Sheet (Transacciones)
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    paddingBottom: Platform.OS === "ios" ? 40 : 25,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  modalDragHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 5,
  },
  modalSubtitle: { fontSize: 15, color: "#64748B", marginBottom: 25 },
  modalOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 2,
  },
  modalOptionSub: { fontSize: 13, color: "#64748B" },

  // Estilos de los Modales Antiguos (Reciclados)
  dataBox: {
    backgroundColor: "#FDF7ED",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FAD7A0",
  },
  dataText: { fontSize: 16, marginBottom: 10, color: "#34495E" },
  boldText: { fontWeight: "bold", color: "#003366" },
  btnCopiar: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  btnCopiarText: {
    marginLeft: 8,
    color: "#D99015",
    fontWeight: "bold",
    fontSize: 14,
  },
  btnPrincipal: {
    backgroundColor: "#003366",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 25,
    elevation: 3,
  },
  btnPrincipalText: { color: "white", fontWeight: "bold", fontSize: 16 },
  imageSelector: {
    height: 160,
    backgroundColor: "#F8F9F9",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: "#BDC3C7",
  },
  previewImage: { width: "100%", height: "100%", borderRadius: 20 },
  inputPro: {
    backgroundColor: "#F2F4F4",
    padding: 18,
    borderRadius: 15,
    marginBottom: 15,
    fontSize: 16,
    color: "#2C3E50",
  },
});
