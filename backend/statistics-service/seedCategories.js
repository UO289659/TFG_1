// seedCategorias.js
require("dotenv").config();
const mongoose = require("mongoose");
const Categoria = require("./category-model")


const categoriasIniciales = [
  { name: "Comida", type: "expense" },
  { name: "Ropa", type: "expense" },
  { name: "Hogar", type: "expense" },
  { name: "Transporte", type: "expense" },
  { name: "Salud", type: "expense" },
  { name: "Regalo", type: "expense" },
  { name: "Ocio", type: "expense" },
  { name: "Ahorro", type: "income" },
  { name: "Salario", type: "income" },
  { name: "Bonos", type: "income" },
  { name: "Otros ingresos", type: "income" },
];

const iconOptions = ["💸", "🍔", "🚗", "🏠", "💼", "🎁", "🎉", "📦",  "👚", "🏥", "💰", "🎓"];

module.exports = async function seedCategorias() {
  try {
    const existentes = await Categoria.find();
    if (existentes.length === 0) {
      await Categoria.insertMany(categoriasIniciales);
      console.log("✅ Categorías insertadas correctamente");
    } else {
      console.log("🔁 Categorías ya existen, no se duplican");
    }
  } catch (err) {
    console.error("❌ Error al insertar categorías:", err);
  }
};