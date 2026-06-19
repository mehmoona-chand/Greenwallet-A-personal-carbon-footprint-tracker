// models/Calculation.js
// Carbon calculation entry with strict validation

const mongoose = require('mongoose');

const CalculationSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },

    totalCO2: {
      type:     Number,
      required: true,
      min:      [0,    'CO₂ cannot be negative'],
      max:      [5000, 'CO₂ value seems unrealistically high'],
    },

    categories: {
      car:             { type: Number, default: 0, min: 0 },
      publicTransport: { type: Number, default: 0, min: 0 },
      meals:           { type: Number, default: 0, min: 0 },
      electricity:     { type: Number, default: 0, min: 0 },
      flights:         { type: Number, default: 0, min: 0 },
      waste:           { type: Number, default: 0, min: 0 },
    },

    inputs: {
      carKm:          { type: Number, default: 0, min: 0, max: 2000 },
      publicKm:       { type: Number, default: 0, min: 0, max: 2000 },
      mealsCount:     { type: Number, default: 0, min: 0, max: 20   },
      dietType:       { type: String, enum: ['meat','mixed','vegetarian','vegan'], default: 'mixed' },
      electricityKwh: { type: Number, default: 0, min: 0, max: 500  },
      flightsPerYear: { type: Number, default: 0, min: 0, max: 365  },
      wasteKgPerWeek: { type: Number, default: 0, min: 0, max: 200  },
    },

    treesPerYear: { type: Number, default: 0, min: 0 },
    aiTip:        { type: String,  default: '', maxlength: 2000 },
    date:         { type: String,  default: () => new Date().toLocaleDateString() },
  },
  { timestamps: true }
);

// Index for efficient user history queries
CalculationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Calculation', CalculationSchema);
