// models/Transaction.js
const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ["expense", "income"], required: true },
  category: { type: String, required: true },
  value: { type: Number, required: true },
  originalValue: { type: Number, required: false },
  icon: { type: String },
  createdAt: { type: Date, default: Date.now },

  // Campos para gastos compartidos
  sharedWith: [{ 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    isPaid: { type: Boolean, default: false }
  }],
  splitType: { 
    type: String, 
    enum: ['equal', 'custom', 'percentage'], 
    default: 'equal' 
  },
  totalParticipants: Number,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  groupName: String,
  
  // NUEVO CAMPO: Para agrupar transacciones compartidas
  sharedTransactionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    default: null 
  },
  // Flag para identificar si es una transacción compartida
  isShared: { 
    type: Boolean, 
    default: false 
  }
});


module.exports = mongoose.model("Transaction", expenseSchema);