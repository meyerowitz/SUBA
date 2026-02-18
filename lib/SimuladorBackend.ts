// SimuladorBackend.ts

export const MOCK_BACKEND = {
  // 💡 CAMBIA ESTAS VARIABLES PARA PROBAR TODA TU APLICACIÓN

  // Nivel del usuario: 
  // false = Nivel 1 (Explorador, pide activar billetera)
  // true  = Nivel 2/3 (Billetera Activa, muestra saldo)
  perfil_completado: true, 

  // Estado del plástico: 'SIN_TARJETA' | 'APROBADA' | 'VINCULADA'
  estado_tarjeta: 'VINCULADA', 

  // Dinero de prueba
  saldo: 320.50,
  tasa_bcv: 55.20
};