# 🛠️ BITÁCORA DE CAMBIOS TÉCNICOS (Refactorización v2.0 - Febrero 2026)

Este documento detalla las modificaciones arquitectónicas y correcciones implementadas para centralizar la lógica en el Backend y mejorar la experiencia de usuario.

## 1. 🗺️ Arquitectura de Mapas y Geolocalización (Backend Driven)

Se eliminó la dependencia de servicios externos directos (Overpass) y archivos estáticos (`json`) en el frontend. Ahora la aplicación es **data-driven** controlada por el Backend (`subapp-api`).

### A. Gestión de Paradas
*   **Antes:** Consulta directa a la API pública de Overpass (OpenStreetMap) desde el dispositivo móvil. Lento y dependiente de terceros.
*   **Ahora:** Consumo del endpoint propio `GET /api/paradas/activas`.
*   **Implementación:**
    *   Se actualizó `WebMap.js` (Pasajero y Conductor) y `UnifiedHome.js`.
    *   Se implementó caché local (`AsyncStorage`) con la clave `guayana_bus_stops_cache_v2` para funcionamiento offline temporal.
    *   Inyección optimizada de datos JSON al WebView mediante `injectJavaScript`.

### B. Gestión de Rutas y Destinos
*   **Antes:** Lista estática hardcodeada en `Components/Destinos.json`. Requeria recompilar la app para añadir rutas.
*   **Ahora:** Consumo dinámico del endpoint `GET /api/rutas/activas`.
*   **Implementación:**
    *   Se eliminó la importación de `Destinos.json`.
    *   El componente `Picker` (selector) ahora se puebla con datos vivos de la base de datos MongoDB.
    *   **Beneficio:** Las rutas creadas o desactivadas en el Panel Administrativo se reflejan instantáneamente en la App Móvil.

### C. Visualización de Trayectorias (Geometría)
*   **Antes:** La App calculaba la ruta en el cliente usando OSRM (a veces impreciso si el GPS fallaba o la API de OSRM demoraba).
*   **Ahora:** Renderizado de **GeoJSON** pre-calculado.
*   **Implementación:**
    *   **Backend:** Envía el objeto `geometry` (coordenadas exactas del trazado) dentro de la respuesta de `/api/rutas/activas`.
    *   **Frontend (`map.html`):** Nueva función JS `drawRouteFromGeoJSON(geometry)`.
    *   **Estilo:** Se dibuja la ruta con estilo "Neón" (Cyan brillante) y se hace auto-zoom (`flyToBounds`) para enfocar el trayecto completo.

---

## 2. 👤 Perfil de Usuario y Almacenamiento

### A. Foto de Perfil
*   **Integración:** Implementada subida de imágenes a **Supabase Storage**.
*   **Flujo:**
    1.  Frontend selecciona imagen (`expo-image-picker`).
    2.  Envío a Backend (`POST /auth/profile-picture` como `multipart/form-data`).
    3.  Backend sube a Supabase y guarda la URL pública en MongoDB.
    4.  App actualiza la sesión local en `AsyncStorage` para persistencia inmediata.

### B. Sesión
*   Se corrigieron los errores de persistencia de sesión donde la foto o el token desaparecían al navegar.
*   Se unificó la lectura de sesión bajo la clave `@Sesion_usuario`.

---

## 3. 🔧 Correcciones de Código y Estabilidad

*   **Sintaxis JS/TS:** Se eliminaron las anotaciones de tipo TypeScript (`: string`, `interface`, etc.) dentro de archivos `.js` que causaban `SyntaxError` en el entorno de ejecución de Expo/Metro.
*   **Importaciones:** Se corrigieron referencias rotas a `@react-native-async-storage/async-storage`.
*   **Entorno:** Cambio de URLs de desarrollo local (`localhost`/`10.0.2.2`) a Producción (`https://subapp-api.onrender.com`).

---
---

<div align="left">
  <img src="logotipo.png" alt="Logotipo SUBA" width="350" />
  <hr style="border: 1px solid #ccc; margin: 20px 0;" />
  <p style="color: #666;">Repositorio Oficial</p>
 </div>


[![maintainability](https://img.shields.io/badge/maintainability-A-00C400)]()
[![CodeQL](https://img.shields.io/badge/CodeQL-passing-30A900?logo=github&logoColor=white)]()
[![tests](https://img.shields.io/badge/tests-2000+-00C400)]()
[![release](https://img.shields.io/badge/release-v2.0.1-555555)]()
[![release date](https://img.shields.io/badge/release_date-last%20monday-00C400)]()
[![last commit](https://img.shields.io/badge/last%20commit-last%20monday-00C400)]()

[![getting started](https://img.shields.io/badge/getting%20started-guide-0078D4)]()
[![non commercial](https://img.shields.io/badge/free%20for-non%20commercial%20use-00C400)]()
# MANUAL DE RAMIFICACIÓN Y FLUJO DE TRABAJO (GITFLOW ADAPTADO) 

Este manual establece la convención de nombres y el flujo de trabajo (workflow) para asegurar la claridad, estabilidad del código y la responsabilidad individual en el proyecto, enfocado a la metodologia feature/branching.

---

## 1. REGLAS FUNDAMENTALES DE RAMIFICACIÓN

### A. Rama Permanente (Estabilidad)

| Rama | Propósito | Regla de Oro |
| :--- | :--- | :--- |
| **`main`** | Contiene el código **más estable y funcionando**. Es el código listo para la entrega final. | **NUNCA** se hace un commit directo. Todo debe ser fusionado a través de un **Pull Request (PR) aprobado**. |

### B. Ramas de Trabajo (Desarrollo y Tareas)

* **Propósito:** Contener el desarrollo de una característica, módulo o corrección de error.
* **Vida Útil:** Son temporales y deben ser eliminadas inmediatamente después de su fusión en `main`.

---

## 2. CONVENCIÓN DE NOMBRES (Responsabilidad Individual)

Para vincular la tarea con el responsable, utilizaremos esta estructura **obligatoria**:

### `feature/<iniciales-del-compañero>/<descripcion-corta-de-la-tarea>`

| Componente | Ejemplo | Descripción |
| :--- | :--- | :--- |
| **Prefijo** | `feature/` | Indica que es una rama de desarrollo. |
| **Identificador** | `JC/` (Iniciales) | **Identificador de Responsabilidad:** Obligatorio para rastrear la actividad individual (ej. **J**uan **C**arlos). |
| **Descripción** | `crud-usuarios` | Nombre descriptivo de la tarea ( usar guiones). |
| **Ejemplo Final** | `feature/JC/login-google` | **RAMA VÁLIDA** |

---

## 3. FLUJO DE TRABAJO EN 5 PASOS (Workflow) ⚙️

Todo el trabajo debe seguir el siguiente ciclo:

### 🟢 Paso 1: Crear y Publicar la Rama

Siempre crea tu rama de tarea desde el punto más estable (`main`).

```bash
# 1. Sincroniza la rama base
git checkout main
git pull origin main

# 2. Crea y cambia a tu rama de trabajo
git checkout -b feature/TU-INICIALES/TU-TAREA
```