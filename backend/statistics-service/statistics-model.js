// models/Transaction.js
const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  clientId: { type: String, required: true },  // o ObjectId si tienes usuarios en otra colección
  name: { type: String, required: true },
  type: { type: String, enum: ["expense", "income"], required: true },
  category: { type: String, required: true },
  value: { type: Number, required: true },
  icon: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Transaction", expenseSchema);
