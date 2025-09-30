/**
 * @file statistics-service/category-model.js
 * @description Modelo Mongoose para categorías financieras.
 */
const mongoose = require("mongoose");

/**
 * Esquema que representa las categorías financieras.
 * Permite clasificar ingresos o gastos.
 *
 * @typedef Categoria
 * @property {String} name - Nombre de la categoría.
 * @property {"income"|"expense"} type - Tipo de categoría: ingreso o gasto.
 * @property {Date} createdAt - Fecha de creación (agregada automáticamente).
 * @property {Date} updatedAt - Fecha de última modificación (agregada automáticamente).
 */
const categoriaSchema = new mongoose.Schema({
  name: String,
  type: { type: String, enum: ["income", "expense"] },
}, {
  // Permite herencia de esquemas
  discriminatorKey: 'categoryType',
  timestamps: true
});

module.exports = mongoose.model("Categoria", categoriaSchema);