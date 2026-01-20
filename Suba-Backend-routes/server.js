import express from "express";
import connectDB from "./index.js";
import Route from "./models/Route.js"; // El esquema que creamos antes
import cors from "cors"; // Instálalo con: npm install cors

const app = express();

// Middlewares
app.use(cors()); // Permite que tu HTML acceda a la API
app.use(express.json());

// Conectar a la base de datos
connectDB();

// --- ENDPOINT PARA EL MAPA ---
app.get("/api/rutas", async (req, res) => {
  try {
    const rutas = await Route.find();
    res.json(rutas);
    console.log(rutas);
  } catch (error) {
    console.error("Error en GET /api/rutas:", error);
    res.status(500).json({ error: "Error al obtener rutas" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor SUBA corriendo en http://localhost:${PORT}`);
});
