const mongoose = require('mongoose');
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
            enum: ['active', 'blocked'],
            default: 'active'
        }
    }],
}, 
  );

const User = mongoose.model('User', UserSchema);
module.exports = User