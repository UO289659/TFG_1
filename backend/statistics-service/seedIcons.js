const Icono = require("./icon-model");

const iconosIniciales = [
  { emoji: "💸" }, { emoji: "🍔" }, { emoji: "🚗" },
  { emoji: "🏠" }, { emoji: "💼" }, { emoji: "🎁" },
  { emoji: "🎉" }, { emoji: "📦" }, { emoji: "👚" },
  { emoji: "🏥" }, { emoji: "💰" }, { emoji: "🎓" },
];

module.exports = async function seedIconos() {
  const existentes = await Icono.find();
  if (existentes.length === 0) {
    await Icono.insertMany(iconosIniciales);
    console.log("✅ Iconos iniciales insertados");
  }
};
