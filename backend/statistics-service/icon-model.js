const mongoose = require("mongoose");

const iconoSchema = new mongoose.Schema({
  emoji: { type: String, required: true },
});

module.exports = mongoose.model("Icono", iconoSchema);
