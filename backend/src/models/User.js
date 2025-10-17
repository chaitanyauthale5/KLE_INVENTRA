import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, lowercase: true, trim: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    role: {
      type: String,
      enum: ['patient', 'guardian', 'doctor', 'therapist', 'office_executive', 'clinic_admin', 'hospital_admin', 'admin', 'super_admin'],
      default: 'patient'
    },
    // Optional scoping fields
    hospital_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', default: null },
    has_selected_role: { type: Boolean, default: false },
    passwordHash: { type: String, required: true },
    department: { type: String, trim: true },
    fcm_tokens: { type: [String], default: [] },
  },
  { timestamps: true }
);

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.fcm_tokens;
  return obj;
};

export const User = mongoose.model('User', userSchema);
