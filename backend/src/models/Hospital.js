import mongoose from 'mongoose';

const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    super_admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Scheduling policy/config
    business_hours: {
      type: Object,
      default: {
        mon: { start: '09:00', end: '18:00' },
        tue: { start: '09:00', end: '18:00' },
        wed: { start: '09:00', end: '18:00' },
        thu: { start: '09:00', end: '18:00' },
        fri: { start: '09:00', end: '18:00' },
        sat: { start: '09:00', end: '14:00' },
        sun: null,
      }
    },
    blackout_dates: { type: [String], default: [] }, // YYYY-MM-DD strings
    policies: {
      type: Object,
      default: {
        lead_time_hours: 2,
        max_sessions_per_patient_per_day: 3,
        max_sessions_per_staff_per_day: 10,
        auto_assign_staff: false,
        max_reschedule_requests_per_week: 3,
      }
    },
    therapy_config: { type: Object, default: {} }, // e.g., { nasya: { buffer_min: 10, allowed_hours: { start:'09:00', end:'12:00' } } }
    working_templates: { type: Object, default: {} },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

export const Hospital = mongoose.model('Hospital', hospitalSchema);
