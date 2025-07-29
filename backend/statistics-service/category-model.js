const mongoose = require("mongoose");

const categoriaSchema = new mongoose.Schema({
  name: String,
  type: { type: String, enum: ["income", "expense"] },
}, {
  // Permite herencia de esquemas
  discriminatorKey: 'categoryType',
  timestamps: true
});

module.exports = mongoose.model("Categoria", categoriaSchema);