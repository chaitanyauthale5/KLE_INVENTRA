import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    hospital_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
    patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    staff_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // doctor
    type: { type: String, enum: ['doctor'], required: true },
    start_time: { type: Date, required: true },
    end_time: { type: Date, required: true },
    status: { type: String, enum: ['pending','confirmed','completed','cancelled'], default: 'pending' },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Appointment = mongoose.model('Appointment', appointmentSchema);
