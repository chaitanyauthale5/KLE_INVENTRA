import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, lowercase: true, trim: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    role: {
      type: String,
      enum: ['patient', 'doctor', 'clinic_admin', 'office_executive', 'super_admin'],
      default: 'patient'
    },
    // Optional scoping fields
    hospital_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', default: null },
    has_selected_role: { type: Boolean, default: false },
    passwordHash: { type: String, required: true },
    department: { type: String, trim: true },
  },
  { timestamps: true }
);

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

export const User = mongoose.model('User', userSchema);
