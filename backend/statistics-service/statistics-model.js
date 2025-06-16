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

   // Nuevos campos para gastos compartidos
 
  sharedWith: [{ 
    userId: mongoose.Schema.Types.ObjectId,
    amount: Number, // Cantidad que debe esta persona
    isPaid: { type: Boolean, default: false }
  }],
  splitType: { 
    type: String, 
    enum: ['equal', 'custom', 'percentage'], 
    default: 'equal' 
  },
  totalParticipants: Number,
  createdBy: mongoose.Schema.Types.ObjectId, // Quien creó el gasto compartido
  groupName: String // Opcional: nombre del grupo de gasto

});

module.exports = mongoose.model("Transaction", expenseSchema);
