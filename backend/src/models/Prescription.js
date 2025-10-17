import mongoose from 'mongoose';

const medSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  dosage: { type: String, trim: true },
  frequency: { type: String, trim: true },
  duration: { type: String, trim: true },
}, { _id: false });

const therapySchema = new mongoose.Schema({
  name: { type: String, trim: true },
  duration: { type: String, trim: true },
  frequency: { type: String, trim: true },
}, { _id: false });

const prescriptionSchema = new mongoose.Schema({
  hospital_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true, required: true },
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', index: true, required: true },
  patient_name: { type: String, trim: true },
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  doctor_name: { type: String, trim: true },
  date: { type: Date },
  complaints: { type: String, trim: true },
  advice: { type: String, trim: true },
  meds: { type: [medSchema], default: [] },
  therapies: { type: [therapySchema], default: [] },
  pk_plan: {
    procedures: { type: String, trim: true },
    oils: { type: String, trim: true },
    basti: { type: String, trim: true },
    diet: { type: String, trim: true },
  },
  clinical: {
    vitals: {
      bp: { type: String, trim: true },
      pulse: { type: String, trim: true },
      temp: { type: String, trim: true },
      spo2: { type: String, trim: true },
    },
    diagnosis: { type: String, trim: true },
    subjective: { type: String, trim: true },
    objective: { type: String, trim: true },
    assessment: { type: String, trim: true },
    plan: { type: String, trim: true },
    follow_up: { type: Date },
    consent: { type: Boolean, default: false },
  },
}, { timestamps: true });

export const Prescription = mongoose.model('Prescription', prescriptionSchema);
