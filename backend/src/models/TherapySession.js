import mongoose from 'mongoose';

const therapySessionSchema = new mongoose.Schema(
  {
    hospital_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
    patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', index: true },
    doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // therapist_id removed - therapists no longer exist
    status: { type: String, enum: ['scheduled','completed','cancelled'], default: 'scheduled', index: true },
    scheduled_at: { type: Date, required: true, index: true },
    duration_min: { type: Number, default: 60 },
    notes: { type: String, trim: true },
    approvals: {
      doctor_approved: { type: Boolean, default: false },
      admin_approved: { type: Boolean, default: false },
    },
    outcomes: {
      completed_at: { type: Date },
      observations: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

export const TherapySession = mongoose.model('TherapySession', therapySessionSchema);
