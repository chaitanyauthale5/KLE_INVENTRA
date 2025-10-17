import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  hospital_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true, required: true },
  name: { type: String, required: true, trim: true },
  therapy_types: { type: [String], default: [] },
  capacity: { type: Number, default: 1, min: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  notes: { type: String, trim: true },
}, { timestamps: true });

export const Room = mongoose.model('Room', roomSchema);
