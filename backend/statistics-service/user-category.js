const mongoose = require('mongoose');
const Categoria = require('./category-model');

const CategoriaUsuarioSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
});

const CategoriaUsuario = Categoria.discriminator('CategoriaUsuario', CategoriaUsuarioSchema);
module.exports = CategoriaUsuario;
