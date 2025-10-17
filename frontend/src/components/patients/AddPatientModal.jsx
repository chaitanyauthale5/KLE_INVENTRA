import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { User } from '@/services';
import { Patient } from '@/services';
import { Hospital } from '@/services';
import { X, Plus, UserPlus, Heart, MapPin, Shield } from 'lucide-react';

export default function AddPatientModal({ isOpen, onClose, onPatientAdded, patient, currentUser }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    age: '',
    gender: 'other',
    address: '', // New field
    medicalHistory: '',
    currentConditions: '',
    allergies: '',
    assignedDoctor: '',
    Id: '', // New field for  assignment
    progressScore: 0,
    password: '',
    // Measurements
    weightKg: '',
    heightCm: '',
    bmi: '',
    // Medical & Health Background
    pastIllnesses: '', // legacy free text
    // New structured past illnesses selection + other
    pastIllnessesSelection: [],
    pastIllnessesOther: '',
    // Current illness conditional
    hasCurrentIllness: 'no', // 'yes' | 'no'
    currentIllnessDetails: '',
    medications: '',
    surgeries: '', // legacy
    surgeriesOperations: '',
    familyHistory: '',
    // Lifestyle & Routine
    wakeUpTime: '',
    mealsInfo: '', // legacy free text
    // New structured meals
    breakfastTime: '',
    breakfastFood: '',
    lunchTime: '',
    lunchFood: '',
    dinnerTime: '',
    dinnerFood: '',
    waterIntakeLiters: '',
    sleepTime: '',
    sleepDurationHours: '',
    sleepQuality: 'good', // legacy single value
    // Multi-select lists
    sleepQualityList: [], // ['good','disturbed','insomnia']
    workType: 'sedentary', // legacy single value
    workTypeList: [], // ['sedentary','moderate','heavy']
    screenTimeHours: '',
    shiftWork: 'day', // legacy single value
    shiftWorkList: [], // ['day','night','rotational']
    // Physical Fitness & Activity
    exerciseType: 'none', // legacy single value
    exerciseTypeList: [], // ['walking','yoga','gym','sports','none']
    exerciseDurationMin: '',
    exerciseFrequencyDays: '',
    energyLevel: 'medium', // legacy single value
    energyLevelList: [], // ['low','medium','high']
    fitnessGoal: 'healthy_lifestyle', // legacy single value
    fitnessGoalList: [], // ['weight_loss','healthy_lifestyle','therapy_support']
    // Habits & Addictions
    smoking: 'no',
    smokingQty: '',
    alcohol: 'no',
    alcoholFreq: '',
    tobacco: 'no',
    otherAddictions: '',
    // Stress & Mental Health
    stressLevel: 'moderate', // legacy
    stressLevelList: [], // ['low','moderate','high']
    mood: 'calm', // legacy
    moodList: [], // ['calm','irritable','anxious','depressed']
    workLifeBalance: '', // legacy free text
    workLifeBalanceList: [], // e.g., ['good','average','poor']
    relaxationPractices: '', // legacy free text
    relaxationPracticesList: [], // ['meditation','music','none']
  });
  const [doctors, setDoctors] = useState([]); // Doctors list for assignment
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const togglePastIllness = (option) => {
    setFormData(prev => {
      const set = new Set(prev.pastIllnessesSelection || []);
      if (set.has(option)) set.delete(option); else set.add(option);
      return { ...prev, pastIllnessesSelection: Array.from(set) };
    });
  };

  const toggleMulti = (listKey, option) => {
    setFormData(prev => {
      const curr = Array.isArray(prev[listKey]) ? prev[listKey] : [];
      const set = new Set(curr);
      if (set.has(option)) set.delete(option); else set.add(option);
      return { ...prev, [listKey]: Array.from(set) };
    });
  };

  useEffect(() => {
    if (patient && isOpen) {
      setFormData({
        fullName: patient.full_name || '',
        email: patient.email || '',
        phone: patient.phone || '',
        age: patient.age || '',
        gender: patient.gender || 'other',
        address: patient.address || '', // Populate address
        medicalHistory: patient.medical_history || '',
        currentConditions: Array.isArray(patient.current_conditions) ? patient.current_conditions.join(', ') : '',
        allergies: Array.isArray(patient.allergies) ? patient.allergies.join(', ') : '',
        assignedDoctor: patient.assigned_doctor || '',
        Id: patient._ids?.[0] || '', // Assuming one  for simplicity in UI
        progressScore: patient.progress_score || 0
      });
    } else if (!patient && isOpen) {
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        age: '',
        gender: 'other',
        address: '', // Reset address for new patient
        medicalHistory: '',
        currentConditions: '',
        allergies: '',
        assignedDoctor: currentUser?.full_name || '', // Default to current doctor
        Id: '', // Reset Id for new patient
        progressScore: 0,
        password: '',
      });
    }

    // Load doctors for assignment
    const loadDoctors = async () => {
      try {
        if (!currentUser?.hospital_id) {
          setDoctors([]);
          return;
        }
        const staff = await Hospital.listStaff(currentUser.hospital_id);
        const docs = (staff || []).filter(u => u.role === 'doctor');
        setDoctors(docs);
      } catch (err) {
        console.error('Failed to load doctors', err);
        setDoctors([]);
      }
    };
    if (isOpen) {
      loadDoctors();
    }
  }, [patient, isOpen, currentUser]); // Added currentUser to dependencies

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    // If changing doctor Id in assignment, also set assignedDoctor name for UI consistency
    if (name === 'Id') {
      const doc = doctors.find(d => String(d.id) === String(value));
      setFormData(prev => ({ ...prev, Id: value, assignedDoctor: doc ? (doc.full_name || doc.name || '') : '' }));
    } else {
      setFormData(prev => {
        const next = { ...prev, [name]: value };
        if (name === 'weightKg' || name === 'heightCm') {
          const w = parseFloat(name === 'weightKg' ? value : next.weightKg);
          const h = parseFloat(name === 'heightCm' ? value : next.heightCm);
          if (w > 0 && h > 0) {
            const bmi = w / Math.pow(h / 100, 2);
            next.bmi = bmi ? bmi.toFixed(1) : '';
          } else {
            next.bmi = '';
          }
        }
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!formData.fullName || !formData.email) {
      setError('Full Name and Email are required.');
      setIsLoading(false);
      return;
    }
    if (!patient) {
      if (!formData.password || String(formData.password).length < 6) {
        setError('Password must be at least 6 characters for a new patient login.');
        setIsLoading(false);
        return;
      }
    }

    try {
      const patientData = {
        age: Number(formData.age) || 0,
        gender: formData.gender,
        address: formData.address, // Include address
        medical_history: formData.medicalHistory,
        current_conditions: formData.currentConditions.split(',').map(s => s.trim()).filter(s => s),
        allergies: formData.allergies.split(',').map(s => s.trim()).filter(s => s),
        assigned_doctor: formData.assignedDoctor,
        progress_score: Number(formData.progressScore) || 0,
        full_name: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        password: patient ? undefined : formData.password,
        // doctor assignment id kept for future linkage if needed
        doctor_id: formData.Id || undefined,
        hospital_id: currentUser?.hospital_id, // Ensure hospital_id is set
        // Extended structured intake captured under metadata via services layer
        intake: {
          measurements: {
            weight_kg: formData.weightKg ? Number(formData.weightKg) : undefined,
            height_cm: formData.heightCm ? Number(formData.heightCm) : undefined,
            bmi: formData.bmi ? Number(formData.bmi) : undefined,
          },
          medical_background: {
            past_illnesses: (() => {
              const sel = Array.isArray(formData.pastIllnessesSelection) ? formData.pastIllnessesSelection.filter(Boolean) : [];
              const other = sel.includes('Other') && formData.pastIllnessesOther ? [formData.pastIllnessesOther] : [];
              const cleaned = sel.filter(v => v !== 'Other');
              if (cleaned.length || other.length) return [...cleaned, ...other];
              // fallback to legacy free text split by comma
              return String(formData.pastIllnesses || '')
                .split(',').map(s=>s.trim()).filter(Boolean);
            })(),
            current_illness: formData.hasCurrentIllness === 'yes' ? formData.currentIllnessDetails : '',
            medications: formData.medications,
            surgeries: formData.surgeriesOperations || formData.surgeries,
            family_history: formData.familyHistory,
          },
          lifestyle: {
            wake_up_time: formData.wakeUpTime,
            // structured meals; keep legacy as fallback
            meals: {
              breakfast: { time: formData.breakfastTime, food: formData.breakfastFood },
              lunch: { time: formData.lunchTime, food: formData.lunchFood },
              dinner: { time: formData.dinnerTime, food: formData.dinnerFood },
            },
            meals_info: formData.mealsInfo,
            water_intake_liters: formData.waterIntakeLiters ? Number(formData.waterIntakeLiters) : undefined,
            sleep_time: formData.sleepTime,
            sleep_duration_hours: formData.sleepDurationHours ? Number(formData.sleepDurationHours) : undefined,
            // multi-select lists with legacy fallbacks
            sleep_quality_list: Array.isArray(formData.sleepQualityList) && formData.sleepQualityList.length ? formData.sleepQualityList : (formData.sleepQuality ? [formData.sleepQuality] : []),
            work_type_list: Array.isArray(formData.workTypeList) && formData.workTypeList.length ? formData.workTypeList : (formData.workType ? [formData.workType] : []),
            screen_time_hours: formData.screenTimeHours ? Number(formData.screenTimeHours) : undefined,
            shift_work_list: Array.isArray(formData.shiftWorkList) && formData.shiftWorkList.length ? formData.shiftWorkList : (formData.shiftWork ? [formData.shiftWork] : []),
          },
          fitness: {
            exercise_type_list: Array.isArray(formData.exerciseTypeList) && formData.exerciseTypeList.length ? formData.exerciseTypeList : (formData.exerciseType ? [formData.exerciseType] : []),
            exercise_duration_min: formData.exerciseDurationMin ? Number(formData.exerciseDurationMin) : undefined,
            exercise_frequency_days: formData.exerciseFrequencyDays ? Number(formData.exerciseFrequencyDays) : undefined,
            energy_level_list: Array.isArray(formData.energyLevelList) && formData.energyLevelList.length ? formData.energyLevelList : (formData.energyLevel ? [formData.energyLevel] : []),
            fitness_goal_list: Array.isArray(formData.fitnessGoalList) && formData.fitnessGoalList.length ? formData.fitnessGoalList : (formData.fitnessGoal ? [formData.fitnessGoal] : []),
          },
          habits: {
            smoking: formData.smoking,
            smoking_qty: formData.smokingQty,
            alcohol: formData.alcohol,
            alcohol_freq: formData.alcoholFreq,
            tobacco: formData.tobacco,
            other_addictions: formData.otherAddictions,
          },
          mental_health: {
            stress_level_list: Array.isArray(formData.stressLevelList) && formData.stressLevelList.length ? formData.stressLevelList : (formData.stressLevel ? [formData.stressLevel] : []),
            mood_list: Array.isArray(formData.moodList) && formData.moodList.length ? formData.moodList : (formData.mood ? [formData.mood] : []),
            work_life_balance_list: Array.isArray(formData.workLifeBalanceList) ? formData.workLifeBalanceList : [],
            work_life_balance: formData.workLifeBalance,
            relaxation_practices_list: Array.isArray(formData.relaxationPracticesList) ? formData.relaxationPracticesList : [],
            relaxation_practices: formData.relaxationPractices,
          },
        },
      };

      if (patient) {
        // Update existing patient
        await Patient.update(patient.id, patientData);
        window.showNotification?.({
          type: 'success',
          title: 'Patient Updated',
          message: `${formData.fullName} has been updated successfully.`,
          autoClose: true
        });
      } else {
        // Create new patient
        await Patient.create({
          user_id: `user_${Date.now()}`, // Generate a temporary user ID
          ...patientData
        });
        window.showNotification?.({
          type: 'success',
          title: 'Patient Added',
          message: `${formData.fullName} has been added to the system.`,
          autoClose: true
        });
      }
      
      onPatientAdded({ stayAtTop: true }); // Pass option to stay at top
      onClose();
    } catch (err) {
      console.error("Failed to save patient:", err);
      setError('Failed to save patient. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex p-4 md:p-6 overflow-y-auto">
      <div className="relative bg-white rounded-3xl shadow-2xl w-full md:w-[92vw] lg:w-[84vw] xl:w-[70vw] max-w-[1160px] max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-3rem)] flex flex-col mx-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-gray-100 bg-white rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
              {patient ? <UserPlus className="w-5 h-5 text-white" /> : <Plus className="w-5 h-5 text-white" />}
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
              {patient ? 'Edit Patient Details' : 'Add New Patient'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-6 overscroll-contain">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 lg:gap-x-8 gap-y-6">
            {/* Left Column */}
            <div>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-2xl space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                  Personal & Contact Information
                </h3>
                <input name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Full Name *" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500" required />
                <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email Address *" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500" required />
                <input name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="Phone Number" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500" />
                <div className="grid grid-cols-2 gap-4">
                  <input name="age" type="number" value={formData.age} onChange={handleChange} placeholder="Age" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500" />
                  <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                {!patient && (
                  <input
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Password for patient login (min 6)"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                    required
                    minLength={6}
                  />
                )}
                 <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input name="address" value={formData.address} onChange={handleChange} placeholder="Patient Address" className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-6 rounded-2xl mt-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-teal-600" />
                   Assignment
                </h3>
                <select name="Id" value={formData.Id} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white">
                  <option value="">No Doctor Assigned</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{(d.full_name || d.name) || 'Doctor'} {d.email ? `(${d.email})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Column */}
            <div className="bg-gradient-to-r from-green-50 to-lime-50 p-6 rounded-2xl space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Heart className="w-5 h-5 text-green-600" />
                Medical Information
              </h3>
              <textarea name="medicalHistory" value={formData.medicalHistory} onChange={handleChange} placeholder="Medical History (e.g., hypertension)" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 h-24" />
              <input name="currentConditions" value={formData.currentConditions} onChange={handleChange} placeholder="Current Conditions (comma-separated)" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
              <input name="allergies" value={formData.allergies} onChange={handleChange} placeholder="Allergies (comma-separated)" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Doctor</label>
                <input name="assignedDoctor" value={formData.assignedDoctor} onChange={handleChange} placeholder="Doctor's Name" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Initial Progress Score (0-100)</label>
                <input name="progressScore" type="number" min="0" max="100" value={formData.progressScore} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
              </div>

              {/* Measurements */}
              <div className="grid grid-cols-3 gap-4">
                <input name="weightKg" type="number" step="0.1" value={formData.weightKg} onChange={handleChange} placeholder="Weight (kg)" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
                <input name="heightCm" type="number" step="0.1" value={formData.heightCm} onChange={handleChange} placeholder="Height (cm)" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
                <input name="bmi" type="text" value={formData.bmi} readOnly placeholder="BMI (auto)" className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50" />
              </div>

              {/* 2️⃣ Medical & Health Background */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Past Illnesses</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {['Diabetes','BP','Thyroid','Asthma','Kidney Stone','Sandhivata','Other'].map(opt => (
                    <label key={opt} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={(formData.pastIllnessesSelection||[]).includes(opt)}
                        onChange={() => togglePastIllness(opt)}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
                {(formData.pastIllnessesSelection||[]).includes('Other') && (
                  <input name="pastIllnessesOther" value={formData.pastIllnessesOther} onChange={handleChange} placeholder="Specify other illness" className="mt-3 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Illness?</label>
                  <select name="hasCurrentIllness" value={formData.hasCurrentIllness} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
                {formData.hasCurrentIllness === 'yes' && (
                  <input name="currentIllnessDetails" value={formData.currentIllnessDetails} onChange={handleChange} placeholder="Describe current illness" className="col-span-2 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
                )}
              </div>
              <input name="medications" value={formData.medications} onChange={handleChange} placeholder="Medications (Ongoing / Past)" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
              <input name="surgeriesOperations" value={formData.surgeriesOperations} onChange={handleChange} placeholder="Surgeries / Operations" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
              <input name="familyHistory" value={formData.familyHistory} onChange={handleChange} placeholder="Family History (Hereditary diseases)" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />

              {/* 3️⃣ Lifestyle & Routine */}
              <div className="grid grid-cols-2 gap-4">
                <input name="wakeUpTime" value={formData.wakeUpTime} onChange={handleChange} placeholder="Wake-up Time" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
                <input name="sleepTime" value={formData.sleepTime} onChange={handleChange} placeholder="Sleep Time" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Meals (Time, Food)</div>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input name="breakfastTime" value={formData.breakfastTime} onChange={handleChange} placeholder="Breakfast Time" className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
                    <input name="breakfastFood" value={formData.breakfastFood} onChange={handleChange} placeholder="Breakfast Food" className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input name="lunchTime" value={formData.lunchTime} onChange={handleChange} placeholder="Lunch Time" className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
                    <input name="lunchFood" value={formData.lunchFood} onChange={handleChange} placeholder="Lunch Food" className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input name="dinnerTime" value={formData.dinnerTime} onChange={handleChange} placeholder="Dinner Time" className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
                    <input name="dinnerFood" value={formData.dinnerFood} onChange={handleChange} placeholder="Dinner Food" className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
                  </div>
                </div>
                <textarea name="mealsInfo" value={formData.mealsInfo} onChange={handleChange} placeholder="Notes (optional): Breakfast / Lunch / Dinner" className="mt-3 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <input name="waterIntakeLiters" type="number" step="0.1" value={formData.waterIntakeLiters} onChange={handleChange} placeholder="Water Intake (L/day)" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
                <input name="sleepDurationHours" type="number" step="0.1" value={formData.sleepDurationHours} onChange={handleChange} placeholder="Sleep Duration (hrs)" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
                <div>
                  <div className="text-xs text-gray-500 mb-1">Quality of Sleep</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ['good','Good'],
                      ['disturbed','Disturbed'],
                      ['insomnia','Insomnia'],
                    ].map(([val,label]) => (
                      <label key={val} className={`px-3 py-2 rounded-full border text-sm cursor-pointer ${ (formData.sleepQualityList||[]).includes(val) ? 'bg-green-100 border-green-400' : 'border-gray-200' }`}>
                        <input type="checkbox" className="hidden" checked={(formData.sleepQualityList||[]).includes(val)} onChange={() => toggleMulti('sleepQualityList', val)} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Work Type</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ['sedentary','Sedentary'],
                      ['moderate','Moderate'],
                      ['heavy','Heavy'],
                    ].map(([val,label]) => (
                      <label key={val} className={`px-3 py-2 rounded-full border text-sm cursor-pointer ${ (formData.workTypeList||[]).includes(val) ? 'bg-green-100 border-green-400' : 'border-gray-200' }`}>
                        <input type="checkbox" className="hidden" checked={(formData.workTypeList||[]).includes(val)} onChange={() => toggleMulti('workTypeList', val)} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 items-start">
                  <input name="screenTimeHours" type="number" value={formData.screenTimeHours} onChange={handleChange} placeholder="Screen Time (hrs/day)" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
                  <div className="col-span-2">
                    <div className="text-xs text-gray-500 mb-1">Shift Work</div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ['day','Day'],
                        ['night','Night'],
                        ['rotational','Rotational'],
                      ].map(([val,label]) => (
                        <label key={val} className={`px-3 py-2 rounded-full border text-sm cursor-pointer ${ (formData.shiftWorkList||[]).includes(val) ? 'bg-green-100 border-green-400' : 'border-gray-200' }`}>
                          <input type="checkbox" className="hidden" checked={(formData.shiftWorkList||[]).includes(val)} onChange={() => toggleMulti('shiftWorkList', val)} />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4️⃣ Physical Fitness & Activity */}
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Exercise Type</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ['walking','Walking'],
                      ['yoga','Yoga'],
                      ['gym','Gym'],
                      ['sports','Sports'],
                      ['none','None'],
                    ].map(([val,label]) => (
                      <label key={val} className={`px-3 py-2 rounded-full border text-sm cursor-pointer ${ (formData.exerciseTypeList||[]).includes(val) ? 'bg-green-100 border-green-400' : 'border-gray-200' }`}>
                        <input type="checkbox" className="hidden" checked={(formData.exerciseTypeList||[]).includes(val)} onChange={() => toggleMulti('exerciseTypeList', val)} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-start">
                  <input name="exerciseDurationMin" type="number" value={formData.exerciseDurationMin} onChange={handleChange} placeholder="Duration (min/day)" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
                  <input name="exerciseFrequencyDays" type="number" value={formData.exerciseFrequencyDays} onChange={handleChange} placeholder="Frequency (days/week)" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
                  <div className="col-span-2">
                    <div className="text-xs text-gray-500 mb-1">Energy Level</div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ['low','Low'],
                        ['medium','Medium'],
                        ['high','High'],
                      ].map(([val,label]) => (
                        <label key={val} className={`px-3 py-2 rounded-full border text-sm cursor-pointer ${ (formData.energyLevelList||[]).includes(val) ? 'bg-green-100 border-green-400' : 'border-gray-200' }`}>
                          <input type="checkbox" className="hidden" checked={(formData.energyLevelList||[]).includes(val)} onChange={() => toggleMulti('energyLevelList', val)} />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Current Fitness Goal</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ['weight_loss','Weight Loss'],
                      ['healthy_lifestyle','Healthy Lifestyle'],
                      ['therapy_support','Therapy Support'],
                    ].map(([val,label]) => (
                      <label key={val} className={`px-3 py-2 rounded-full border text-sm cursor-pointer ${ (formData.fitnessGoalList||[]).includes(val) ? 'bg-green-100 border-green-400' : 'border-gray-200' }`}>
                        <input type="checkbox" className="hidden" checked={(formData.fitnessGoalList||[]).includes(val)} onChange={() => toggleMulti('fitnessGoalList', val)} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5️⃣ Habits & Addictions */}
              <div className="grid grid-cols-3 gap-4">
                <select name="smoking" value={formData.smoking} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 bg-white">
                  <option value="no">Smoking: No</option>
                  <option value="yes">Smoking: Yes</option>
                </select>
                <input name="smokingQty" value={formData.smokingQty} onChange={handleChange} placeholder="Quantity (per day)" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
                <select name="tobacco" value={formData.tobacco} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 bg-white">
                  <option value="no">Tobacco/Gutkha: No</option>
                  <option value="yes">Tobacco/Gutkha: Yes</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select name="alcohol" value={formData.alcohol} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 bg-white">
                  <option value="no">Alcohol: No</option>
                  <option value="yes">Alcohol: Yes</option>
                </select>
                <input name="alcoholFreq" value={formData.alcoholFreq} onChange={handleChange} placeholder="Alcohol Frequency" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />
              </div>
              <input name="otherAddictions" value={formData.otherAddictions} onChange={handleChange} placeholder="Other Addictions" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500" />

              {/* 6️⃣ Stress & Mental Health */}
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Stress Level</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ['low','Low'],['moderate','Moderate'],['high','High']
                    ].map(([val,label]) => (
                      <label key={val} className={`px-3 py-2 rounded-full border text-sm cursor-pointer ${ (formData.stressLevelList||[]).includes(val) ? 'bg-green-100 border-green-400' : 'border-gray-200' }`}>
                        <input type="checkbox" className="hidden" checked={(formData.stressLevelList||[]).includes(val)} onChange={() => toggleMulti('stressLevelList', val)} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Mood</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ['calm','Calm'],['irritable','Irritable'],['anxious','Anxious'],['depressed','Depressed']
                    ].map(([val,label]) => (
                      <label key={val} className={`px-3 py-2 rounded-full border text-sm cursor-pointer ${ (formData.moodList||[]).includes(val) ? 'bg-green-100 border-green-400' : 'border-gray-200' }`}>
                        <input type="checkbox" className="hidden" checked={(formData.moodList||[]).includes(val)} onChange={() => toggleMulti('moodList', val)} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Work-Life Balance</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ['good','Good'],['average','Average'],['poor','Poor']
                    ].map(([val,label]) => (
                      <label key={val} className={`px-3 py-2 rounded-full border text-sm cursor-pointer ${ (formData.workLifeBalanceList||[]).includes(val) ? 'bg-green-100 border-green-400' : 'border-gray-200' }`}>
                        <input type="checkbox" className="hidden" checked={(formData.workLifeBalanceList||[]).includes(val)} onChange={() => toggleMulti('workLifeBalanceList', val)} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Relaxation Practices</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ['meditation','Meditation'],['music','Music'],['none','None']
                    ].map(([val,label]) => (
                      <label key={val} className={`px-3 py-2 rounded-full border text-sm cursor-pointer ${ (formData.relaxationPracticesList||[]).includes(val) ? 'bg-green-100 border-green-400' : 'border-gray-200' }`}>
                        <input type="checkbox" className="hidden" checked={(formData.relaxationPracticesList||[]).includes(val)} onChange={() => toggleMulti('relaxationPracticesList', val)} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 z-10 p-6 border-t border-gray-100 flex justify-end gap-3 bg-white rounded-b-3xl">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium flex items-center gap-2 disabled:opacity-50 hover:shadow-lg transition-all"
            >
              {isLoading ? 'Saving...' : (patient ? 'Update Patient' : 'Add Patient')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Move prop types outside component definition (ensures they are not inside hooks/effects)
AddPatientModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onPatientAdded: PropTypes.func.isRequired,
  patient: PropTypes.shape({
    id: PropTypes.any,
    full_name: PropTypes.string,
    email: PropTypes.string,
    phone: PropTypes.string,
    age: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    gender: PropTypes.string,
    address: PropTypes.string,
    medical_history: PropTypes.string,
    current_conditions: PropTypes.arrayOf(PropTypes.string),
    allergies: PropTypes.arrayOf(PropTypes.string),
    assigned_doctor: PropTypes.string,
    _ids: PropTypes.array,
    progress_score: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
  currentUser: PropTypes.shape({
    full_name: PropTypes.string,
    hospital_id: PropTypes.any,
  }),
};
