/**
 * @file statistics-service/icon-model.js
 * @description Modelo Mongoose para representar iconos mediante emojis.
 */
const mongoose = require("mongoose");

/**
 * Esquema que representa un icono.
 * Cada icono está definido por un emoji que se utiliza para asociar
 * a categorías u otras entidades dentro de la aplicación.
 *
 * @typedef Icono
 * @property {String} emoji - Emoji que representa el icono. Es obligatorio.
 */
const iconoSchema = new mongoose.Schema({
  emoji: { type: String, required: true },
});

module.exports = mongoose.model("Icono", iconoSchema);
