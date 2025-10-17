import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    hospital_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
    title: { type: String, required: true },
    scope: { type: String, enum: ['global','hospital'], default: 'hospital' },
    payload: { type: Object, default: {} },
    generated_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Report = mongoose.model('Report', reportSchema);
