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
       // Verificar si YA EXISTE esta DefaultCategory específica
        const defaultExiste = await Categoria.findOne({ 
          name: cat.name, 
          categoryType: "DefaultCategory" 
        });
        
        if (!defaultExiste) {
          // Crear directamente la categoría DefaultCategory
          try {
            const nuevaDefault = await Categoria.create(cat);
            console.log(`✅ DefaultCategory '${cat.name}' creada con ID: ${nuevaDefault._id}`);
          } catch (createError) {
            console.error(`❌ Error creando DefaultCategory '${cat.name}':`, createError.message);
          }
        } else {
          console.log(`🔁 DefaultCategory '${cat.name}' ya existe`);
        }
      }
      console.log("✅ Proceso de seed DefaultCategories completado");
    } else {
      console.log("🔁 Todas las DefaultCategories ya existen, no se necesita seed");
    }
  } catch (err) {
    console.error("❌ Error general al insertar categorías:", err);
  }
};