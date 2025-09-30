/**
 * @file user-service/friends-equests-model.js
 * @description Modelo Mongoose para gestionar las solicitudes de amistad entre usuarios.
 */
const mongoose = require('mongoose');

/**
 * Esquema que representa una solicitud de amistad entre dos usuarios.
 *
 * @typedef FriendsRequest
 * @property {ObjectId} senderId - Usuario que envía la solicitud de amistad. (Requerido)
 * @property {ObjectId} receiverId - Usuario que recibe la solicitud de amistad. (Requerido)
 * @property {"pending"|"accepted"|"rejected"} status - Estado de la solicitud de amistad. (Por defecto: `pending`)
 * @property {Date} createdAt - Fecha de creación de la solicitud. (Por defecto: fecha actual)
 */
const FriendsRequestSchema = new mongoose.Schema({
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', // Referencia al modelo User
    required: true 
  },
  receiverId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending' 
  },
    createdAt: { type: Date, default: Date.now },
   
  });

const FriendsRequest = mongoose.model('FriendsRequest', FriendsRequestSchema);
module.exports = FriendsRequest