# 📚 MANUAL DE RAMIFICACIÓN Y FLUJO DE TRABAJO (GITFLOW ADAPTADO) 🌳

Este manual establece la convención de nombres y el flujo de trabajo (workflow) para asegurar la claridad, estabilidad del código y la responsabilidad individual en el proyecto.

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
| **Descripción** | `crud-usuarios` | Nombre descriptivo de la tarea (usar guiones). |
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
