const mongoose = require('mongoose');

const CategoriaUsuarioSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
});

module.exports = mongoose.model('CategoriaUsuario', CategoriaUsuarioSchema);
