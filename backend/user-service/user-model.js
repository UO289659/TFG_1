/**
 * @file user-service/user-model.js
 * @description Modelo Mongoose que representa a un usuario de la aplicación,
 * incluyendo información de autenticación, suscripción, y lista de amigos.
 */
const mongoose = require('mongoose');
/**
 * Esquema que representa un usuario de la aplicación.
 *
 * @typedef User
 * @property {String} name - Nombre del usuario.
 * @property {String} surname - Apellido del usuario.
 * @property {String} email - Correo electrónico único del usuario.
 * @property {String} password - Contraseña del usuario (encriptada en la lógica de negocio).
 * @property {Boolean} isPremium - Indica si el usuario tiene suscripción premium.
 * @property {String} [resetToken] - Token para restablecer la contraseña.
 * @property {Date} [resetTokenExpiration] - Fecha de expiración del token de restablecimiento.
 * @property {Date|null} [planExpirationDate] - Fecha de expiración del plan premium.
 * @property {"monthly"|"yearly"|null} [billingCycle] - Ciclo de facturación de la suscripción.
 * @property {String|null} [stripeCustomerId] - ID del cliente en Stripe.
 * @property {String|null} [stripeSubscriptionId] - ID de la suscripción en Stripe.
 * @property {Array.<Friend>} [friends] - Lista de amigos del usuario.
 */
const UserSchema = new mongoose.Schema({
    name:String,
    surname: String,
    email: { type: String, unique: true },
    password: String,
    isPremium: Boolean,
    resetToken: String,
    resetTokenExpiration: Date,
     planExpirationDate: {
        type: Date,
        default: null
    },
      billingCycle: {
        type: String,
        enum: ['monthly', 'yearly'],
        default: null
    },
     stripeCustomerId: {
        type: String,
        default: null
    },
    
    stripeSubscriptionId: {
        type: String,
        default: null
    },
     friends: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        friendSince: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['active'],
            default: 'active'
        }
    }],
}, 
  );

const User = mongoose.model('User', UserSchema);
module.exports = User