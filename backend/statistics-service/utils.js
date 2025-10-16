/**
 * @fileoverview Funciones auxiliares para Statistics Service
 * @description Módulo con utilidades compartidas: validación, tokens y helpers de transacciones compartidas
 * @version 1.0.0
 * @author Carmen Espinosa Martínez
 */

const mongoose = require('mongoose');
const Transaction = require('./statistics-model');
const Categoria = require('./category-model');

/**
 * Valida que los campos requeridos estén presentes en el cuerpo de la solicitud
 * @function validateRequiredFields
 * @param {Object} req - Objeto de solicitud de Express
 * @param {string[]} requiredFields - Array de nombres de campos requeridos
 * @throws {Error} Si falta algún campo requerido
 * @example
 * validateRequiredFields(req, ['email', 'password']);
 */
function validateRequiredFields(req, requiredFields) {
  for (const field of requiredFields) {
    if (!(field in req.body)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  console.log("cumple required fields");
}

function transformSharedWithData(sharedWith) {
  if (!sharedWith || !Array.isArray(sharedWith)) return [];
  return sharedWith.map(item => {
    if (typeof item === 'object' && item.userId && item.amount !== undefined) {
      return { userId: new mongoose.Types.ObjectId(item.userId), amount: item.amount };
    }
    if (typeof item === 'string') {
      return { userId: new mongoose.Types.ObjectId(item), amount: 0 };
    }
    if (item.userId && typeof item.userId === 'string') {
      return { userId: new mongoose.Types.ObjectId(item.userId), amount: item.amount || 0 };
    }
    return item;
  });
}

async function createSharedTransactions({
  name,
  type,
  category,
  value,
  icon,
  clientId,
  sharedWith,
  splitType,
  customAmounts
}) {
  const transactions = [];
  const allParticipants = [clientId, ...sharedWith];
  let amounts = {};
  if (splitType === 'equal') {
    const amountPerPerson = parseFloat((value / allParticipants.length).toFixed(2));
    allParticipants.forEach(userId => { amounts[userId] = amountPerPerson; });
  } else if (splitType === 'custom') {
    amounts = { ...customAmounts };
    if (!amounts[clientId]) {
      const sumOthers = Object.values(customAmounts).reduce((sum, amount) => sum + amount, 0);
      amounts[clientId] = value - sumOthers;
    }
  }
  const completeSharedWith = allParticipants.map(userId => ({ userId, amount: amounts[userId] || 0 }));
  for (const participantId of allParticipants) {
    const transaction = new Transaction({
      clientId: participantId,
      name,
      type,
      category,
      value: amounts[participantId] || 0,
      originalValue: value,
      icon,
      sharedWith: completeSharedWith,
      splitType,
      totalParticipants: allParticipants.length,
      createdBy: new mongoose.Types.ObjectId(clientId),
      isShared: true
    });
    const savedTransaction = await transaction.save();
    transactions.push(savedTransaction);
  }
  return transactions;
}

async function createIndividualTransaction({ name, type, category, value, icon, clientId }) {
  const transaction = new Transaction({ clientId, name, type, category, value, icon, isShared: false });
  const saved = await transaction.save();
  return saved;
}

module.exports = {
  validateRequiredFields,
  transformSharedWithData,
  createSharedTransactions,
  createIndividualTransaction,
};
