import mongoose from 'mongoose';

const patientFeedbackSchema = new mongoose.Schema(
  {
    hospital_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5, required: true, index: true },
    comment: { type: String, trim: true },
    created_at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

patientFeedbackSchema.index({ hospital_id: 1, created_at: -1 });
patientFeedbackSchema.index({ hospital_id: 1, rating: -1 });

export const PatientFeedback = mongoose.model('PatientFeedback', patientFeedbackSchema);
