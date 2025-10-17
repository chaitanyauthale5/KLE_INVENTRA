import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    hospital_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional link to User for patient portal
    assigned_doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    dob: { type: Date },
    gender: { type: String, enum: ['male','female','other'], default: 'other' },
    address: { type: String, trim: true },
    medical_history: { type: String, trim: true },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

export const Patient = mongoose.model('Patient', patientSchema);
