const mongoose = require('mongoose');
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