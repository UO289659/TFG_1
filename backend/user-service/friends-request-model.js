const mongoose = require('mongoose');
const FriendsRequestSchema = new mongoose.Schema({
    sender:String,
    receiver: String,
    status: { type: String, enum: ["pending", "accepted", "rejected"], required: true },
    createdAt: { type: Date, default: Date.now },
   
  });

const FriendsRequest = mongoose.model('FriendsRequest', FriendsRequestSchema);
module.exports = FriendsRequest