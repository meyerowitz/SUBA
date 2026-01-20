import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Conectado: Sistema SUBA Operativo");
  } catch (err) {
    console.error("❌ Error de conexión:", err.message);
    process.exit(1); // Detiene la app si no hay base de datos
  }
};

export default connectDB;
