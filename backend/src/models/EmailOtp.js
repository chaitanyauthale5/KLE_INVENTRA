import mongoose from 'mongoose';

const emailOtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    purpose: { type: String, enum: ['signup', 'signin', 'reset', 'generic'], default: 'signup', index: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    // TTL index: document expires at this Date value
    expiresAt: { type: Date, required: true, expires: 0 },
    lastSentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const EmailOtp = mongoose.model('EmailOtp', emailOtpSchema);
