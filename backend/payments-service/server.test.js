const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Define clientId ANTES del mock
const clientId = '507f1f77bcf86cd799439011';

// Mock de Stripe - FIXED: Should be a function that returns the stripe instance
jest.mock('stripe', () => {
  const mockStripe = {
    checkout: {
      sessions: {
        create: jest.fn(),
        retrieve: jest.fn(),
      },
    },
    subscriptions: {
      update: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  };
  
  // Return a function that returns the mock instance
  return jest.fn(() => mockStripe);
});

// Mocks
jest.mock('axios');

jest.mock('./auth-middleware/index', () => ({
  authMiddleware: (req, res, next) => {
    req.user = { id: '507f1f77bcf86cd799439011' };
    next();
  },
  ensurePremium: (req, res, next) => next()
}));

// Mock de Socket.IO
jest.mock('socket.io', () => {
  return jest.fn(() => ({
    use: jest.fn(),
    on: jest.fn(),
    emit: jest.fn(),
  }));
});

// Mock de variables de entorno
process.env.MONGO_URI = 'mongodb://localhost:27017/test';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key';
process.env.SECRET_KEY = 'test_secret_key';
process.env.USER_SERVICE_URL = 'http://localhost:5001';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
process.env.INTERNAL_API_KEY = 'test_internal_key';

let mongoServer;
let app;
let stripe;

// Datos de prueba
const mockUser = {
  id: clientId,
  email: 'test@example.com',
  name: 'Test User',
  isPremium: false,
  subscriptionActive: false,
  planExpirationDate: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  billingCycle: null
};

const mockPremiumUser = {
  ...mockUser,
  isPremium: true,
  subscriptionActive: true,
  planExpirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
  stripeCustomerId: 'cus_test_customer',
  stripeSubscriptionId: 'sub_test_subscription',
  billingCycle: 'monthly'
};

const mockCheckoutSession = {
  id: 'cs_test_session',
  payment_status: 'paid',
  customer: 'cus_test_customer',
  subscription: 'sub_test_subscription',
  metadata: {
    userId: clientId,
    plan: 'premium',
    billingCycle: 'monthly'
  }
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGO_URI = mongoUri;
  
  // Conectar a la base de datos
  await mongoose.connect(mongoUri);
  
  // Importar la app después de configurar la base de datos
  app = require('./server');
  
  // Obtener la instancia de Stripe del mock
  const stripeModule = require('stripe');
  stripe = stripeModule(); // This should now work with the fixed mock
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('Payment Server Tests', () => {
  describe('POST /create-checkout-session', () => {
    beforeEach(() => {
      // Mock axios response para obtener usuario
      axios.get.mockResolvedValue({
        data: mockUser
      });
    });

    it('should create checkout session successfully', async () => {
      const mockSession = {
        id: 'cs_test_session_new',
        url: 'https://checkout.stripe.com/pay/cs_test_session_new'
      };

      stripe.checkout.sessions.create.mockResolvedValue(mockSession);

      const requestData = {
        priceId: 'price_test_premium_monthly',
        billingCycle: 'monthly',
        plan: 'premium'
      };

      const res = await request(app)
        .post('/create-checkout-session')
        .send(requestData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('sessionId', mockSession.id);
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method_types: ['card'],
          line_items: [
            {
              price: requestData.priceId,
              quantity: 1,
            },
          ],
          mode: 'subscription',
          customer_email: mockUser.email,
          metadata: {
            userId: clientId,
            plan: requestData.plan,
            billingCycle: requestData.billingCycle
          }
        })
      );
    });
     it('should return 400 if required fields are missing: priceId', async () => {
      const res = await request(app)
        .post('/create-checkout-session')
        .send({
           //priceId
        billingCycle: 'monthly',
        plan: 'premium'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Faltan datos requeridos: priceId, billingCycle, plan');
    });

    it('should return 400 if required fields are missing: billingCycle', async () => {
      const res = await request(app)
        .post('/create-checkout-session')
        .send({
          priceId: 'price_test_premium_monthly',
          // billingCycle 
          plan: 'premium'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Faltan datos requeridos: priceId, billingCycle, plan');
    });
     it('should return 400 if required fields are missing: plan', async () => {
      const res = await request(app)
        .post('/create-checkout-session')
        .send({
          priceId: 'price_test_premium_monthly',
        billingCycle: 'monthly',
          // plan
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Faltan datos requeridos: priceId, billingCycle, plan');
    });

    it('should return 404 if user not found', async () => {
      axios.get.mockResolvedValue({
        data: null
      });

      const requestData = {
        priceId: 'price_test_premium_monthly',
        billingCycle: 'monthly',
        plan: 'premium'
      };

      const res = await request(app)
        .post('/create-checkout-session')
        .send(requestData);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Usuario no encontrado');
    });

    it('should handle Stripe errors', async () => {
      const stripeError = new Error('Invalid price ID');
      stripeError.type = 'StripeError';
      stripe.checkout.sessions.create.mockRejectedValue(stripeError);

      const requestData = {
        priceId: 'price_invalid',
        billingCycle: 'monthly',
        plan: 'premium'
      };

      const res = await request(app)
        .post('/create-checkout-session')
        .send(requestData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Error de Stripe: Invalid price ID');
    });
  });

  describe('POST /verify-payment', () => {
    beforeEach(() => {
      // Mock axios responses
      axios.get.mockResolvedValue({
        data: mockUser
      });
      
      axios.patch.mockResolvedValue({
        data: {
          user: mockPremiumUser
        }
      });
    });

    it('should verify payment successfully', async () => {
      stripe.checkout.sessions.retrieve.mockResolvedValue(mockCheckoutSession);

      const res = await request(app)
        .post('/verify-payment')
        .send({
          sessionId: 'cs_test_session'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Suscripción activada exitosamente');
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('subscriptionActive', true);
      
      // Verificar que se actualizó el usuario
      expect(axios.patch).toHaveBeenCalledWith(
        `${process.env.USER_SERVICE_URL}/users/${clientId}`,
        expect.objectContaining({
          isPremium: true,
          subscriptionActive: true,
          stripeCustomerId: mockCheckoutSession.customer,
          stripeSubscriptionId: mockCheckoutSession.subscription,
          billingCycle: mockCheckoutSession.metadata.billingCycle
        }),
        expect.any(Object)
      );
    });

    it('should return 400 if sessionId is missing', async () => {
      const res = await request(app)
        .post('/verify-payment')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('sessionId requerido');
    });

    it('should return 400 if payment is not completed', async () => {
      stripe.checkout.sessions.retrieve.mockResolvedValue({
        ...mockCheckoutSession,
        payment_status: 'unpaid'
      });

      const res = await request(app)
        .post('/verify-payment')
        .send({
          sessionId: 'cs_test_session'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('El pago no se completó exitosamente');
    });

    it('should return 403 if session does not belong to user', async () => {
      stripe.checkout.sessions.retrieve.mockResolvedValue({
        ...mockCheckoutSession,
        metadata: {
          ...mockCheckoutSession.metadata,
          userId: 'different_user_id'
        }
      });

      const res = await request(app)
        .post('/verify-payment')
        .send({
          sessionId: 'cs_test_session'
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Sesión no válida para este usuario');
    });
    // Añadir este test case dentro del describe('POST /verify-payment', () => {})
// después del test "should return 403 if session does not belong to user"

it('should return 404 if user not found', async () => {
  // Mock successful session retrieval
  stripe.checkout.sessions.retrieve.mockResolvedValue(mockCheckoutSession);
  
  // Mock axios response para usuario no encontrado
  axios.get.mockResolvedValue({
    data: null // Usuario no encontrado
  });

  const res = await request(app)
    .post('/verify-payment')
    .send({
      sessionId: 'cs_test_session'
    });

  expect(res.status).toBe(404);
  expect(res.body.error).toBe('Usuario no encontrado');
 
  
  // Verificar que NO se intentó actualizar el usuario
  expect(axios.patch).not.toHaveBeenCalled();
});
    
  });

  describe('POST /cancel-subscription', () => {
    beforeEach(() => {
      axios.get.mockResolvedValue({
        data: mockPremiumUser
      });
    });

    it('should cancel subscription successfully', async () => {
      stripe.subscriptions.update.mockResolvedValue({
        id: 'sub_test_subscription',
        cancel_at_period_end: true
      });

      const res = await request(app)
        .post('/cancel-subscription');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Suscripción cancelada. Se mantendrá activa hasta el final del período actual.');
      
      expect(stripe.subscriptions.update).toHaveBeenCalledWith(
        mockPremiumUser.stripeSubscriptionId,
        { cancel_at_period_end: true }
      );
    });

    it('should return 404 if user has no subscription', async () => {
      axios.get.mockResolvedValue({
        data: mockUser // Usuario sin suscripción
      });

      const res = await request(app)
        .post('/cancel-subscription');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Suscripción no encontrada');
    });

    it('should return 404 if user not found', async () => {
      axios.get.mockResolvedValue({
        data: null
      });

      const res = await request(app)
        .post('/cancel-subscription');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Suscripción no encontrada');
    });

    it('should handle Stripe errors', async () => {
      const stripeError = new Error('Subscription not found');
      stripe.subscriptions.update.mockRejectedValue(stripeError);

      const res = await request(app)
        .post('/cancel-subscription');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Error interno del servidor');
    });
  });

  describe('POST /webhook', () => {
    beforeEach(() => {
      // Mock axios para las operaciones del webhook
      axios.get.mockResolvedValue({
        data: mockUser
      });
      
      axios.patch.mockResolvedValue({
        data: {
          user: mockPremiumUser
        }
      });
    });

    it('should handle checkout.session.completed event', async () => {
      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_session',
            customer: 'cus_test_customer',
            subscription: 'sub_test_subscription',
            metadata: {
              userId: clientId,
              plan: 'premium',
              billingCycle: 'monthly'
            }
          }
        }
      };

      stripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const res = await request(app)
        .post('/webhook')
        .set('stripe-signature', 'test_signature')
        .send('raw_body');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('received', true);
      expect(stripe.webhooks.constructEvent).toHaveBeenCalled();
    });

    it('should handle invalid webhook signature', async () => {
      const signatureError = new Error('Invalid signature');
      stripe.webhooks.constructEvent.mockImplementation(() => {
        throw signatureError;
      });

      const res = await request(app)
        .post('/webhook')
        .set('stripe-signature', 'invalid_signature')
        .send('raw_body');

      expect(res.status).toBe(400);
      expect(res.text).toContain('Webhook Error: Invalid signature');
    });

    it('should handle customer.subscription.deleted event', async () => {
      const mockEvent = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_subscription',
            metadata: {
              userId: clientId
            }
          }
        }
      };

      stripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const res = await request(app)
        .post('/webhook')
        .set('stripe-signature', 'test_signature')
        .send('raw_body');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('received', true);
      
      // Verificar que se actualizó el usuario para cancelar la suscripción
      expect(axios.patch).toHaveBeenCalledWith(
        `${process.env.USER_SERVICE_URL}/users/${clientId}`,
        expect.objectContaining({
          isPremium: false,
          billingCycle: null,
          planExpirationDate: null,
          stripeSubscriptionId: null
        }),
        expect.any(Object)
      );
    });

    it('should handle unknown event types', async () => {
      const mockEvent = {
        type: 'unknown.event.type',
        data: {
          object: {}
        }
      };

      stripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const res = await request(app)
        .post('/webhook')
        .set('stripe-signature', 'test_signature')
        .send('raw_body');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('received', true);
    });
  });

  describe('Error Handling', () => {
    it('should handle axios errors in create-checkout-session', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      const requestData = {
        priceId: 'price_test_premium_monthly',
        billingCycle: 'monthly',
        plan: 'premium'
      };

      const res = await request(app)
        .post('/create-checkout-session')
        .send(requestData);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Error interno del servidor');
    });

    it('should handle database connection errors', async () => {
      // Simular error de conexión a base de datos
      const mongoError = new Error('buffering timed out');
      mongoError.name = 'MongooseError';
      
      axios.get.mockRejectedValue(mongoError);

      const requestData = {
        priceId: 'price_test_premium_monthly',
        billingCycle: 'monthly',
        plan: 'premium'
      };

      const res = await request(app)
        .post('/create-checkout-session')
        .send(requestData);

      expect(res.status).toBe(503);
      expect(res.body.error).toBe('Error de conexión a base de datos. Intenta de nuevo.');
    });
  });
});