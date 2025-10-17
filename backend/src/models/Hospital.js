import mongoose from 'mongoose';

const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

export const Hospital = mongoose.model('Hospital', hospitalSchema);
