import mongoose from 'mongoose';

const equipmentSchema = new mongoose.Schema({
  hospital_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true, required: true },
  name: { type: String, required: true, trim: true },
  quantity: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['available','unavailable','maintenance'], default: 'available', index: true },
  notes: { type: String, trim: true },
}, { timestamps: true });

export const Equipment = mongoose.model('Equipment', equipmentSchema);
