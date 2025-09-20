// seedCategorias.js
require("dotenv").config();
const mongoose = require("mongoose");
const Categoria = require("./category-model")


const categoriasIniciales = [
  { name: "Comida", type: "expense", categoryType:"DefaultCategory" },
  { name: "Ropa", type: "expense", categoryType:"DefaultCategory" },
  { name: "Hogar", type: "expense", categoryType:"DefaultCategory" },
  { name: "Transporte", type: "expense", categoryType:"DefaultCategory" },
  { name: "Salud", type: "expense" , categoryType:"DefaultCategory"},
  { name: "Regalo", type: "expense" },
  { name: "Ocio", type: "expense" , categoryType:"DefaultCategory"},
  { name: "Ahorro", type: "income" , categoryType:"DefaultCategory"},
  { name: "Salario", type: "income", categoryType:"DefaultCategory" },
  { name: "Bonos", type: "income", categoryType:"DefaultCategory" },
  { name: "Otros ingresos", type: "income", categoryType:"DefaultCategory" },
];


//const iconOptions = ["💸", "🍔", "🚗", "🏠", "💼", "🎁", "🎉", "📦",  "👚", "🏥", "💰", "🎓"];

module.exports = async function seedCategorias() {
  try {
    const existentes = await Categoria.find({categoryType: "DefaultCategory"});
    if (existentes.length < categoriasIniciales.length) {
      for (const cat of categoriasIniciales) {
      await Categoria.updateOne(
         { name: cat.name }, // criterio de búsqueda
        { 
          $setOnInsert: cat,  // solo si se inserta nuevo documento
          $set: { categoryType: cat.categoryType } // siempre actualiza categoryType
        },
        { upsert: true }
      );
    }
    console.log("✅ Categorías insertadas o actualizadas correctamente");
    } else {
      console.log("🔁 Categorías ya existen, no se duplican");
    }
  } catch (err) {
    console.error("❌ Error al insertar categorías:", err);
  }
};