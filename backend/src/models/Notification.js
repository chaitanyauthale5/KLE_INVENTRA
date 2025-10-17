import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    hospital_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true, default: null },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    type: { type: String, default: 'info' },
  },
  { timestamps: true }
);

export const Notification = mongoose.model('Notification', notificationSchema);
