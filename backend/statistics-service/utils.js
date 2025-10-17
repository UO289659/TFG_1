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
 * @typedef {Object} IndividualTransactionOptions
 * @property {string} name - Nombre de la transacción
 * @property {string} type - Tipo (income/expense)
 * @property {string} category - Categoría
 * @property {number} value - Valor
 * @property {string} icon - Icono
 * @property {string} clientId - ID del cliente
 */
/**
 * Función helper para transformar datos de sharedWith
 * @function transformSharedWithData
 * @param {Array<string|Object>} sharedWith - Array de usuarios compartidos
 * @returns {SharedParticipant[]} Array transformado con estructura consistente
 * @description Normaliza los datos de usuarios compartidos a una estructura consistente
 */
function transformSharedWithData(sharedWith) {
  if (!sharedWith || !Array.isArray(sharedWith)) return [];
  
  return sharedWith.map(item => {
    // Si el item ya tiene la estructura correcta
    if (typeof item === 'object' && item.userId && item.amount !== undefined) {
      return {
        userId: new mongoose.Types.ObjectId(item.userId),
        amount: item.amount
      };
    }
    
    // Si el item es solo un string (userId)
    if (typeof item === 'string') {
      return {
        userId: new mongoose.Types.ObjectId(item),
        amount: 0
      };
    }
    
    // Si el item tiene userId como string
    if (item.userId && typeof item.userId === 'string') {
      return {
        userId: new mongoose.Types.ObjectId(item.userId),
        amount: item.amount || 0
      };
    }
    
    return item;
  });
}


/**
 * @typedef {Object} SharedTransactionOptions
 * @property {string} name - Nombre de la transacción
 * @property {string} type - Tipo (income/expense)
 * @property {string} category - Categoría
 * @property {number} value - Valor total
 * @property {string} icon - Icono
 * @property {string} clientId - ID del cliente creador
 * @property {string[]} sharedWith - IDs de usuarios compartidos
 * @property {string} splitType - Tipo de división (equal/custom)
 * @property {Object} customAmounts - Montos personalizados
 */

/**
 * Función helper para crear transacciones compartidas
 * @async
 * @function createSharedTransactions
 * @param {SharedTransactionOptions} options - Opciones para crear transacciones compartidas
 * @returns {Promise<TransactionData[]>} Array de transacciones creadas
 * @description Crea múltiples transacciones para gastos compartidos entre usuarios
 */
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
  
  // Crear lista completa de todos los participantes (incluyendo al creador)
  const allParticipants = [clientId, ...sharedWith];
  
  // Calcular los montos según el tipo de división
  let amounts = {};
  
  if (splitType === 'equal') {
   const amountPerPerson = parseFloat((value / allParticipants.length).toFixed(2));
    allParticipants.forEach(userId => {
      amounts[userId] = amountPerPerson;
    });
  } else if (splitType === 'custom') {
    amounts = { ...customAmounts };
    // Asegurar que el creador tenga su monto
    if (!amounts[clientId]) {
      const sumOthers = Object.values(customAmounts).reduce((sum, amount) => sum + amount, 0);
      amounts[clientId] = value - sumOthers;
    }
  }
  
  // Crear array de sharedWith que será IGUAL para todas las transacciones
  // Contiene TODOS los participantes con sus montos
  const completeSharedWith = allParticipants.map(userId => ({
    userId,
    amount: amounts[userId] || 0
  }));
  
  // Crear una transacción para cada participante
  // TODAS tendrán la misma información en sharedWith
  for (const participantId of allParticipants) {
    const transaction = new Transaction({
      clientId: participantId,
      name,
      type,
      category,
      value: amounts[participantId] || 0, // Su parte individual
      originalValue: value,
      icon,
      sharedWith: completeSharedWith, // TODOS tienen la misma info completa
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

/**
 * @typedef {Object} IndividualTransactionOptions
 * @property {string} name - Nombre de la transacción
 * @property {string} type - Tipo (income/expense)
 * @property {string} category - Categoría
 * @property {number} value - Valor
 * @property {string} icon - Icono
 * @property {string} clientId - ID del cliente
 */

/**
 * Función helper para crear transacción individual
 * @async
 * @function createIndividualTransaction
 * @param {IndividualTransactionOptions} options - Opciones para crear transacción individual
 * @returns {Promise<TransactionData>} Transacción creada
 * @description Crea una transacción individual (no compartida)
 */
async function createIndividualTransaction({name, type, category, value, icon, clientId}) {
  const transaction = new Transaction({clientId, name, type, category, value, originalValue: value, icon, sharedWith: [],
    splitType: null, totalParticipants: 1,createdBy: new mongoose.Types.ObjectId(clientId)});

  await transaction.save();
  return transaction;
}

module.exports = {
  transformSharedWithData,
  createSharedTransactions,
  createIndividualTransaction,
};
