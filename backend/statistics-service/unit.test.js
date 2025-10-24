/**
 * @fileoverview Pruebas Unitarias Puras para Statistics Service
 * @description Suite de pruebas que se enfoca en probar funciones individuales sin dependencias externas
 * @version 1.0.0
 * @author Carmen Espinosa Martínez
 */

// Importar funciones desde utils.js
const {
  transformSharedWithData,
  createSharedTransactions,
  createIndividualTransaction,
} = require('./utils');

// Configurar entorno de prueba
process.env.NODE_ENV = 'test';
process.env.SECRET_KEY = 'test-secret-key-for-unit-tests';

// Mock del modelo Transaction para evitar acceso a BD real
jest.mock('./statistics-model', () => {
  return jest.fn().mockImplementation((doc) => ({
    ...doc,
    save: jest.fn().mockResolvedValue({ _id: 'mock-id', ...doc })
  }));
});

const Transaction = require('./statistics-model');

describe('🔍 Unit Tests - Statistics Service Utils', () => {

  describe('transformSharedWithData - Normalización de participantes', () => {
    it('Debería transformar strings a objetos con amount 0', () => {
      const id1 = '64c9a1b2c3d4e5f60718293a';
      const result = transformSharedWithData([id1]);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('userId');
      expect(result[0]).toHaveProperty('amount', 0);
      // mongoose.ObjectId al convertir a string debe coincidir
      expect(result[0].userId.toString()).toBe(id1);
    });

    it('Debería mantener objetos válidos y forzar ObjectId en userId', () => {
      const id2 = '64c9a1b2c3d4e5f60718293b';
      const input = [{ userId: id2, amount: 12.5 }];
      const result = transformSharedWithData(input);
      expect(result).toHaveLength(1);
      expect(result[0].userId.toString()).toBe(id2);
      expect(result[0].amount).toBe(12.5);
    });
  });

  describe('createSharedTransactions - Creación de transacciones compartidas', () => {
    it('Debería crear una transacción por participante con split equal', async () => {
      const args = {
        name: 'Cena',
        type: 'expense',
        category: '64c9a1b2c3d4e5f607182940',
        value: 90,
        icon: 'utensils',
        clientId: '64c9a1b2c3d4e5f607182941',
        sharedWith: ['64c9a1b2c3d4e5f607182942', '64c9a1b2c3d4e5f607182943'],
        splitType: 'equal',
        customAmounts: {}
      };

      const res = await createSharedTransactions(args);

      // Se espera 3 transacciones (creador + 2 compartidos)
      expect(Transaction).toHaveBeenCalledTimes(3);
      expect(Array.isArray(res)).toBe(true);
      expect(res).toHaveLength(3);

      // Verificar que cada llamada incluye sharedWith completo
      const calls = Transaction.mock.calls;
      const firstCallArg = calls[0][0];
      expect(firstCallArg).toHaveProperty('sharedWith');
      expect(firstCallArg.sharedWith).toHaveLength(3);
      expect(firstCallArg).toHaveProperty('splitType', 'equal');
    });

    it('Debería crear una transaccion por participante con split custom', async () => {
      jest.clearAllMocks();
      const args = {
        name: 'Regalo',
        type: 'expense',
        category: '64c9a1b2c3d4e5f607182950',
        value: 100,
        icon: 'gift',
        clientId: '64c9a1b2c3d4e5f607182951',
        sharedWith: ['64c9a1b2c3d4e5f607182952'],
        splitType: 'custom',
        customAmounts: { '64c9a1b2c3d4e5f607182952': 30 }
      };

      await createSharedTransactions(args);
      const calls = Transaction.mock.calls;
      expect(calls).toHaveLength(2);
      // El creador debe tener value = 70 (100 - 30)
      const creatorDoc = calls.find(call => call[0].clientId === args.clientId)[0];
      expect(creatorDoc.value).toBe(70);
    });
  });

  describe('createIndividualTransaction - Creación de transacción individual', () => {
    it('Debería crear una transacción con isShared=false', async () => {
      jest.clearAllMocks();
      const args = {
        name: 'Taxi',
        type: 'expense',
        category: '64c9a1b2c3d4e5f607182960',
        value: 18.5,
        icon: 'car',
        clientId: '64c9a1b2c3d4e5f607182961'
      };

      const res = await createIndividualTransaction(args);
      expect(Transaction).toHaveBeenCalledTimes(1);
      const doc = Transaction.mock.calls[0][0];
      expect(doc).toMatchObject({
        name: 'Taxi',
        type: 'expense',
        category: '64c9a1b2c3d4e5f607182960',
        value: 18.5,
        icon: 'car',
      });
    });
  });

  
});
