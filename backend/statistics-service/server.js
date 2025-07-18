const express = require("express");
const cors = require("cors");
const mongoose = require('mongoose');
require('dotenv').config();
const {authMiddleware, ensurePremium} = require("../auth-middleware/index");
const dayjs = require('dayjs');
const seedCategorias = require("./seedCategories");
const seedIconos= require("./seedIcons");
const app = express();
const Transaction = require("../statistics-service/statistics-model")
const Categoria = require("./category-model")
const UserCategory=require("./user-category");
const Icono = require("./icon-model")
const User = require("../user-service/user-model");
app.use(cors());
app.use(express.json());

const localizedFormat = require('dayjs/plugin/localizedFormat');
const es = require('dayjs/locale/es'); // Importa el idioma español

dayjs.extend(localizedFormat);
dayjs.locale('es');

const userSchemaLocal = new mongoose.Schema({
  name: { type: String, required: true },
  surname: { type: String, required: true },
  email: { type: String, required: true }
}, {
  collection: 'users', // Asegúrate de que apunte a la misma colección que tu microservicio de usuarios
  _id: true, // Asegurar que se reconozca el _id
  versionKey: false // Opcional: remover __v
});

// Crear el modelo User local
const UserLocal = mongoose.model("UserLocal", userSchemaLocal);


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

// Endpoint para obtener los gastos
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

// Función helper para transformar datos de sharedWith
function transformSharedWithData(sharedWith) {
  if (!sharedWith || !Array.isArray(sharedWith)) return [];
  
  return sharedWith.map(item => {
    // Si el item ya tiene la estructura correcta
    if (typeof item === 'object' && item.userId && item.amount !== undefined) {
      return {
        userId: new mongoose.Types.ObjectId(item.userId),
        amount: item.amount,
        isPaid: item.isPaid || false,
      };
    }
    
    // Si el item es solo un string (userId)
    if (typeof item === 'string') {
      return {
        userId: new mongoose.Types.ObjectId(item),
        amount: 0,
        isPaid: false,
      };
    }
    
    // Si el item tiene userId como string
    if (item.userId && typeof item.userId === 'string') {
      return {
        userId: new mongoose.Types.ObjectId(item.userId),
        amount: item.amount || 0,
        isPaid: item.isPaid || false,
      };
    }
    
    return item;
  });
}

// Función helper para crear transacciones compartidas
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
    const amountPerPerson = value / allParticipants.length;
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
    amount: amounts[userId] || 0,
    isPaid: userId === clientId // Solo el creador ha pagado inicialmente
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

// Función helper para actualizar transacciones (individuales o compartidas)
async function updateTransaction(transactionId, updateData) {
  try {
    // Obtener la transacción original
    const originalTransaction = await Transaction.findById(transactionId);
    if (!originalTransaction) {
      throw new Error('Transacción no encontrada');
    }

    // Limpiar y preparar datos - solo campos permitidos
    const allowedFields = ['name', 'type', 'category', 'value', 'icon', 'sharedWith', 'splitType', 'customAmounts', 'groupName', 'totalParticipants', 'createdBy'];
    const preparedData = {};
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        preparedData[field] = updateData[field];
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
            customAmounts: preparedData.customAmounts || {},
            groupName: preparedData.groupName || "Gasto compartido"
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
          const originalClientId = originalTransaction.clientId.toString(); // Guardar el clientId original
          
          console.log("Sincronizando grupo con createdBy:", createdBy);
          
          // 1️⃣ Buscar TODAS las transacciones del grupo (mismo createdBy + mismo nombre)
          const groupTransactions = await Transaction.find({ 
            createdBy,
            name: originalTransaction.name // Asegurar que es el mismo gasto
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
              
              // Preparar sharedWith actualizado (excluyendo al propio usuario)
              const updatedSharedWith = preparedData.sharedWith
                .filter(item => {
                  const itemUserId = typeof item === 'object' ? item.userId.toString() : item.toString();
                  return itemUserId !== txUserId;
                })
                .map(item => {
                  if (typeof item === 'object' && item.userId) {
                    return {
                      userId: new mongoose.Types.ObjectId(item.userId),
                      amount: item.amount || 0,
                      isPaid: item.isPaid || false,
                    };
                  } else if (typeof item === 'string') {
                    return {
                      userId: new mongoose.Types.ObjectId(item),
                      amount: 0,
                      isPaid: false
                    };
                  }
                  return item;
                });

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

              // Calcular el nuevo valor si hay cambios en el monto o división
              if (preparedData.value && preparedData.value !== tx.value) {
                if (preparedData.splitType === 'custom' && preparedData.customAmounts) {
                  updateFields.value = preparedData.customAmounts[txUserId] || 0;
                } else {
                  // División equitativa
                  updateFields.value = preparedData.value / currentParticipantIds.length;
                }
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
              const newValue = preparedData.splitType === 'custom' && preparedData.customAmounts
                ? preparedData.customAmounts[newUserId] || 0
                : (preparedData.value || originalTransaction.value) / currentParticipantIds.length;

              const newSharedWith = currentParticipantIds
                .filter(id => id !== newUserId)
                .map(id => ({
                  userId: new mongoose.Types.ObjectId(id),
                  amount: 0,
                  isPaid: false
                }));

              const newTransaction = new Transaction({
                clientId: new mongoose.Types.ObjectId(newUserId),
                name: preparedData.name || originalTransaction.name,
                type: preparedData.type || originalTransaction.type,
                category: preparedData.category || originalTransaction.category,
                value: newValue,
                icon: preparedData.icon || originalTransaction.icon,
                sharedWith: newSharedWith,
                splitType: preparedData.splitType || originalTransaction.splitType,
                totalParticipants: currentParticipantIds.length,
                createdBy: originalTransaction.createdBy,
                isShared: true,
                groupName: preparedData.groupName || originalTransaction.groupName || "Gasto compartido"
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
        
        if (!preparedData.groupName && preparedData.sharedWith.length > 0) {
          preparedData.groupName = "Gasto compartido";
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
      preparedData.groupName = null;
      preparedData.isShared = false;
      
      // Actualizar la transacción actual y retornar
      const updated = await Transaction.findByIdAndUpdate(transactionId, preparedData, {
        new: true,
        runValidators: true
      });
      
      return updated;
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

// Función helper para crear transacción individual
async function createIndividualTransaction({
  name,
  type,
  category,
  value,
  icon,
  clientId
}) {
  const transaction = new Transaction({
    clientId,
    name,
    type,
    category,
    value,
    icon,
    sharedWith: [],
    splitType: null,
    totalParticipants: 1,
    createdBy: new mongoose.Types.ObjectId(clientId),
    groupName: null
  });

  await transaction.save();
  return transaction;
}

// Endpoint POST refactorizado
app.post('/track', async (req, res) => {
  const {
    name,
    type,
    category,
    value,
    icon,
    clientId,
    sharedWith = [],
    splitType = 'equal',
    customAmounts = {}
  } = req.body;

  if (!clientId || !name || !type || !category || !value) {
    return res.status(400).json({ error: "Datos incompletos" });
  }

  try {
    // Si no hay usuarios compartidos, crear transacción individual
    if (!sharedWith || sharedWith.length === 0) {
      const transaction = await createIndividualTransaction({
        name,
        type,
        category,
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
      category,
      value,
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

// Endpoint PUT refactorizado
app.put('/track/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await updateTransaction(id, req.body);

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

function agruparPorCategoria(transactions) {
  // Usamos un objeto para acumular por categoría
  const agrupados = {};

  transactions.forEach(({ category, type, value, icon, name, createdAt, _id }) => {
    const key = `${type}-${category}`; // diferenciamos gastos e ingresos por categoría
    if (!agrupados[key]) {
      agrupados[key] = {
        category,
        type,
        value: 0,
        icon,
        name,
        createdAt,
        _id 
      };
    }
    agrupados[key].value += Number(value);
  });

  // Convertimos el objeto a array
  return Object.values(agrupados);
}

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

// Endpoint para obtener todas las transacciones compartidas relacionadas
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
});

app.get("/categories", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Obtener categorías globales
    const categoriasGlobales = await Categoria.find();

    // 2. Obtener categorías personalizadas del usuario
    const categoriasUsuario = await UserCategory.find({ userId });

    // 3. Combinar ambas listas
    const todas = [
      ...categoriasGlobales.map(c => ({
        name: c.name,
        type: c.type,
       
      })),
      ...categoriasUsuario.map(c => ({
        name: c.name,
        type: c.type,
      }))
    ];

    // 4. Agrupar por tipo y extraer iconos únicos
    const porTipo = {
      expense: todas.filter(c => c.type === "expense").map(c => c.name),
      income: todas.filter(c => c.type === "income").map(c => c.name),
    
    };

    res.json(porTipo);

  } catch (err) {
    console.error("❌ Error exacto en /categories:", err);
    res.status(500).json({ error: err.message || "Fallo interno" });
  }
});


app.get("/icons", authMiddleware, async (req, res) => {
  try {
    const iconos = await Icono.find();
    res.json(iconos.map(i => i.emoji));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener iconos" });
  }
});

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

app.delete('/categorie', authMiddleware, async (req, res) => {
  try {
    const { type, name } = req.body;
    const userId= req.user.id;
    console.log("userid: "+userId);
    console.log("type: "+type);
    console.log("name: "+name);
     // Verificamos si la categoría existe en ambas colecciones
     //TODO: AQUI NO SE PUEDEN BORRAR LAS CATEGORIAS POR DEFECTO PORQUE SE BORRAN PARA TODOS LOS USUARIOS
    const categoryInCategoria = await Categoria.findOne({ userId, name, type });
    const categoryInUserCategory = await UserCategory.findOne({ userId, name, type });

    if (!categoryInCategoria && !categoryInUserCategory) {
      return res.status(404).json({ message: "Categoría no encontrada en ninguna colección" });
    }

    // Intentamos eliminar en ambas colecciones
    let deleted = false;
    let deleted2 = false;

    // Si la categoría existe en Categoria, intentamos eliminarla
    if (categoryInCategoria) {
      deleted = await Categoria.findOneAndDelete({ userId, name, type });
    }

    // Si la categoría existe en UserCategory, intentamos eliminarla
    if (categoryInUserCategory) {
      deleted2 = await UserCategory.findOneAndDelete({ userId, name, type });
    }

    // Si no se pudo eliminar en ninguna colección, devolvemos error
    if (!deleted && !deleted2) {
      return res.status(404).json({ message: "No se pudo eliminar la categoría" });
    }

    // Si hemos llegado aquí, al menos una de las eliminaciones fue exitosa
    res.status(200).json({ message: "Categoría eliminada correctamente" });
  } catch (err) {
    console.error("Error al eliminar categoría:", err.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

app.get('/export', authMiddleware, ensurePremium, async(req, res) => {
  console.log("entra por export de stats");
  try {
    const clientId = req.user.id;
    
    // Obtener todas las transacciones del usuario
    const transactions = await Transaction.find({ clientId })
      .select('-_id -clientId -icon -__v -createdBy -sharedTransactionId -groupName')
      .lean();

    // Crear un Set con todos los userIds únicos de sharedWith
    const userIds = new Set();
    transactions.forEach(tx => {
      if (tx.sharedWith && Array.isArray(tx.sharedWith)) {
        tx.sharedWith.forEach(share => {
          if (share.userId) {
            userIds.add(share.userId.toString());
          }
        });
      }
    });

    // Obtener información de usuarios en lote
    let userMap = {};
    if (userIds.size > 0) {
      const users = await UserLocal.find({
        _id: { $in: Array.from(userIds) }
      }).select('name surname').lean();

      // Crear un mapa de userId -> userData para acceso rápido
      users.forEach(user => {
        userMap[user._id.toString()] = `${user.name} ${user.surname}`;
      });
    }

    // Formatear las transacciones
    const formattedResponse = transactions.map(tx => {
      // Crear una copia del objeto para evitar mutaciones
      const formattedTx = { ...tx };
      
      // Formatear fecha
      if (formattedTx.createdAt) {
        formattedTx.createdAt = dayjs(formattedTx.createdAt).format('D [de] MMMM [de] YYYY');
      }
      
      // Verificar si el gasto es compartido
      const isSharedExpense = formattedTx.sharedWith && Array.isArray(formattedTx.sharedWith) && formattedTx.sharedWith.length > 0;
      
      // Formatear sharedWith
      if (isSharedExpense) {
        formattedTx.sharedWith = formattedTx.sharedWith
          .map(share => {
            if (share.userId) {
              const userId = share.userId.toString();
              return userMap[userId] || `Usuario ${userId}`;
            }
            return '';
          })
          .filter(name => name !== '') // Filtrar nombres vacíos
          .join(', ');
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
        formattedTx.isShared = formattedTx.isShared ? 'Sí' : 'No';
        formattedTx.groupName = formattedTx.groupName || 'N/A';
        
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
