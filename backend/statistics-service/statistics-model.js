/**
 * @file statistics-service/statistics-model.js
 * @description Modelo Mongoose para transacciones financieras (ingresos y gastos),
 * incluyendo soporte para gastos compartidos entre varios usuarios.
 */
const mongoose = require("mongoose");

/**
 * Esquema que representa una transacción financiera.
 * Cada transacción puede ser un gasto o un ingreso y puede estar asociada
 * a una categoría, tener un valor original y estar compartida entre varios usuarios.
 *
 * @typedef Transaction
 * @property {String} clientId - Identificador del cliente que creó la transacción. (Requerido)
 * @property {String} name - Nombre o descripción de la transacción. (Requerido)
 * @property {"expense"|"income"} type - Tipo de transacción: gasto o ingreso. (Requerido)
 * @property {ObjectId} category - Referencia al modelo `Categoria` que clasifica la transacción. (Requerido)
 * @property {Number} value - Valor actual de la transacción. (Requerido)
 * @property {Number} [originalValue] - Valor original antes de ajustes o divisiones. (Opcional)
 * @property {String} [icon] - Icono asociado a la transacción (por ejemplo, un emoji).
 * @property {Date} createdAt - Fecha de creación de la transacción. (Por defecto: fecha actual)
 * @property {Array.<SharedWith>} [sharedWith] - Lista de usuarios con los que se comparte el gasto.
 * @property {"equal"|"custom"} splitType - Método de división del gasto: igualitario o personalizado. (Por defecto: `equal`)
 * @property {Number} [totalParticipants] - Número total de participantes en el gasto compartido.
 * @property {ObjectId} [createdBy] - Usuario que creó la transacción.
 * @property {Boolean} isShared - Indica si la transacción es compartida. (Por defecto: `false`)
 */
const expenseSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ["expense", "income"], required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Categoria', required: true },
  value: { type: Number, required: true },
  originalValue: { type: Number, required: false },
  icon: { type: String },
  createdAt: { type: Date, default: Date.now },

  // Campos para gastos compartidos
  sharedWith: [{ 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: Number
  }],
  splitType: { 
    type: String, 
    enum: ['equal', 'custom'], 
    default: 'equal' 
  },
  totalParticipants: Number,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Flag para identificar si es una transacción compartida
  isShared: { 
    type: Boolean, 
    default: false 
  }
});

expenseSchema.pre(['find', 'findOne', 'findOneAndUpdate'], function() {
  this.populate('category');
});

module.exports = mongoose.model("Transaction", expenseSchema);