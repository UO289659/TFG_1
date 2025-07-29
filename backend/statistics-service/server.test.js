const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const Transaction = require('../statistics-service/statistics-model');
const Categoria = require('./category-model');
const UserCategory = require('./user-category');
const Icono = require('./icon-model');

// Define clientId ANTES del mock
const clientId = '507f1f77bcf86cd799439011'; // ObjectId fijo para tests

// Mocks corregidos
jest.mock('../auth-middleware/index', () => ({
  authMiddleware: (req, res, next) => {
    req.user = { id: '507f1f77bcf86cd799439011' }; // Mismo ID fijo
    next();
  },
  ensurePremium: (req, res, next) => next()
}));

let mongoServer;
let app;

// Variables para almacenar IDs de categorías creadas
let comidaCategoryId;
let transporteCategoryId;
let salarioCategoryId;
let electronicaCategoryId;
let metaAhorroCategoryId;

// Función para agregar datos de prueba
async function addTestData() {

  const comidaCategory = await Categoria.create({ name: 'Comida', type: 'expense' });
  const transporteCategory = await Categoria.create({ name: 'Transporte', type: 'expense' });
  const salarioCategory = await Categoria.create({ name: 'Salario', type: 'income' });

  comidaCategoryId = comidaCategory._id;
  transporteCategoryId = transporteCategory._id;
  salarioCategoryId = salarioCategory._id;

   // Crear categorías de usuario
  const electronicaCategory = await UserCategory.create({
    userId: clientId,
    name: 'Electronica',
    type: 'expense'
  });
  const metaAhorroCategory = await UserCategory.create({
    userId: clientId,
    name: 'Meta ahorro',
    type: 'income'
  });
  
  electronicaCategoryId = electronicaCategory._id;
  metaAhorroCategoryId = metaAhorroCategory._id;

  // Crear transacciones de prueba
  await Transaction.create([
    {
      clientId: clientId,
      name: 'Gasto Test 1',
      type: 'expense',
      category: comidaCategoryId,
      value: 100,
      icon: '🍕',
      createdAt: new Date()
    },
    {
      clientId: clientId,
      name: 'Gasto Test 2',
      type: 'expense',
      category: transporteCategoryId,
      value: 50,
      icon: '🚗',
      createdAt: new Date()
    },
    {
      clientId: clientId,
      name: 'Ingreso Test',
      type: 'income',
      category: salarioCategoryId,
      value: 2000,
      icon: '💰',
      createdAt: new Date('2024-01-15')
    }
  ]);

  // Crear iconos de prueba
  await Icono.create([
    { emoji: '🍕' },
    { emoji: '🚗' },
    { emoji: '💰' },
    { emoji: '🏠' }
  ]);


}

// Datos de prueba
const sampleTransaction = {
  clientId:clientId,
  name: 'Test Expense',
  type: 'expense',
  category: 'Comida',
  value: 100,
  icon: '🍕'
};

const sampleCategory = {
  name: 'Test Category',
  type: 'expense',
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGO_URI = mongoUri;
  
  // Conectar a la base de datos
  await mongoose.connect(mongoUri);
  
  // Importar la app después de configurar la base de datos
  app = require('./server');
  
  // Agregar datos de prueba
  await addTestData();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

describe('Server Tests', () => {

  describe('GET /gastos/:period', () => {
    it('should get expenses for current month', async () => {
      const res = await request(app)
        .get('/gastos/month');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);

      const names = res.body.map(t => t.name);
      expect(names).toContain('Gasto Test 1');
      expect(names).toContain('Gasto Test 2');
    });

    it('should get expenses for current day', async () => {
      const res = await request(app)
        .get('/gastos/day');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);

      const names = res.body.map(t => t.name);
      expect(names).toContain('Gasto Test 1');
      expect(names).toContain('Gasto Test 2');
    });

    it('should get expenses for current year', async () => {
      const res = await request(app)
        .get('/gastos/year');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
       expect(res.body.length).toBe(2);

      const names = res.body.map(t => t.name);
      expect(names).toContain('Gasto Test 1');
      expect(names).toContain('Gasto Test 2');
    });
  });

  describe('GET /gastos/rango', () => {
    it('should get expenses in specific date range', async () => {
      const res = await request(app)
        .get('/gastos/rango')
        .query({
          start: '2024-01-01',
          end: '2024-01-31'
        });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(1);

      const names = res.body.map(t => t.name);
      expect(names).toContain('Ingreso Test');
    });

    it('should return 400 if start date is missing', async () => {
      const res = await request(app)
        .get('/gastos/rango')
        .query({ end: '2024-01-31' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Se requieren fechas de inicio y fin');
    });

    it('should return 400 if end date is missing', async () => {
      const res = await request(app)
        .get('/gastos/rango')
        .query({ start: '2024-01-01' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Se requieren fechas de inicio y fin');
    });

     it('should get empty array if no transactions are found', async () => {
      const res = await request(app)
        .get('/gastos/rango')
        .query({
          start: '2024-02-01',
          end: '2024-02-31'
        });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(0);
    });

     it('should return 400 if end date is before start date', async () => {
      const res = await request(app)
        .get('/gastos/rango')
        .query({
          start: '2024-02-01',
          end: '2023-02-31'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('La fecha de fin debe ser posterior a la de inicio');
    });
  });

  describe('POST /track', () => {
    it('should create a new transaction', async () => {
      const res = await request(app)
        .post('/track')
        .send(sampleTransaction);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Transacción registrada');
      expect(res.body.transactions).toHaveLength(1);
      expect(res.body.transactions[0].name).toBe('Test Expense');
    });

    it('should create shared transaction with equal values', async () => {
      const validUserId1 = new mongoose.Types.ObjectId().toString();
      const validUserId2 = new mongoose.Types.ObjectId().toString();
      
      const sharedTransaction = {
        ...sampleTransaction,
        name: 'Shared Expense',
        sharedWith: [validUserId1, validUserId2],
        splitType: 'equal'
      };

      const res = await request(app)
        .post('/track')
        .send(sharedTransaction);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Gasto compartido registrado');
      expect(res.body.transactions).toHaveLength(3); // 3 usuarios total

      const transactions = res.body.transactions;

      // Verificar transacción del creador (userId1)
      const creatorTransaction = transactions.find(t => t.clientId === clientId.toString());
      expect(creatorTransaction).toBeDefined();
      expect(creatorTransaction.value).toBe(33.333333333333336);
      expect(creatorTransaction.splitType).toBe('equal');
      expect(creatorTransaction.isShared).toBe(true);
      expect(creatorTransaction.totalParticipants).toBe(3);
      
      // Verificar transacción del usuario 2
      const user2Transaction = transactions.find(t => t.clientId === validUserId1.toString());
      expect(user2Transaction).toBeDefined();
      expect(user2Transaction.value).toBe(33.333333333333336);
      expect(user2Transaction.splitType).toBe('equal');
      expect(user2Transaction.isShared).toBe(true);
      
      // Verificar transacción del usuario 3
      const user3Transaction = transactions.find(t => t.clientId === validUserId2.toString());
      expect(user3Transaction).toBeDefined();
      expect(user3Transaction.value).toBe(33.333333333333336);
      expect(user3Transaction.splitType).toBe('equal');
      expect(user3Transaction.isShared).toBe(true);
    });
  

    it('should create shared transaction with custom values', async () => {

      const userId2 = new mongoose.Types.ObjectId();
      const userId3 = new mongoose.Types.ObjectId();
      
      const sharedTransaction = {
    ...sampleTransaction,
    name: 'Shared Expense',
    splitType: 'custom',
    value: 100,
    sharedWith: [userId2.toString(), userId3.toString()],
    customAmounts: {
      [clientId]: 30,
      [userId2.toString()]: 30,
      [userId3.toString()]: 40
    }
  };

      const res = await request(app)
        .post('/track')
        .send(sharedTransaction);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Gasto compartido registrado');
      expect(res.body.transactions).toHaveLength(3); // 3 usuarios total

       const transactions = res.body.transactions;

      // Verificar transacción del creador (userId1)
      const creatorTransaction = transactions.find(t => t.clientId === clientId.toString());
      expect(creatorTransaction).toBeDefined();
      expect(creatorTransaction.value).toBe(30);
      expect(creatorTransaction.splitType).toBe('custom');
      expect(creatorTransaction.isShared).toBe(true);
      expect(creatorTransaction.totalParticipants).toBe(3);
      
      // Verificar transacción del usuario 2
      const user2Transaction = transactions.find(t => t.clientId === userId2.toString());
      expect(user2Transaction).toBeDefined();
      expect(user2Transaction.value).toBe(30);
      expect(user2Transaction.splitType).toBe('custom');
      expect(user2Transaction.isShared).toBe(true);
      
      // Verificar transacción del usuario 3
      const user3Transaction = transactions.find(t => t.clientId === userId3.toString());
      expect(user3Transaction).toBeDefined();
      expect(user3Transaction.value).toBe(40);
      expect(user3Transaction.splitType).toBe('custom');
      expect(user3Transaction.isShared).toBe(true);
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/track')
        .send({
          clientId: clientId,
          name: 'Test'
          // Missing required fields
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Datos incompletos');
    });
  });

  describe('PUT /track/:id', () => {
    it('should update existing transaction', async () => {
      // Crear transacción primero
      const transaction = await Transaction.create({
        clientId: clientId,
        name: 'Original Transaction',
        type: 'expense',
        category: comidaCategoryId,
        value: 100,
        icon: '🍕',
        createdBy: new mongoose.Types.ObjectId(),
      });

       console.log('Transaction created:', transaction._id);

      const updateData = {
        name: 'Updated Transaction',
        value: 150
      };

      const res = await request(app)
        .put(`/track/${transaction._id}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Transaction');
      expect(res.body.value).toBe(150);
    });

    it('should update existing individual transaction to shared transaction with equal split', async () => {
      const userId2 = new mongoose.Types.ObjectId();
      const userId3 = new mongoose.Types.ObjectId();

      // Crear transacción primero
      const transaction = await Transaction.create({
        clientId: clientId,
        name: 'Original Transaction',
        type: 'expense',
        category: comidaCategoryId,
        value: 150,
        icon: '🍕',
        createdBy: new mongoose.Types.ObjectId(),
      });

      const updateData = {
        sharedWith: [userId2, userId3],
        splitType: 'equal'
      };

      const res = await request(app)
        .put(`/track/${transaction._id}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Transacción convertida a compartida');
      expect(res.body.transactions).toHaveLength(3); // 3 usuarios total
      expect(res.body.originalClientId).toBe(clientId);
      expect(res.body.deletedTransactionId).toBe(transaction._id.toString());

      // Verificar que cada transacción tiene el monto correcto (150/3 = 50)
      const transactions = res.body.transactions;
      transactions.forEach(tx => {
        expect(tx.value).toBe(50);
        expect(tx.splitType).toBe('equal');
        expect(tx.isShared).toBe(true);
        expect(tx.totalParticipants).toBe(3);
      });

      // Verificar que la transacción original fue eliminada
      const originalTransaction = await Transaction.findById(transaction._id);
      expect(originalTransaction).toBeNull();
    });

    it('should convert individual transaction to shared with custom split', async () => {
      // Crear transacción individual
      const transaction = await Transaction.create({
        clientId: clientId,
        name: 'Individual Custom Expense',
        type: 'expense',
        category: transporteCategoryId,
        value: 120,
        icon: '🚗',
        createdBy: new mongoose.Types.ObjectId(),
        sharedWith: [],
        isShared: false
      });

      const userId2 = new mongoose.Types.ObjectId().toString();
      const userId3 = new mongoose.Types.ObjectId().toString();

      const updateData = {
        sharedWith: [userId2, userId3],
        splitType: 'custom',
        customAmounts: {
          [clientId]: 60,
          [userId2]: 30,
          [userId3]: 30
        }
      };

      const res = await request(app)
        .put(`/track/${transaction._id}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.isConverted).toBe(true);
      expect(res.body.message).toBe('Transacción convertida a compartida');
      expect(res.body.transactions).toHaveLength(3);

      // Verificar montos personalizados
      const transactions = res.body.transactions;
      
      const creatorTx = transactions.find(tx => tx.clientId === clientId);
      expect(creatorTx.value).toBe(60);
      
      const user2Tx = transactions.find(tx => tx.clientId === userId2);
      expect(user2Tx.value).toBe(30);
      
      const user3Tx = transactions.find(tx => tx.clientId === userId3);
      expect(user3Tx.value).toBe(30);

      transactions.forEach(tx => {
        expect(tx.splitType).toBe('custom');
        expect(tx.isShared).toBe(true);
        expect(tx.totalParticipants).toBe(3);
      });
    });

     it('should update existing shared transaction participants', async () => {
      const userId2 = new mongoose.Types.ObjectId();
      const userId3 = new mongoose.Types.ObjectId();
      const userId4 = new mongoose.Types.ObjectId(); // Nuevo usuario
      const createdBy = clientId; // Usar clientId como creador

      // Crear transacciones compartidas existentes
      const sharedTransactions = await Transaction.insertMany([
        {
          clientId: clientId,
          name: 'Update Shared Test',
          type: 'expense',
          category: comidaCategoryId,
          value: 30,
          icon: '🍕',
          createdBy: createdBy,
          sharedWith: [
            { userId: userId2, amount: 50, isPaid: false },
            { userId: userId3, amount: 20, isPaid: false }
          ],
          isShared: true,
          splitType: 'equal',
          totalParticipants: 3
        },
        {
          clientId: userId2,
          name: 'Update Shared Test',
          type: 'expense',
          category: comidaCategoryId,
          value: 50,
          icon: '🍕',
          createdBy: createdBy,
          sharedWith: [
            { userId: new mongoose.Types.ObjectId(clientId), amount: 30, isPaid: true },
            { userId: userId3, amount: 20, isPaid: false }
          ],
          isShared: true,
      
          totalParticipants: 3
        },
        {
          clientId: userId3,
          name: 'Update Shared Test',
          type: 'expense',
          category: comidaCategoryId,
          value: 20,
          icon: '🍕',
          createdBy: createdBy,
          sharedWith: [
            { userId: new mongoose.Types.ObjectId(clientId), amount: 30, isPaid: true },
            { userId: userId2, amount: 50, isPaid: false }
          ],
          isShared: true,
         
          totalParticipants: 3
        }
      ]);

      const transactionToUpdate = sharedTransactions[0];

      const updateData = {
        sharedWith: [
          { userId: userId2.toString(), amount: 50, isPaid: false },
          { userId: userId4.toString(), amount: 20, isPaid: false } // Reemplazar userId3 con userId4
        ],
       
      };

      const res = await request(app)
        .put(`/track/${transactionToUpdate._id}`)
        .send(updateData);

      expect(res.status).toBe(200);

      // Verificar que se mantiene como compartida
      expect(res.body.isShared).toBe(true);
      expect(res.body.totalParticipants).toBe(3); // creador + userId2 + userId4

      // Verificar que se crearon/actualizaron las transacciones correctas
      const allTransactions = await Transaction.find({ 
        name: 'Update Shared Test'
      });

      expect(allTransactions).toHaveLength(3); // creador + userId2 + userId4
      
      const clientIds = allTransactions.map(tx => tx.clientId.toString());
      expect(clientIds).toContain(clientId);
      expect(clientIds).toContain(userId2.toString());
      expect(clientIds).toContain(userId4.toString());
      expect(clientIds).not.toContain(userId3.toString()); // userId3 debe ser eliminado
    });
  

    it('should convert shared transaction to individual', async () => {
      const userId2 = new mongoose.Types.ObjectId();
      const userId3 = new mongoose.Types.ObjectId();
      const createdBy = new mongoose.Types.ObjectId();

      // Crear transacciones compartidas (simulando el grupo)
      const sharedTransactions = await Transaction.insertMany([
        {
          clientId: clientId,
          name: 'Shared to Individual',
          type: 'expense',
          category: comidaCategoryId,
          value: 50,
          icon: '🍕',
          createdBy: createdBy,
          sharedWith: [
            { userId: userId2, amount: 50, isPaid: false },
            { userId: userId3, amount: 50, isPaid: false }
          ],
          isShared: true,
          splitType: 'equal',
          totalParticipants: 3
        },
        {
          clientId: userId2,
          name: 'Shared to Individual',
          type: 'expense',
          category: comidaCategoryId,
          value: 50,
          icon: '🍕',
          createdBy: createdBy,
          sharedWith: [
            { userId: new mongoose.Types.ObjectId(clientId), amount: 50, isPaid: true },
            { userId: userId3, amount: 50, isPaid: false }
          ],
          isShared: true,
          splitType: 'equal',
          totalParticipants: 3
        },
        {
          clientId: userId3,
          name: 'Shared to Individual',
          type: 'expense',
          category: comidaCategoryId,
          value: 50,
          icon: '🍕',
          createdBy: createdBy,
          sharedWith: [
            { userId: new mongoose.Types.ObjectId(clientId), amount: 50, isPaid: true },
            { userId: userId2, amount: 50, isPaid: false }
          ],
          isShared: true,
          splitType: 'equal',
          totalParticipants: 3
        }
      ]);

      const transactionToUpdate = sharedTransactions[0]; // Transacción del creador

      const updateData = {
        sharedWith: [], // Array vacío para convertir a individual
        value: 150 // Nuevo valor individual
      };

      const res = await request(app)
        .put(`/track/${transactionToUpdate._id}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.isConverted).toBeUndefined();
      expect(res.body.isShared).toBe(false);
      expect(res.body.sharedWith).toHaveLength(0);
      expect(res.body.value).toBe(150);
      expect(res.body.splitType).toBeNull();
      expect(res.body.totalParticipants).toBe(1);
      expect(res.body.groupName).toBeNull();

      // Verificar que las otras transacciones del grupo fueron eliminadas
      const remainingTransactions = await Transaction.find({ 
        name: 'Shared to Individual',
        createdBy: createdBy
      });
      expect(remainingTransactions).toHaveLength(1); // Solo la transacción actualizada
      expect(remainingTransactions[0]._id.toString()).toBe(transactionToUpdate._id.toString());
    });

    it('should return 404 if transaction not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const res = await request(app)
        .put(`/track/${fakeId}`)
        .send({ name: 'Test' });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Transacción no encontrada');
    });
  });

  describe('DELETE /track/:id', () => {
    it('should delete existing transaction', async () => {
      // Crear transacción primero
      const transaction = await Transaction.create({
        clientId: clientId,
        name: 'Transaction to Delete',
        type: 'expense',
        category: comidaCategoryId,
        value: 100,
        icon: '🍕'
      });

      const res = await request(app)
        .delete(`/track/${transaction._id}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Transacción eliminada');
      
      // Verificar que se eliminó
      const deletedTransaction = await Transaction.findById(transaction._id);
      expect(deletedTransaction).toBeNull();
    });

    it('should return 404 if transaction not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const res = await request(app)
        .delete(`/track/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Transacción no encontrada');
    });
  });

  describe('GET /categories', () => {
    it('should get all categories', async () => {
      const res = await request(app)
        .get('/categories');

      //categorías globales
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('expense');
      expect(res.body).toHaveProperty('income');
      expect(res.body.expense).toContain('Comida');
      expect(res.body.income).toContain('Salario');
      //categorías de usuario
      expect(res.body.expense).toContain('Electronica');
      expect(res.body.income).toContain('Meta ahorro');
    });
  });

  describe('POST /categories', () => {
    it('should create new user category', async () => {
      const res = await request(app)
        .post('/categories')
        .send(sampleCategory);

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Test Category');
      expect(res.body.type).toBe('expense');
      expect(res.body.userId).toBe(clientId);
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/categories')
        .send({
          name: 'Test'
          // Missing type
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Datos incompletos');
    });
  });

  describe('DELETE /categorie', () => {
    it('should delete user category', async () => {
      // Crear categoría primero
      await UserCategory.create({
        userId: clientId,
        name: 'Category to Delete',
        type: 'expense'
      });

      const res = await request(app)
        .delete('/categorie')
        .send({
          name: 'Category to Delete',
          type: 'expense'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Categoría eliminada correctamente');
    });

    it('should return 404 if category not found', async () => {
      const res = await request(app)
        .delete('/categorie')
        .send({
          name: 'Nonexistent Category',
          type: 'expense'
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Categoría no encontrada en ninguna colección');
    });
  });

  describe('GET /icons', () => {
    it('should get all icons', async () => {
      const res = await request(app)
        .get('/icons');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toContain('🍕');
      expect(res.body).toContain('🚗');
      expect(res.body).toContain('💰');
    });

    it('should return empty array when no icons exist', async () => {
    // Limpiar todas las transacciones de la base de datos
    await Icono.deleteMany({});
    
    const res = await request(app)
      .get('/icons');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
   
  });
  });

  describe('GET /export', () => {
    it('should export transactions in formatted way', async () => {
      const res = await request(app)
        .get('/export');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[0]).toHaveProperty('createdAt');
      expect(res.body[0]).not.toHaveProperty('_id');
      expect(res.body[0]).not.toHaveProperty('clientId');
    });
    it('should return empty array when no transactions exist', async () => {
    // Limpiar todas las transacciones de la base de datos
    await Transaction.deleteMany({});
    
    const res = await request(app)
      .get('/export');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });
  });
});