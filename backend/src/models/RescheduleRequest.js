import mongoose from 'mongoose';

const RescheduleRequestSchema = new mongoose.Schema({
  hospital_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  session_id: { type: mongoose.Schema.Types.ObjectId, ref: 'TherapySession', required: true, index: true },
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  requested_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  requested_date: { type: String }, // YYYY-MM-DD (optional preference)
  requested_time: { type: String }, // HH:mm (optional preference)
  reason: { type: String, default: '' },
  status: { type: String, enum: ['pending','approved','rejected','cancelled'], default: 'pending', index: true },
  processed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processed_at: { type: Date },
}, { timestamps: true });

export default mongoose.model('RescheduleRequest', RescheduleRequestSchema);
