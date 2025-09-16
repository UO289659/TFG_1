/**
 * @fileoverview Payment Service - Servicio de pagos con Stripe y Socket.IO
 * @description Microservicio que maneja las suscripciones premium, webhooks de Stripe
 * y notificaciones en tiempo real a través de Socket.IO
 * @author Carmen Espinosa Martínez
 * @version 1.0.0 
 */
const express = require("express"); 
const cors = require("cors");
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken'); 
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();
const {authMiddleware, ensurePremium} = require("./auth-middleware/index");

const axios = require("axios");


const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const server = http.createServer(app);

// Configurar Socket.IO con CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const userConnections = new Map();

/**
 * Middleware para autenticar conexiones Socket.IO
 * Verifica el token JWT en el handshake de la conexión
 */
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    socket.userId = decoded.userId || decoded.id;
    socket.userEmail = decoded.email;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Invalid token'));
  }
});


/**
 * @typedef {Object} UserData
 * @property {string} id - ID del usuario
 * @property {string} email - Email del usuario
 * @property {string} name - Nombre del usuario
 * @property {boolean} isPremium - Si el usuario tiene suscripción premium
 * @property {boolean} subscriptionActive - Si la suscripción está activa
 * @property {Date} planExpirationDate - Fecha de expiración del plan
 */

/**
 * @typedef {Object} TokenUpdateData
 * @property {string} token - Nuevo token JWT
 * @property {UserData} user - Datos del usuario actualizados
 */

/**
 * Manejo de conexiones Socket.IO
 * Gestiona la conexión, desconexión y actualización de tokens en tiempo real
 */
io.on('connection', (socket) => {
  console.log(`🔌 Usuario conectado: ${socket.userEmail} (${socket.userId})`);
  
  // Guardar la conexión del usuario
  userConnections.set(socket.userId, socket);

  // Evento para actualizar token
  socket.on('request-token-update', async () => {
    try {
      const userResponse = await axios.get(`${process.env.USER_SERVICE_URL}/users/${socket.userId}`, {
        headers: {
           'x-internal-api-key': process.env.INTERNAL_API_KEY
        }
      });
      const user = userResponse.data;
      
      if (user) {
        const newToken = jwt.sign(
          { 
            userId: user.id, 
            email: user.email, 
            isPremium: user.isPremium || false,
          },
          process.env.SECRET_KEY,
          { expiresIn: '24h' }
        );
        
        socket.emit('token-updated', { 
          token: newToken,
          user: {
            userId: user.id,
            email: user.email,
            name: user.name,
            isPremium: user.isPremium || false,
            subscriptionActive: user.subscriptionActive || false,
            planExpirationDate: user.planExpirationDate
          }
        });
      }
    } catch (error) {
      console.error('Error updating token:', error);
      socket.emit('token-update-error', { error: 'Error updating token' });
    }
  });

  // Limpiar conexión cuando el usuario se desconecta
  socket.on('disconnect', () => {
    console.log(`🔌 Usuario desconectado: ${socket.userEmail} (${socket.userId})`);
    userConnections.delete(socket.userId);
  });
});

/**
 * Función para notificar actualización de token a un usuario específico
 * @async
 * @function notifyTokenUpdate
 * @param {string} userId - ID del usuario a notificar
 * @returns {Promise<void>}
 * @description Envía un token actualizado a un usuario conectado específico
 */
const notifyTokenUpdate = async (userId) => {
  const socket = userConnections.get(userId);
  if (socket) {
    try {
      const userResponse = await axios.get(`${process.env.USER_SERVICE_URL}/users/${userId}`, {
        headers: {
          'x-internal-api-key': process.env.INTERNAL_API_KEY
        }
      });
      const user = userResponse.data;
      
      if (user) {
        const newToken = jwt.sign(
          { 
            userId: user.id, 
            email: user.email, 
            isPremium: user.isPremium || false,
          },
          process.env.SECRET_KEY,
          { expiresIn: '24h' }
        );
        
        socket.emit('token-updated', { 
          token: newToken,
          user: {
            userId: user.id,
            email: user.email,
            name: user.name,
            isPremium: user.isPremium || false,
            subscriptionActive: user.subscriptionActive || false,
            planExpirationDate: user.planExpirationDate
          }
        });
        
        console.log(`✅ Token actualizado enviado a usuario: ${user.email}`);
      }
    } catch (error) {
      console.error('Error notifying token update:', error);
    }
  }
};

/**
 * @typedef {Object} StripeEvent
 * @property {string} type - Tipo de evento de Stripe
 * @property {Object} data - Datos del evento
 * @property {Object} data.object - Objeto principal del evento
 */

/**
 * Webhook de Stripe
 * @route POST /webhook
 * @description Maneja los webhooks de Stripe para eventos de pago y suscripción
 * @param {express.Request} req - Request object (raw body)
 * @param {express.Response} res - Response object
 */
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Manejar diferentes tipos de eventos
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Checkout session completed:', session.id);
      await handleSuccessfulPayment(req, session);
      break;

    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      console.log('Invoice payment succeeded:', invoice.id);
      await handleSubscriptionRenewal(req, invoice);
      break;

    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      console.log('Subscription cancelled:', subscription.id);
      const cancelledUserId = await handleSubscriptionCancellation(req, subscription);
      if (cancelledUserId) {
        await notifyTokenUpdate(cancelledUserId);
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});

// ✅ AHORA sí aplicar middlewares
app.use(cors());
app.use(express.json());

// ✅ MEJORAR: Conexión a MongoDB con mejor manejo de errores
mongoose
  .connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ [Payments Service] Conectado a MongoDB"))
  .catch((err) => console.error("❌ [Payments Service] Error al conectar:", err));

// ✅ VERIFICAR: Variables de entorno al iniciar
const requiredEnvVars = ['MONGO_URI', 'STRIPE_SECRET_KEY', 'SECRET_KEY', 'USER_SERVICE_URL'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Variable de entorno requerida no encontrada: ${varName}`);
    process.exit(1);
  }
});

console.log('✅ Variables de entorno verificadas');

/**
 * @typedef {Object} CheckoutRequest
 * @property {string} priceId - ID del precio en Stripe
 * @property {string} billingCycle - Ciclo de facturación ('monthly' | 'yearly')
 * @property {string} plan - Nombre del plan
 */

/**
 * @typedef {Object} CheckoutResponse
 * @property {string} sessionId - ID de la sesión de checkout
 */

/**
 * Crear sesión de Stripe Checkout
 * @route POST /create-checkout-session
 * @middleware authMiddleware
 * @param {express.Request<{}, CheckoutResponse, CheckoutRequest>} req - Request con datos del checkout
 * @param {express.Response<CheckoutResponse>} res - Response con sessionId
 * @returns {Promise<void>}
 * @description Crea una sesión de pago en Stripe para suscripción premium
 */
app.post('/create-checkout-session', authMiddleware, async (req, res) => {
  try {
    const { priceId, billingCycle, plan } = req.body;
    const userId = req.user.id;

    console.log('📝 Creando sesión para usuario:', userId);
    console.log('📝 Datos recibidos:', { priceId, billingCycle, plan });

    // Validar datos requeridos
    if (!priceId || !billingCycle || !plan) {
      return res.status(400).json({ 
        error: 'Faltan datos requeridos: priceId, billingCycle, plan' 
      });
    }

    console.log('Mongoose readyState at request time:', mongoose.connection.readyState);

    // Obtener usuario vía user-service
    const userResponse = await axios.get(`${process.env.USER_SERVICE_URL}/users/${userId}`, {
      headers: {
        Authorization: req.headers.authorization, // reenvías el token JWT
      }
    });
    const user = userResponse.data;
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log('👤 Usuario encontrado:', user.email);

    // URLs de redirección
    const YOUR_DOMAIN = process.env.FRONTEND_URL || 'http://localhost:3000';

    // ✅ VERIFICAR: Que Stripe esté inicializado
    if (!stripe) {
      console.error('❌ Stripe no está inicializado');
      return res.status(500).json({ error: 'Stripe no configurado' });
    }

    // Crear sesión de Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${YOUR_DOMAIN}/subscribe?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${YOUR_DOMAIN}/subscribe?cancelled=true`,
      customer_email: user.email,
      metadata: {
        userId: userId.toString(), // ✅ IMPORTANTE: Convertir a string
        plan: plan,
        billingCycle: billingCycle
      },
      subscription_data: {
        metadata: {
          userId: userId.toString(), // ✅ IMPORTANTE: Convertir a string
          plan: plan,
          billingCycle: billingCycle
        }
      }
    });

    console.log('✅ Sesión creada exitosamente:', session.id);
    res.json({ sessionId: session.id });

  } catch (error) {
    console.error('❌ Error creando sesión de checkout:', error);
    
    // ✅ MEJORAR: Manejo específico de errores
    if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
      return res.status(503).json({ 
        error: 'Error de conexión a base de datos. Intenta de nuevo.' 
      });
    }
    
    if (error.type === 'StripeError') {
      return res.status(400).json({ 
        error: 'Error de Stripe: ' + error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @typedef {Object} PaymentVerificationRequest
 * @property {string} sessionId - ID de la sesión de Stripe
 */

/**
 * @typedef {Object} PaymentVerificationResponse
 * @property {boolean} success - Si la verificación fue exitosa
 * @property {string} message - Mensaje de confirmación
 * @property {string} token - Nuevo token JWT
 * @property {UserData} user - Datos del usuario actualizados
 */

/**
 * Verificar pago completado
 * @route POST /verify-payment
 * @middleware authMiddleware
 * @param {express.Request<{}, PaymentVerificationResponse, PaymentVerificationRequest>} req - Request con sessionId
 * @param {express.Response<PaymentVerificationResponse>} res - Response con confirmación
 * @returns {Promise<void>}
 * @description Verifica que el pago se completó y actualiza el usuario a premium
 */
app.post('/verify-payment', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId requerido' });
    }

    console.log('🔍 Verificando pago para sesión:', sessionId);

    // Obtener la sesión de Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'El pago no se completó exitosamente' });
    }

    // Verificar que la sesión pertenece al usuario
    if (session.metadata.userId !== userId.toString()) {
      return res.status(403).json({ error: 'Sesión no válida para este usuario' });
    }

    // Obtener usuario vía user-service
    const userResponse = await axios.get(`${process.env.USER_SERVICE_URL}/users/${userId}`, {
      headers: {
        Authorization: req.headers.authorization, // reenvías el token JWT
      }
    });
    const user = userResponse.data;
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Calcular fecha de expiración
    const expirationDate = new Date();
    if (session.metadata.billingCycle === 'monthly') {
      expirationDate.setMonth(expirationDate.getMonth() + 1);
    } else {
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    }

    // Actualizar usuario vía user-service
    const updateResponse = await axios.patch(`${process.env.USER_SERVICE_URL}/users/${userId}`, {
      isPremium: true,
      planExpirationDate: expirationDate,
      subscriptionActive: true,
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      billingCycle: session.metadata.billingCycle
    }, {
      headers: {
        Authorization: req.headers.authorization, // reenvías el token JWT
      }
    });

    const updatedUser = updateResponse.data.user;
    console.log('✅ Usuario actualizado a Premium:', updatedUser.email);

    // Generar nuevo token con la información actualizada
    const token = jwt.sign(
      { 
        userId: updatedUser.id, 
        email: updatedUser.email, 
        isPremium: true,
      },
      process.env.SECRET_KEY,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Suscripción activada exitosamente',
      token: token,
      user: {
        userId: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        subscriptionActive: updatedUser.subscriptionActive,
        planExpirationDate: updatedUser.planExpirationDate
      }
    });

  } catch (error) {
    console.error('❌ Error verificando pago:', error);
    
    if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
      return res.status(503).json({ 
        error: 'Error de conexión a base de datos. Intenta de nuevo.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Maneja el pago exitoso desde webhook de Stripe
 * @async
 * @function handleSuccessfulPayment
 * @param {express.Request} req - Request object
 * @param {Object} session - Sesión de checkout de Stripe
 * @returns {Promise<void>}
 * @description Procesa un pago exitoso y actualiza el usuario a premium
 */
async function handleSuccessfulPayment(req, session) {
  try {
    if (session.metadata && session.metadata.userId) {
      const userId = session.metadata.userId;
      // Calcular fecha de expiración
      const expirationDate = new Date();
      if (session.metadata.billingCycle === 'monthly') {
        expirationDate.setMonth(expirationDate.getMonth() + 1);
      } else {
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      }

      // Actualizar usuario vía user-service
      await axios.patch(`${process.env.USER_SERVICE_URL}/users/${userId}`, {
        isPremium: true,
        planExpirationDate: expirationDate,
        subscriptionActive: true,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        billingCycle: session.metadata.billingCycle,
        plan: session.metadata.plan
      }, {
        headers: {
          'x-internal-api-key': process.env.INTERNAL_API_KEY
        }
      });
    }
  } catch (error) {
    console.error('Error handling successful payment:', error);
  }
}

/**
 * Maneja la renovación de suscripción desde webhook de Stripe
 * @async
 * @function handleSubscriptionRenewal
 * @param {express.Request} req - Request object
 * @param {Object} invoice - Factura de Stripe
 * @returns {Promise<void>}
 * @description Procesa la renovación de una suscripción y extiende la fecha de expiración
 */
async function handleSubscriptionRenewal(req, invoice) {
  try {
    if (invoice.subscription_details && invoice.subscription_details.metadata) {
      const userId = invoice.subscription_details.metadata.userId;

      // Obtener usuario para saber el billingCycle
      const userResponse = await axios.get(`${process.env.USER_SERVICE_URL}/users/${userId}`, {
        headers: {
          'x-internal-api-key': process.env.INTERNAL_API_KEY
        }
      });
      const user = userResponse.data;

      const expirationDate = new Date();
      if (user.billingCycle === 'monthly') {
        expirationDate.setMonth(expirationDate.getMonth() + 1);
      } else {
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      }

      await axios.patch(`${process.env.USER_SERVICE_URL}/users/${userId}`, {
        planExpirationDate: expirationDate
      }, {
        headers: {
          'x-internal-api-key': process.env.INTERNAL_API_KEY
        }
      });
    }
  } catch (error) {
    console.error('Error handling subscription renewal:', error);
  }
}

/**
 * Maneja la cancelación de suscripción desde webhook de Stripe
 * @async
 * @function handleSubscriptionCancellation
 * @param {express.Request} req - Request object
 * @param {Object} subscription - Suscripción de Stripe
 * @returns {Promise<string|void>} - ID del usuario cancelado o void
 * @description Procesa la cancelación de una suscripción y revierte el usuario a free
 */
async function handleSubscriptionCancellation(req, subscription) {
  try {
    if (subscription.metadata && subscription.metadata.userId) {
      const userId = subscription.metadata.userId;

      await axios.patch(`${process.env.USER_SERVICE_URL}/users/${userId}`, {
        isPremium: false,
        billingCycle: null,
        planExpirationDate: null,
        stripeSubscriptionId: null
      }, {
        headers: {
          'x-internal-api-key': process.env.INTERNAL_API_KEY
        }
      });

      await axios.patch(`${process.env.USER_SERVICE_URL}/delete-all-friends/${userId}`, {},{
         headers: {
          'x-internal-api-key': process.env.INTERNAL_API_KEY
        }
      })

      return userId;
    }
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
  }
}

/**
 * @typedef {Object} CancellationResponse
 * @property {boolean} success - Si la cancelación fue exitosa
 * @property {string} message - Mensaje de confirmación
 */

/**
 * Cancelar suscripción
 * @route POST /cancel-subscription
 * @middleware authMiddleware
 * @param {express.Request<{}, CancellationResponse, {}>} req - Request object
 * @param {express.Response<CancellationResponse>} res - Response con confirmación
 * @returns {Promise<void>}
 * @description Cancela la suscripción del usuario al final del período actual
 */
app.post('/cancel-subscription', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obtener usuario vía user-service
    const userResponse = await axios.get(`${process.env.USER_SERVICE_URL}/users/${userId}`, {
      headers: {
        Authorization: req.headers.authorization, // reenvías el token JWT
      }
    });
    const user = userResponse.data;

    if (!user || !user.stripeSubscriptionId) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }

    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true
    });

    res.json({ 
      success: true, 
      message: 'Suscripción cancelada. Se mantendrá activa hasta el final del período actual.' 
    });

  } catch (error) {
    console.error('Error cancelando suscripción:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

/**
 * @typedef {Object} HealthCheckResponse
 * @property {string} status - Estado del servicio
 * @property {string} service - Nombre del servicio
 * @property {string} mongodb - Estado de conexión a MongoDB
 * @property {string} stripe - Estado de configuración de Stripe
 */

/**
 * Health check del servicio
 * @route GET /health
 * @param {express.Request} req - Request object
 * @param {express.Response<HealthCheckResponse>} res - Response con estado del servicio
 * @returns {void}
 * @description Verifica el estado del servicio y sus dependencias
 */

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Payment Service',
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    stripe: !!stripe ? 'Configured' : 'Not configured'
  });
});

const PORT = process.env.PORT || 5003;
server.listen(PORT, () => {
  console.log(`🚀 Payment service corriendo en puerto ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});

// ✅ AGREGAR: Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
module.exports = app;