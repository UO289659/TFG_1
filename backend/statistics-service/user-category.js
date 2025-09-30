/**
 * @file statistics-service/user-category.js
 * @description Modelo Mongoose que extiende el modelo base `Categoria`
 * para representar categorías personalizadas creadas por los usuarios.
 */
const mongoose = require('mongoose');
const Categoria = require('./category-model');

/**
 * Esquema que representa una categoría personalizada creada por un usuario.
 * Extiende el esquema base de `Categoria` usando discriminadores de Mongoose.
 *
 * @typedef CategoriaUsuario
 * @property {ObjectId} userId - Referencia al usuario propietario de la categoría. (Requerido)
 * @property {String} name - Nombre de la categoría definida por el usuario. (Requerido)
 * @property {"income"|"expense"} type - Tipo de la categoría: ingreso o gasto. (Requerido)
 * @property {Boolean} deleted - Indica si la categoría está eliminada lógicamente. (Por defecto: `false`)
 * @property {Date} [deletedAt] - Fecha en la que la categoría fue marcada como eliminada.
 */
const CategoriaUsuarioSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
});

const CategoriaUsuario = Categoria.discriminator('CategoriaUsuario', CategoriaUsuarioSchema);
module.exports = CategoriaUsuario;
