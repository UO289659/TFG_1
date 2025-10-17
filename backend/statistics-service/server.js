/**
 * @fileoverview Statistics Service - Servicio de estadísticas y transacciones
 * @description Microservicio que maneja transacciones financieras, categorías, 
 * gastos compartidos y exportación de datos
 * @author Carmen Espinosa Martínez
 * @version 1.0.0
 */

const express = require("express"); 
const cors = require("cors");
const mongoose = require('mongoose');
require('dotenv').config();
const {authMiddleware, ensurePremium} = require("./auth-middleware/index");
const dayjs = require('dayjs');
const seedCategorias = require("./seedCategories");
const seedIconos= require("./seedIcons");
const app = express();
const Transaction = require("./statistics-model")
const Categoria = require("./category-model")
const UserCategory=require("./user-category");
const Icono = require("./icon-model");
const axios = require('axios');


//const User = require("../user-service/user-model");
app.use(cors());
app.use(express.json());
const { transformSharedWithData, createSharedTransactions, createIndividualTransaction } = require('./utils');

const localizedFormat = require('dayjs/plugin/localizedFormat');
const es = require('dayjs/locale/es'); // Importa el idioma español

dayjs.extend(localizedFormat);
dayjs.locale('es');


mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log("✅ [Stats Service] Conectado a MongoDB");
    await seedCategorias();
    await seedIconos();
    console.log("🌱 Categorías iniciales cargadas");

    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => {
      console.log(`🚀 Stats Service corriendo en puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Error al conectar a MongoDB:", err);
  });

  
/**
 * @typedef {Object} DateRangeQuery
 * @property {string} start - Fecha de inicio (ISO string)
 * @property {string} end - Fecha de fin (ISO string)
 */

/**
 * Obtener gastos por rango de fechas
 * @route GET /gastos/rango
 * @middleware authMiddleware
 * @param {express.Request<{}, TransactionData[], {}, DateRangeQuery>} req - Request con parámetros de fecha
 * @param {express.Response<TransactionData[]>} res - Response con transacciones
 * @returns {Promise<void>}
 * @description Obtiene todas las transacciones del usuario en un rango de fechas específico
 */
  app.get('/gastos/rango', authMiddleware, async (req, res) => {
  const { start, end } = req.query;
  const clientId = req.user.id;
  //console.log("startDate:", start);
  //console.log("endDate:", end);

  if (!start || !end) {
    return res.status(400).json({ error: "Se requieren fechas de inicio y fin" });
  }

  if(end<start){
    return res.status(400).json({ error: "La fecha de fin debe ser posterior a la de inicio" });
  }

  try {
    const gastos = await Transaction.find({
      clientId,
      createdAt: {
        $gte: new Date(start),
        $lte: new Date(end),
      },
    }).sort({ createdAt: 1 });

    res.json(gastos);
  } catch (error) {
    console.error("Error al obtener datos por rango:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

/**
 * @typedef {Object} PeriodParams
 * @property {string} period - Período de tiempo (day/week/month/year)
 */

/**
 * Obtener gastos por período
 * @route GET /gastos/:period
 * @middleware authMiddleware
 * @param {express.Request<PeriodParams, TransactionData[], {}>} req - Request con período
 * @param {express.Response<TransactionData[]>} res - Response con transacciones
 * @returns {Promise<void>}
 * @description Obtiene transacciones del usuario para un período específico
 */
app.get("/gastos/:period", authMiddleware, async (req, res) => {
  try {
    const { period } = req.params;
   // console.log("Periodo escogido:"+period);
    const gastos = await Transaction.find({ 
      clientId: req.user.id,   
      $expr: {
        $eq: [
          { $dateTrunc: { date: "$createdAt", unit: period } }, // truncar createdAt al periodo solicitado (day, week, month, year)
          { $dateTrunc: { date: new Date(), unit: period } },   // truncar fecha actual igual al periodo
        ]
      }
 }).exec();
 if(gastos==null){
  res.status(404).json({ error: "Todavía no hay datos" });
 }
 //const resultadoAgrupado = agruparPorCategoria(gastos);
 res.json(gastos);
  } catch (error) {
    res.status(500).json({ error: "Error del servidor" });
  }
});

/**
 * @typedef {Object} UpdateResult
 * @property {TransactionData} [transaction] - Transacción actualizada
 * @property {boolean} [isConverted] - Si se convirtió a compartida
 * @property {string} [message] - Mensaje de resultado
 * @property {TransactionData[]} [transactions] - Múltiples transacciones (si se convirtió)
 * @property {string} [originalClientId] - ID del cliente original
 * @property {string} [deletedTransactionId] - ID de transacción eliminada
 */

/**
 * Función helper para actualizar transacciones (individuales o compartidas)
 * @async
 * @function updateTransaction
 * @param {string} transactionId - ID de la transacción a actualizar
 * @param {Partial<TransactionData>} updateData - Datos a actualizar
 * @param {string} userId - ID del usuario que realiza la actualización
 * @returns {Promise<UpdateResult>} Resultado de la actualización
 * @description Actualiza una transacción existente, manejando conversiones entre individual y compartida
 * @throws {Error} Si la transacción no se encuentra o el usuario no tiene permisos
 */
async function updateTransaction(transactionId, updateData, userId) {
  try {
    // Obtener la transacción original
    const originalTransaction = await Transaction.findById(transactionId);
    if (!originalTransaction) {
      throw new Error('Transacción no encontrada');
    }

    if(originalTransaction.createdBy.toString() !== userId) {
        throw new Error('Acceso denegado: no eres el creador de esta transacción');
    }

    // Limpiar y preparar datos - solo campos permitidos
    const allowedFields = ['name', 'type', 'category', 'value', 'icon', 'sharedWith', 'splitType', 'customAmounts', 'totalParticipants', 'createdBy', 'originalValue'];
    const preparedData = {};
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        preparedData[field] = updateData[field];
      }
    }

     if (preparedData.category) {
      const categoryExists = await Categoria.findOne({
      name: { $regex: new RegExp(`^${preparedData.category}$`, 'i') }
    });
    if(categoryExists) {
      preparedData.category = categoryExists._id;
    }
  }

    // Transformar createdBy si está presente
    if (preparedData.createdBy && typeof preparedData.createdBy === 'string') {
      preparedData.createdBy = new mongoose.Types.ObjectId(preparedData.createdBy);
    }

    // Caso especial: convertir transacción individual en compartida
    if (preparedData.sharedWith && Array.isArray(preparedData.sharedWith) && preparedData.sharedWith.length > 0) {
      // La transacción original no estaba compartida
      const wasIndividual = !originalTransaction.sharedWith || originalTransaction.sharedWith.length === 0;
      
      if (wasIndividual) {
        console.log("Convirtiendo transacción individual en compartida");
        
        // Filtrar IDs válidos (eliminar strings vacíos y valores nulos)
        const friendIds = preparedData.sharedWith.filter(id => {
          if (typeof id === 'string') {
            return id.trim() !== '';
          }
          return id !== null && id !== undefined;
        });

        if (friendIds.length > 0) {
          // Crear transacciones compartidas usando la lógica existente
          const transactions = await createSharedTransactions({
            name: preparedData.name || originalTransaction.name,
            type: preparedData.type || originalTransaction.type,
            category: preparedData.category || originalTransaction.category,
            value: preparedData.value || originalTransaction.value,
            icon: preparedData.icon || originalTransaction.icon,
            clientId: originalTransaction.clientId.toString(),
            sharedWith: friendIds,
            splitType: preparedData.splitType || 'equal',
            customAmounts: preparedData.customAmounts || {}
          });

          // Eliminar la transacción original ya que ahora tenemos múltiples transacciones
          await Transaction.findByIdAndDelete(transactionId);

          return { 
            message: "Transacción convertida a compartida",
            transactions,
            isConverted: true,
            originalClientId: originalTransaction.clientId.toString(),
            deletedTransactionId: transactionId
          };
        }
      } else {
        // La transacción ya estaba compartida, solo actualizar
        console.log("Actualizando transacción compartida existente");

        // SINCRONIZAR TODAS LAS TRANSACCIONES DEL GRUPO
        if (originalTransaction.createdBy) {
          const createdBy = originalTransaction.createdBy;
          const originalClientId = originalTransaction.clientId.toString();
          
          console.log("Sincronizando grupo con createdBy:", createdBy);
          
          // 1️⃣ Buscar TODAS las transacciones del grupo (mismo createdBy + mismo nombre)
          const groupTransactions = await Transaction.find({ 
            createdBy,
            name: originalTransaction.name
          });

          console.log("Transacciones del grupo encontradas:", groupTransactions.length);

          // 2️⃣ Obtener IDs de los participantes actuales (incluyendo al creador)
          const currentParticipantIds = [];
          
          // Agregar IDs de sharedWith
          if (preparedData.sharedWith && Array.isArray(preparedData.sharedWith)) {
            preparedData.sharedWith.forEach(item => {
              if (typeof item === 'object' && item.userId) {
                currentParticipantIds.push(item.userId.toString());
              } else if (typeof item === 'string') {
                currentParticipantIds.push(item);
              }
            });
          }
          
          // Agregar el creador (owner)
          const creatorId = originalTransaction.createdBy.toString();
          if (!currentParticipantIds.includes(creatorId)) {
            currentParticipantIds.push(creatorId);
          }

          console.log("Participantes actuales:", currentParticipantIds);

          // 3️⃣ Procesar cada transacción del grupo
          const updatedTransactions = [];
          let transactionToReturn = null;

          for (const tx of groupTransactions) {
            const txUserId = tx.clientId.toString();
            const isStillParticipant = currentParticipantIds.includes(txUserId);

            if (!isStillParticipant) {
              // Este usuario fue removido => borrar su transacción
              console.log("Eliminando transacción de usuario removido:", txUserId);
              await Transaction.findByIdAndDelete(tx._id);
            } else {
              // El usuario sigue participando => actualizar su transacción
              console.log("Actualizando transacción de usuario:", txUserId);
              
              // 🔧 SOLUCIÓN: Preservar correctamente sharedWith según el tipo de división
              let updatedSharedWith;
              
              if (preparedData.splitType === 'custom' && preparedData.customAmounts) {
                // Para división personalizada: mantener información completa de montos
                updatedSharedWith = currentParticipantIds
                  .filter(participantId => participantId !== txUserId) // Excluir al propio usuario
                  .map(participantId => {
                    // Buscar si este participante ya estaba en sharedWith original
                    const existingShare = tx.sharedWith?.find(share => 
                      share.userId?.toString() === participantId
                    );
                    
                    return {
                      userId: new mongoose.Types.ObjectId(participantId),
                      amount: preparedData.customAmounts[participantId] || 0
                    };
                  });
              } else {
                // Para división equitativa: usar la lógica original
                updatedSharedWith = preparedData.sharedWith
                  .filter(item => {
                    const itemUserId = typeof item === 'object' ? item.userId.toString() : item.toString();
                    return itemUserId !== txUserId;
                  })
                  .map(item => {
                    if (typeof item === 'object' && item.userId) {
                      return {
                        userId: new mongoose.Types.ObjectId(item.userId),
                        amount: item.amount || 0
                      };
                    } else if (typeof item === 'string') {
                      return {
                        userId: new mongoose.Types.ObjectId(item),
                        amount: 0
                      };
                    }
                    return item;
                  });
              }

              // Actualizar los campos de la transacción
              const updateFields = {
                name: preparedData.name || tx.name,
                category: preparedData.category || tx.category,
                icon: preparedData.icon || tx.icon,
                sharedWith: updatedSharedWith,
                totalParticipants: currentParticipantIds.length,
                splitType: preparedData.splitType || tx.splitType,
                isShared: true
              };

              // 🔧 SOLUCIÓN: Calcular correctamente el valor según el tipo de división
              if (preparedData.value !== undefined) {
                if (preparedData.splitType === 'custom' && preparedData.customAmounts) {
                  // Para división personalizada: usar el monto específico del usuario
                  updateFields.value = preparedData.customAmounts[txUserId] || 0;
                  updateFields.originalValue = preparedData.value; // Mantener el valor total original
                } else {
                  // Para división equitativa: dividir por igual
                  updateFields.value = parseFloat((preparedData.value / currentParticipantIds.length).toFixed(2));
                  updateFields.originalValue = preparedData.value;
                }
              }

              // 🔧 SOLUCIÓN: Preservar customAmounts si es división personalizada
              if (preparedData.splitType === 'custom' && preparedData.customAmounts) {
                updateFields.customAmounts = preparedData.customAmounts;
              }

              const updatedTx = await Transaction.findByIdAndUpdate(tx._id, updateFields, { new: true });
              updatedTransactions.push(updatedTx);
              
              // Si esta es la transacción que se está actualizando, guardarla para retornar
              if (tx._id.toString() === transactionId) {
                transactionToReturn = updatedTx;
              }
            }
          }

          // 4️⃣ Si se agregaron nuevos participantes, crear sus transacciones
          const existingUserIds = groupTransactions.map(tx => tx.clientId.toString());
          const newParticipants = currentParticipantIds.filter(id => !existingUserIds.includes(id));

          if (newParticipants.length > 0) {
            console.log("Creando transacciones para nuevos participantes:", newParticipants);
            
            for (const newUserId of newParticipants) {
              let newValue;
              let newSharedWith;
              
              if (preparedData.splitType === 'custom' && preparedData.customAmounts) {
                // División personalizada
                newValue = preparedData.customAmounts[newUserId] || 0;
                newSharedWith = currentParticipantIds
                  .filter(id => id !== newUserId)
                  .map(id => ({
                    userId: new mongoose.Types.ObjectId(id),
                    amount: preparedData.customAmounts[id] || 0
                  }));
              } else {
                // División equitativa
                newValue = parseFloat(((preparedData.value || originalTransaction.value) / currentParticipantIds.length).toFixed(2));
                newSharedWith = currentParticipantIds
                  .filter(id => id !== newUserId)
                  .map(id => ({
                    userId: new mongoose.Types.ObjectId(id),
                    amount: newValue
                  }));
              }

              const newTransaction = new Transaction({
                clientId: new mongoose.Types.ObjectId(newUserId),
                name: preparedData.name || originalTransaction.name,
                type: preparedData.type || originalTransaction.type,
                category: preparedData.category || originalTransaction.category,
                value: newValue,
                originalValue: preparedData.value || originalTransaction.value,
                icon: preparedData.icon || originalTransaction.icon,
                sharedWith: newSharedWith,
                splitType: preparedData.splitType || originalTransaction.splitType,
                totalParticipants: currentParticipantIds.length,
                createdBy: originalTransaction.createdBy,
                isShared: true,
                customAmounts: preparedData.customAmounts || originalTransaction.customAmounts
              });

              const savedTransaction = await newTransaction.save();
              updatedTransactions.push(savedTransaction);
            }
          }

          // 🔧 SOLUCIÓN: Retornar la transacción correcta
          if (transactionToReturn) {
            return transactionToReturn;
          } else {
            // Si la transacción original fue eliminada, buscar la transacción del cliente original
            const clientTransaction = updatedTransactions.find(tx => 
              tx.clientId.toString() === originalClientId
            );
            
            if (clientTransaction) {
              return clientTransaction;
            }
            
            // Si no se encuentra, buscar cualquier transacción actualizada del grupo
            if (updatedTransactions.length > 0) {
              return updatedTransactions[0];
            }
            
            throw new Error('Error al obtener la transacción actualizada');
          }
        }
        
        // Si no hay createdBy, proceder con la actualización normal
        // Transformar sharedWith para la transacción actual
        preparedData.sharedWith = transformSharedWithData(preparedData.sharedWith);
        
        if (!preparedData.splitType && preparedData.sharedWith.length > 0) {
          preparedData.splitType = 'equal';
        }
        
        if (!preparedData.totalParticipants && preparedData.sharedWith.length > 0) {
          preparedData.totalParticipants = preparedData.sharedWith.length + 1;
        }
        
        // Actualizar y retornar para el caso sin createdBy
        const updated = await Transaction.findByIdAndUpdate(transactionId, preparedData, {
          new: true,
          runValidators: true
        });
        
        return updated;
      }
    } else if (preparedData.sharedWith && Array.isArray(preparedData.sharedWith) && preparedData.sharedWith.length === 0) {
      // Convertir transacción compartida en individual
      console.log("Convirtiendo transacción compartida en individual");
      
      // Si la transacción original era compartida, eliminar todas las otras transacciones del grupo
      if (originalTransaction.createdBy && originalTransaction.sharedWith && originalTransaction.sharedWith.length > 0) {
        const createdBy = originalTransaction.createdBy;
        
        // Buscar y eliminar todas las otras transacciones del grupo
        const groupTransactions = await Transaction.find({ 
          createdBy,
          name: originalTransaction.name,
          _id: { $ne: transactionId } // Excluir la transacción actual
        });
        
        console.log("Eliminando transacciones compartidas del grupo:", groupTransactions.length);
        
        for (const tx of groupTransactions) {
          await Transaction.findByIdAndDelete(tx._id);
        }
      }
      
      preparedData.sharedWith = [];
      preparedData.splitType = null;
      preparedData.totalParticipants = 1;
      preparedData.isShared = false;
      preparedData.customAmounts = null; // Limpiar customAmounts también
      preparedData.originalValue= preparedData.value !== undefined ? preparedData.value : originalTransaction.value;
      
      // Actualizar la transacción actual y retornar
      const updated = await Transaction.findByIdAndUpdate(transactionId, preparedData, {
        new: true,
        runValidators: true
      });
      
      return updated;
    }

    console.log("updateData.value:", updateData.value);
    console.log("preparedData.value:", preparedData.value);
    if (updateData.value !== undefined) {
        preparedData.originalValue = updateData.value;
    }
    // Si no hay cambios en sharedWith, actualización normal
    const updated = await Transaction.findByIdAndUpdate(transactionId, preparedData, {
      new: true,
      runValidators: true
    });
    
    return updated;

  } catch (error) {
    console.error("Error en updateTransaction:", error.message);
    throw error;
  }
}


/**
 * @typedef {Object} TrackRequest
 * @property {string} name - Nombre de la transacción
 * @property {string} type - Tipo (income/expense)
 * @property {string} category - Categoría
 * @property {number} value - Valor
 * @property {number} [originalValue] - Valor original
 * @property {string} icon - Icono
 * @property {string} clientId - ID del cliente
 * @property {string[]} [sharedWith] - IDs de usuarios compartidos
 * @property {string} [splitType] - Tipo de división
 * @property {Object} [customAmounts] - Montos personalizados
 */

/**
 * @typedef {Object} TrackResponse
 * @property {string} message - Mensaje de confirmación
 * @property {TransactionData[]} transactions - Transacciones creadas
 */

/**
 * Crear nueva transacción
 * @route POST /track
 * @param {express.Request<{}, TrackResponse, TrackRequest>} req - Request con datos de transacción
 * @param {express.Response<TrackResponse>} res - Response con transacciones creadas
 * @returns {Promise<void>}
 * @description Crea una nueva transacción individual o compartida según los parámetros
 */
app.post('/track', async (req, res) => {
  const {
    name,
    type,
    category,
    value,
    originalValue,
    icon,
    clientId,
    sharedWith = [],
    splitType = 'equal',
    customAmounts = {}
  } = req.body;

  if (!clientId || !name || !type || !category || !value) {
    return res.status(400).json({ error: "Datos incompletos" });
  }

  console.log("categoria recibida", category);

  const categoryExists = await Categoria.findOne({
  name: { $regex: new RegExp(`^${category}$`, 'i') }
});


      console.log("category exists: ", categoryExists);

  try {
    // Si no hay usuarios compartidos, crear transacción individual
    if (!sharedWith || sharedWith.length === 0) {
      const transaction = await createIndividualTransaction({
        name,
        type,
        category: categoryExists._id,
        value,
        icon,
        clientId
      });


      return res.status(201).json({ 
        message: "Transacción registrada", 
        transactions: [transaction] 
      });
    }

    // Crear transacciones compartidas
    const transactions = await createSharedTransactions({
      name,
      type,
      category: categoryExists._id,
      value,
      originalValue,
      icon,
      clientId,
      sharedWith,
      splitType,
      customAmounts
    });

    return res.status(201).json({ 
      message: "Gasto compartido registrado", 
      transactions 
    });

  } catch (err) {
    console.error("Error al guardar transacción:", err);
    return res.status(500).json({ error: "Error al registrar la transacción" });
  }
});

/**
 * @typedef {Object} UpdateTransactionParams
 * @property {string} id - ID de la transacción a actualizar
 */

/**
 * Actualizar transacción existente
 * @route PUT /track/:id
 * @middleware authMiddleware
 * @param {express.Request<UpdateTransactionParams, UpdateResult, Partial<TrackRequest>>} req - Request con datos a actualizar
 * @param {express.Response<UpdateResult>} res - Response con resultado de actualización
 * @returns {Promise<void>}
 * @description Actualiza una transacción existente, manejando conversiones entre individual y compartida
 */
app.put('/track/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await updateTransaction(id, req.body, req.user.id);

    console.log("resultado de update: ", result);

    // Si se convirtió a transacción compartida, retornar todas las transacciones
    if (result.isConverted) {
      return res.status(200).json({
        message: result.message,
        transactions: result.transactions,
        isConverted: true,
        originalClientId: result.originalClientId,
        deletedTransactionId: result.deletedTransactionId
      });
    }

    // Actualización normal
    res.status(200).json(result);

  } catch (err) {
    console.error("Error al actualizar transacción:", err.message);
    
    if (err.message === 'Transacción no encontrada') {
      return res.status(404).json({ message: 'Transacción no encontrada' });
    }
    
    res.status(500).json({ message: 'Error interno del servidor', error: err.message });
  }
});

// function agruparPorCategoria(transactions) {
//   // Usamos un objeto para acumular por categoría
//   const agrupados = {};

//   transactions.forEach(({ category, type, value, icon, name, createdAt, _id }) => {
//     const key = `${type}-${category}`; // diferenciamos gastos e ingresos por categoría
//     if (!agrupados[key]) {
//       agrupados[key] = {
//         category,
//         type,
//         value: 0,
//         icon,
//         name,
//         createdAt,
//         _id 
//       };
//     }
//     agrupados[key].value += Number(value);
//   });

//   // Convertimos el objeto a array
//   return Object.values(agrupados);
// }

/**
 * Elimina una transacción por su ID
 * @route DELETE /track/:id
 * @description Elimina una transacción específica de la base de datos utilizando su ID único
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} req.params - Parámetros de la ruta
 * @param {string} req.params.id - ID único de la transacción a eliminar
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<void>} Respuesta JSON con el resultado de la operación
 * 
 * @example
 * // Solicitud exitosa
 * DELETE /track/60d21b4667d0d8992e610c85
 * 
 * // Respuesta exitosa (200)
 * {
 *   "message": "Transacción eliminada"
 * }
 * 
 * @example
 * // Transacción no encontrada
 * DELETE /track/60d21b4667d0d8992e610c99
 * 
 * // Respuesta (404)
 * {
 *   "message": "Transacción no encontrada"
 * }
 * 
 * @throws {404} Cuando la transacción con el ID especificado no existe
 * @throws {500} Error interno del servidor al procesar la eliminación
 */
app.delete('/track/:id', async (req, res) => {
  try {
    const deleted = await Transaction.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Transacción no encontrada" });
    }
    res.status(200).json({ message: "Transacción eliminada" });
  } catch (err) {
    console.error("Error al eliminar transacción:", err.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/* // Endpoint para obtener todas las transacciones compartidas relacionadas
app.get('/api/transactions/shared/:sharedTransactionId', async (req, res) => {
  try {
    const { sharedTransactionId } = req.params;
    
    if (!sharedTransactionId) {
      return res.status(400).json({ error: "ID de transacción compartida requerido" });
    }
    
    // Buscar todas las transacciones con el mismo sharedTransactionId
    const sharedTransactions = await Transaction.find({
      sharedTransactionId: sharedTransactionId
    }).populate('sharedWith.userId', 'name email'); // Si tienes modelo de usuarios
    
    if (!sharedTransactions || sharedTransactions.length === 0) {
      return res.status(404).json({ error: "No se encontraron transacciones compartidas" });
    }
    
    res.json(sharedTransactions);
    
  } catch (error) {
    console.error("Error al obtener transacciones compartidas:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Endpoint para actualizar una transacción compartida
app.put('/api/transactions/shared/:sharedTransactionId', async (req, res) => {
  try {
    const { sharedTransactionId } = req.params;
    const {
      name,
      type,
      category,
      value,
      icon,
      sharedWith,
      splitType,
      customAmounts,
      clientId
    } = req.body;
    
    // Obtener todas las transacciones relacionadas
    const existingTransactions = await Transaction.find({
      sharedTransactionId: sharedTransactionId
    });
    
    if (!existingTransactions || existingTransactions.length === 0) {
      return res.status(404).json({ error: "Transacciones compartidas no encontradas" });
    }
    
    // Eliminar todas las transacciones existentes
    await Transaction.deleteMany({
      sharedTransactionId: sharedTransactionId
    });
    
    // Crear nuevas transacciones con los datos actualizados
    const updatedTransactions = await createSharedTransactions({
      name,
      type,
      category,
      value,
      icon,
      clientId,
      sharedWith,
      splitType,
      customAmounts
    });
    
    res.json({
      message: "Transacciones compartidas actualizadas",
      transactions: updatedTransactions
    });
    
  } catch (error) {
    console.error("Error al actualizar transacciones compartidas:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}); */

/**
 * Obtiene todas las categorías disponibles para el usuario autenticado
 * @route GET /categories
 * @description Obtiene categorías globales (por defecto del sistema) y categorías personalizadas del usuario,
 *              agrupándolas por tipo (expense/income)
 * @middleware authMiddleware - Requiere autenticación de usuario
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} req.user - Información del usuario autenticado (proporcionada por authMiddleware)
 * @param {string} req.user.id - ID único del usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<void>} Objeto JSON con categorías agrupadas por tipo
 * 
 * @example
 * // Solicitud exitosa
 * GET /categories
 * Authorization: Bearer <token>
 * 
 * // Respuesta exitosa (200)
 * {
 *   "expense": [
 *     {
 *       "name": "Comida",
 *       "type": "expense",
 *       "categoryType": undefined
 *     },
 *     {
 *       "name": "Mi categoría personalizada",
 *       "type": "expense",
 *       "categoryType": "user"
 *     }
 *   ],
 *   "income": [
 *     {
 *       "name": "Salario",
 *       "type": "income",
 *       "categoryType": undefined
 *     }
 *   ]
 * }
 * 
 * @throws {401} Usuario no autenticado
 * @throws {500} Error interno del servidor al procesar categorías
 * 
 * @since 1.0.0
 */
app.get("/categories", authMiddleware, async (req, res) => {   
  try {     
    const userId = req.user.id;      

    // 1. Obtener SOLO categorías globales (sin categoryType)
    const categoriasGlobales = await Categoria.find({ 
      categoryType: { $exists: false },// Solo las que no tienen discriminador
    });      

    // 2. Obtener categorías personalizadas del usuario     
    const categoriasUsuario = await UserCategory.find({ userId, deleted:false });      

    // 3. Combinar ambas listas     
    const todas = [       
      ...categoriasGlobales.map(c => ({         
        name: c.name,         
        type: c.type,     
        categoryType: c.categoryType,          
      })),       
      ...categoriasUsuario.map(c => ({         
        name: c.name,         
        type: c.type,       
        categoryType: c.categoryType,
      }))     
    ];      

    // 4. Agrupar por tipo     
    const porTipo = {
            expense: todas.filter(c => c.type === "expense"),
            income: todas.filter(c => c.type === "income"),
        };    

    res.json(porTipo);    
  } catch (err) {     
    console.error("❌ Error exacto en /categories:", err);     
    res.status(500).json({ error: err.message || "Fallo interno" });   
  } 
});

/**
 * Obtiene todos los iconos disponibles en el sistema
 * @route GET /icons
 * @description Recupera una lista de emojis/iconos disponibles para usar en categorías o transacciones
 * @middleware authMiddleware - Requiere autenticación de usuario
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<void>} Array de strings con los emojis disponibles
 * 
 * @example
 * // Solicitud exitosa
 * GET /icons
 * Authorization: Bearer <token>
 * 
 * // Respuesta exitosa (200)
 * ["🍔", "🏠", "🚗", "💰", "📱", "🎬"]
 * 
 * @throws {401} Usuario no autenticado
 * @throws {500} Error interno del servidor al obtener iconos
 * 
 * @since 1.0.0
 */
app.get("/icons", authMiddleware, async (req, res) => {
  try {
    const iconos = await Icono.find();
    res.json(iconos.map(i => i.emoji));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener iconos" });
  }
});

/**
 * Crea una nueva categoría personalizada para el usuario
 * @route POST /categories
 * @description Permite al usuario autenticado crear una categoría personalizada
 * @middleware authMiddleware - Requiere autenticación de usuario
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} req.body - Datos de la nueva categoría
 * @param {string} req.body.name - Nombre de la categoría
 * @param {string} req.body.type - Tipo de categoría ("expense" o "income")
 * @param {Object} req.user - Información del usuario autenticado
 * @param {string} req.user.id - ID único del usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<void>} Objeto JSON con la nueva categoría creada
 * 
 * @example
 * // Solicitud exitosa
 * POST /categories
 * Authorization: Bearer <token>
 * Content-Type: application/json
 * 
 * {
 *   "name": "Gastos médicos",
 *   "type": "expense"
 * }
 * 
 * // Respuesta exitosa (201)
 * {
 *   "_id": "60d21b4667d0d8992e610c85",
 *   "userId": "60d21b4667d0d8992e610c80",
 *   "name": "Gastos médicos",
 *   "type": "expense",
 *   "createdAt": "2021-06-22T10:30:00.000Z"
 * }
 * 
 * @throws {400} Datos incompletos (falta name o type)
 * @throws {401} Usuario no autenticado
 * @throws {500} Error interno del servidor al crear la categoría
 * 
 * @since 1.0.0
 */
app.post('/categories',authMiddleware, async (req, res) => {
  const { name, type } = req.body;
  const userId= req.user.id;

  if ( !name || !type) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

  const newCategory = new UserCategory({
      userId,
      name,
      type,
    });

    await newCategory.save();

    return res.status(201).json(newCategory);
});

/**
 * Elimina una categoría personalizada del usuario
 * @route DELETE /categorie
 * @description Elimina una categoría personalizada del usuario. No permite eliminar categorías globales/por defecto
 * @middleware authMiddleware - Requiere autenticación de usuario
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} req.body - Datos de la categoría a eliminar
 * @param {string} req.body.name - Nombre de la categoría a eliminar
 * @param {string} req.body.type - Tipo de categoría ("expense" o "income")
 * @param {Object} req.user - Información del usuario autenticado
 * @param {string} req.user.id - ID único del usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<void>} Mensaje de confirmación de eliminación
 * 
 * @example
 * // Solicitud exitosa
 * DELETE /categorie
 * Authorization: Bearer <token>
 * Content-Type: application/json
 * 
 * {
 *   "name": "Gastos médicos",
 *   "type": "expense"
 * }
 * 
 * // Respuesta exitosa (200)
 * {
 *   "message": "Categoría eliminada correctamente"
 * }
 * 
 * @example
 * // Intento de eliminar categoría por defecto
 * DELETE /categorie
 * 
 * // Respuesta de error (400)
 * {
 *   "message": "No se puede eliminar una categoría por defecto"
 * }
 * 
 * @throws {400} No se puede eliminar una categoría por defecto
 * @throws {401} Usuario no autenticado
 * @throws {404} Categoría no encontrada o no se pudo eliminar
 * @throws {500} Error interno del servidor al eliminar la categoría
 * 
 * @since 1.0.0
 */
app.delete('/categorie', authMiddleware, async (req, res) => {
  try {
    const { type, name } = req.body;
    const userId= req.user.id;
    
     // Verificamos si la categoría existe en ambas colecciones
    const categoryInCategoria = await Categoria.findOne({  name, type , categoryType: { $exists: false } }); // Solo categorías globales

    if(categoryInCategoria) {
      return res.status(400).json({ message: "No se puede eliminar una categoría por defecto" });
    }
    const categoryInUserCategory = await UserCategory.findOne({ userId, name, type });

    if (!categoryInUserCategory) {
      return res.status(404).json({ message: "Categoría no encontrada en ninguna colección" });
    }

    // Intentamos eliminar en ambas colecciones
    let deleted1 = false;
    let deleted2 = false;

    // Si la categoría existe en UserCategory, intentamos eliminarla
    if (categoryInUserCategory) {
      deleted2 = await UserCategory.findByIdAndUpdate(categoryInUserCategory,
        {deleted: true ,
          deletedAt: new Date()
        },
      { new: true }
      );
    }

    // Si no se pudo eliminar en ninguna colección, devolvemos error
    if (!deleted1 && !deleted2) {
      return res.status(404).json({ message: "No se pudo eliminar la categoría" });
    }

    // Si hemos llegado aquí, al menos una de las eliminaciones fue exitosa
    res.status(200).json({ message: "Categoría eliminada correctamente" });
  } catch (err) {
    console.error("Error al eliminar categoría:", err.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

/**
 * Exporta todas las transacciones del usuario en formato JSON
 * @route GET /export
 * @description Exporta todas las transacciones del usuario autenticado con formato optimizado para análisis.
 *              Incluye información de gastos compartidos y datos de usuarios participantes.
 *              Requiere suscripción Premium.
 * @middleware authMiddleware - Requiere autenticación de usuario
 * @middleware ensurePremium - Requiere suscripción Premium activa
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} req.user - Información del usuario autenticado
 * @param {string} req.user.id - ID único del usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<void>} Array de transacciones formateadas con información completa
 * 
 * @example
 * // Solicitud exitosa
 * GET /export
 * Authorization: Bearer <token>
 * 
 * // Respuesta exitosa (200)
 * [
 *   {
 *     "amount": 150.50,
 *     "category": "Restaurantes",
 *     "description": "Cena con amigos",
 *     "type": "expense",
 *     "createdAt": "22 de junio de 2024",
 *     "sharedWith": "Juan Pérez, María García",
 *     "splitType": "equal",
 *     "totalParticipants": 3,
 *     "isShared": "Sí",
 *     "customAmounts": "N/A"
 *   },
 *   {
 *     "amount": 2500.00,
 *     "category": "Salario",
 *     "description": "Sueldo mensual",
 *     "type": "income",
 *     "createdAt": "1 de junio de 2024",
 *     "sharedWith": "N/A",
 *     "splitType": "N/A",
 *     "totalParticipants": "N/A",
 *     "customAmounts": "N/A"
 *   }
 * ]
 * 
 * @throws {401} Usuario no autenticado
 * @throws {403} Usuario sin suscripción Premium
 * @throws {500} Error interno del servidor al exportar transacciones
 * 
 * @since 1.0.0
 */
app.get('/export', authMiddleware, ensurePremium, async(req, res) => {
  try {
    const clientId = req.user.id;
    console.log("clienteid",clientId);
    
    // Obtener todas las transacciones del usuario
    const transactions = await Transaction.find({ clientId })
      .select('-_id -clientId -icon -__v -createdBy')
      .lean();

    // Crear un Set con todos los userIds únicos de sharedWith (excluyendo el clientId)
    const userIds = new Set();
    transactions.forEach(tx => {
      if (tx.sharedWith && Array.isArray(tx.sharedWith)) {
        tx.sharedWith.forEach(share => {
          if (share.userId && share.userId.toString() !== clientId.toString()) {
            userIds.add(share.userId.toString());
          }
        });
      }
    });

    // Obtener información de usuarios en lote desde el microservicio
    let userMap = {};
    if (userIds.size > 0) {
      try {
        // Llamar al microservicio de usuarios y devuelve un array de objetos 
        const response = await axios.post(`${process.env.USER_SERVICE_URL}/users/batch`, {
          userIds: Array.from(userIds)
        });

        if (response.data && Array.isArray(response.data)) {
          response.data.forEach(user => {
            userMap[user._id || user.id] = `${user.name} ${user.surname}`;
          });
        }
      } catch (error) {
        console.error('Error al obtener usuarios del microservicio:', error.message);
        // Continuar con userMap vacío en caso de error
      }
    }
    
    // Formatear las transacciones
    const formattedResponse = transactions.map(tx => {
      // Crear una copia del objeto para evitar mutaciones
      const formattedTx = { ...tx };
      
      // Formatear fecha
      if (formattedTx.createdAt) {
        formattedTx.createdAt = dayjs(formattedTx.createdAt).format('D [de] MMMM [de] YYYY');
      }
      //formatear categoría a nombre
      formattedTx.category = formattedTx.category.name || 'N/A';
      
      // Verificar si el gasto es compartido
      const isSharedExpense = formattedTx.sharedWith && Array.isArray(formattedTx.sharedWith) && formattedTx.sharedWith.length > 0;
      
      // Formatear sharedWith (filtrando el clientId)
      if (isSharedExpense) {
        formattedTx.sharedWith = formattedTx.sharedWith
          .filter(share => share.userId && share.userId.toString() !== clientId.toString()) // Filtrar el propio usuario
          .map(share => {
            const userId = share.userId.toString();
            return userMap[userId] || `Usuario ${userId}`;
          })
          .filter(name => name !== '') // Filtrar nombres vacíos
          .join(', ');
        
        // Si después de filtrar no quedan usuarios, poner N/A
        if (!formattedTx.sharedWith) {
          formattedTx.sharedWith = 'N/A';
        }
      } else {
        formattedTx.sharedWith = 'N/A'; // N/A si no hay usuarios compartidos
      }
      
      // Formatear campos relacionados con gastos compartidos
      if (!isSharedExpense) {
        // Si no es compartido, estos campos deben mostrar N/A
        formattedTx.splitType = 'N/A';
        formattedTx.totalParticipants = 'N/A';
      } else {
        // Si es compartido, formatear campos apropiadamente
        formattedTx.splitType = formattedTx.splitType || 'N/A';
        formattedTx.totalParticipants = formattedTx.totalParticipants || 'N/A';
        formattedTx.isShared = formattedTx.isShared ? 'Si' : 'No';
        
        // Formatear customAmounts
        if (formattedTx.customAmounts && typeof formattedTx.customAmounts === 'object') {
          formattedTx.customAmounts = JSON.stringify(formattedTx.customAmounts);
        } else {
          formattedTx.customAmounts = 'N/A';
        }
      }
      
      return formattedTx;
    });

  
    res.status(200).json(formattedResponse);
    
  } catch(err) {
    console.error("Error en export:", err);
    res.status(500).json({ message: "Error: no se pudo extraer transacciones" });
  }
});

module.exports = app;