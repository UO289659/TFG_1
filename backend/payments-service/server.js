const express = require("express");
const cors = require("cors");
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken'); // ❌ FALTA: Agregar JWT
require('dotenv').config();
const {authMiddleware, ensurePremium} = require("../auth-middleware/index");
const User = require('./user-model');
const axios = require("axios");

// ❌ PROBLEMA CRÍTICO: Falta inicializar Stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

// ❌ PROBLEMA: El webhook debe ir ANTES de express.json()
// Stripe webhook necesita raw body
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
      await handleSuccessfulPayment(session);
      break;

    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      console.log('Invoice payment succeeded:', invoice.id);
      await handleSubscriptionRenewal(invoice);
      break;

    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      console.log('Subscription cancelled:', subscription.id);
      await handleSubscriptionCancellation(subscription);
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
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ [Payments Service] Conectado a MongoDB"))
  .catch((err) => console.error("❌ [Payments Service] Error al conectar:", err));

// ✅ VERIFICAR: Variables de entorno al iniciar
const requiredEnvVars = ['MONGO_URI', 'STRIPE_SECRET_KEY', 'SECRET_KEY'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Variable de entorno requerida no encontrada: ${varName}`);
    process.exit(1);
  }
});

console.log('✅ Variables de entorno verificadas');

// ✅ MEJORAR: Crear sesión de Stripe Checkout con mejor manejo de errores
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

    const user = await User.findById(userId);
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

// ✅ MEJORAR: Verificar pago con mejor manejo de errores
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

    const user = await User.findById(userId);
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

    // Actualizar usuario con el plan premium
    user.isPremium = true;
    user.planExpirationDate = expirationDate;
    user.subscriptionActive = true;
    user.stripeCustomerId = session.customer;
    user.stripeSubscriptionId = session.subscription;
    user.billingCycle = session.metadata.billingCycle;

    await user.save();

    console.log('✅ Usuario actualizado a Premium:', user.email);

    // Generar nuevo token con la información actualizada
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
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
        userId: user._id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        subscriptionActive: user.subscriptionActive,
        planExpirationDate: user.planExpirationDate
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

// ✅ Las funciones auxiliares permanecen igual...
async function handleSuccessfulPayment(session) {
  try {
    if (session.metadata && session.metadata.userId) {
      const user = await User.findById(session.metadata.userId).maxTimeMS(5000);
      if (user) {
        if (!user.subscriptionActive) {
          const expirationDate = new Date();
          if (session.metadata.billingCycle === 'monthly') {
            expirationDate.setMonth(expirationDate.getMonth() + 1);
          } else {
            expirationDate.setFullYear(expirationDate.getFullYear() + 1);
          }

          user.plan = session.metadata.plan;
          user.planExpirationDate = expirationDate;
          user.subscriptionActive = true;
          user.stripeCustomerId = session.customer;
          user.stripeSubscriptionId = session.subscription;
          user.billingCycle = session.metadata.billingCycle;

          await user.save();
        }
      }
    }
  } catch (error) {
    console.error('Error handling successful payment:', error);
  }
}

async function handleSubscriptionRenewal(invoice) {
  try {
    if (invoice.subscription_details && invoice.subscription_details.metadata) {
      const userId = invoice.subscription_details.metadata.userId;
      const user = await User.findById(userId).maxTimeMS(5000);
      
      if (user) {
        const expirationDate = new Date();
        if (user.billingCycle === 'monthly') {
          expirationDate.setMonth(expirationDate.getMonth() + 1);
        } else {
          expirationDate.setFullYear(expirationDate.getFullYear() + 1);
        }
        
        user.planExpirationDate = expirationDate;
        await user.save();
      }
    }
  } catch (error) {
    console.error('Error handling subscription renewal:', error);
  }
}

async function handleSubscriptionCancellation(subscription) {
  try {
    if (subscription.metadata && subscription.metadata.userId) {
      const user = await User.findById(subscription.metadata.userId).maxTimeMS(5000);
      if (user) {
        user.isPremium=false;
        user.billingCycle = null;
        user.planExpirationDate = null;
        user.stripeSubscriptionId=null;
        await user.save();

         const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        isPremium: false,
      },
      process.env.SECRET_KEY,
      { expiresIn: '24h' }
    );
      }
    }
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
  }
}

// Ruta para cancelar suscripción
app.post('/cancel-subscription', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).maxTimeMS(5000);

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

// ✅ AGREGAR: Ruta de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Payment Service',
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    stripe: !!stripe ? 'Configured' : 'Not configured'
  });
});

const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
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