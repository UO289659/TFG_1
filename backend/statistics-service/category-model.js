const mongoose = require("mongoose");

const categoriaSchema = new mongoose.Schema({
  name: String,
  type: { type: String, enum: ["income", "expense"] },
});
module.exports = mongoose.model("Categoria", categoriaSchema);