const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
    name:String,
    surname: String,
    email: { type: String, unique: true },
    password: String,
    isPremium: Boolean,
    resetToken: String,
    resetTokenExpiration: Date,
  });

const User = mongoose.model('User', UserSchema);
module.exports = User