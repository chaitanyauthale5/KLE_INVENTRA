import mongoose from 'mongoose';

const financeTransactionSchema = new mongoose.Schema(
  {
    hospital_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    // Optional linkage to patient user and/or patient record
    patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    patient_record_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Finance amounts and metadata
    amount: { type: Number, required: true },
    type: { type: String, enum: ['income', 'expense'], required: true, index: true },
    method: { type: String, enum: ['cash','card','upi','insurance','other'], default: 'cash' },
    category: { type: String, enum: ['consultation','therapy','pharmacy','room','other'], default: 'consultation' },
    therapy_name: { type: String, trim: true },
    notes: { type: String, trim: true },
    // Approval workflow
    status: { type: String, enum: ['pending','approved','rejected'], default: 'pending', index: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approved_at: { type: Date },
    created_at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

financeTransactionSchema.index({ hospital_id: 1, created_at: -1 });
financeTransactionSchema.index({ hospital_id: 1, type: 1, created_at: -1 });
financeTransactionSchema.index({ hospital_id: 1, status: 1, created_at: -1 });

export const FinanceTransaction = mongoose.model('FinanceTransaction', financeTransactionSchema);
