const mongoose = require('mongoose');

const SubscriberSchema = new mongoose.Schema(
  {
    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      lowercase: true,
      trim:      true,
      maxlength: [100, 'Email too long'],
      match:     [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
      index:     true,
    },
    source: {
      type:    String,
      default: 'website',
      enum:    ['website', 'index', 'profile'],
      trim:    true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscriber', SubscriberSchema);
