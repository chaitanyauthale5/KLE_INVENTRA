import mongoose from 'mongoose';

const financeTransactionSchema = new mongoose.Schema(
  {
    hospital_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['income', 'expense'], required: true, index: true },
    method: { type: String, enum: ['cash','card','upi','insurance','other'], default: 'cash' },
    category: { type: String, enum: ['consultation','therapy','pharmacy','room','other'], default: 'consultation' },
    notes: { type: String, trim: true },
    created_at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

financeTransactionSchema.index({ hospital_id: 1, created_at: -1 });
financeTransactionSchema.index({ hospital_id: 1, type: 1, created_at: -1 });

export const FinanceTransaction = mongoose.model('FinanceTransaction', financeTransactionSchema);
