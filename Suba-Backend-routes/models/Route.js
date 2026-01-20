import mongoose from 'mongoose';

// Primero definimos la estructura de los puntos GPS para que el array sea válido
const puntoGPSSchema = new mongoose.Schema({
  parada: String,
  lat: Number,
  lng: Number
}, { _id: false }); // _id: false evita que cada punto del array tenga un ID interno innecesario

const routeSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true
  },
  codigo: {
    type: String,
    required: true
  },
  linea: {
    type: String,
    required: true
  },
  tarifa_base: {
    type: Number,
    required: true
  },
  puntos_gps: [puntoGPSSchema], // Aquí se define el Array(3) que mencionaste
  descripcion: {
    type: String
  }
}, { 
  versionKey: false // Evita que aparezca el campo __v en tus documentos
});

// IMPORTANTE: El tercer parámetro 'routes' debe ser el nombre exacto 
// de la colección que tienes en MongoDB Atlas.
const Route = mongoose.model('Route', routeSchema, 'routes');

export default Route;