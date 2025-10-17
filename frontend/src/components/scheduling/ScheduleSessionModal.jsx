import React, { useState, useEffect } from 'react';
import { TherapySession } from '@/services';
import { User } from '@/services';
import { X, Calendar, Clock, User as UserIcon, Stethoscope, MapPin } from 'lucide-react';
import { format } from 'date-fns';

export default function ScheduleSessionModal({ isOpen, onClose, session, patients, onSessionScheduled, currentUser }) {
  const [formData, setFormData] = useState({
    patient_id: '',
    therapy_type: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 60,
    room_number: '',
    pre_instructions: '',
    post_instructions: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session) {
      setFormData({
        patient_id: session.patient_id || '',
        therapy_type: session.therapy_type || '',
        scheduled_date: session.scheduled_date || '',
        scheduled_time: session.scheduled_time || '',
        duration_minutes: session.duration_minutes || 60,
        room_number: session.room_number || '',
        pre_instructions: session.pre_instructions || '',
        post_instructions: session.post_instructions || ''
      });
    } else {
      setFormData({
        patient_id: '',
        therapy_type: '',
        scheduled_date: format(new Date(), 'yyyy-MM-dd'),
        scheduled_time: '09:00',
        duration_minutes: 60,
        room_number: '',
        pre_instructions: '',
        post_instructions: ''
      });
    }
  }, [session, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!formData.patient_id || !formData.therapy_type || !formData.scheduled_date || !formData.scheduled_time) {
      setError('Please fill in all required fields.');
      setIsLoading(false);
      return;
    }

    try {
      // Include hospital_id in session data for proper filtering
      const sessionData = {
        ...formData,
        hospital_id: currentUser?.hospital_id || null,
        doctor_id: currentUser?.id || null,
        status: 'scheduled'
      };

      console.log("Creating/updating session with data:", sessionData);

      if (session) {
        await TherapySession.update(session.id, sessionData);
        window.showNotification?.({
          type: 'success',
          title: 'Session Updated',
          message: 'Therapy session has been updated successfully.',
          autoClose: true
        });
      } else {
        await TherapySession.create(sessionData);
        window.showNotification?.({
          type: 'success',
          title: 'Session Scheduled',
          message: 'New therapy session has been scheduled successfully.',
          autoClose: true
        });
      }
      
      onSessionScheduled();
      onClose();
    } catch (err) {
      console.error("Failed to save session:", err);
      setError('Failed to save session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const therapyTypes = [
    { value: 'vamana', label: '🤮 Vamana (Therapeutic Vomiting)' },
    { value: 'virechana', label: '💊 Virechana (Purgation)' },
    { value: 'basti', label: '💉 Basti (Enema Therapy)' },
    { value: 'nasya', label: '👃 Nasya (Nasal Administration)' },
    { value: 'raktamokshana', label: '🩸 Raktamokshana (Bloodletting)' },
    { value: 'abhyanga', label: '💆‍♀️ Abhyanga (Oil Massage)' },
    { value: 'shirodhara', label: '🫗 Shirodhara (Oil Pouring)' },
    { value: 'swedana', label: '♨️ Swedana (Steam Therapy)' }
  ];

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00'
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
              {session ? 'Edit Session' : 'Schedule New Session'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Patient *</label>
              <select 
                name="patient_id" 
                value={formData.patient_id} 
                onChange={handleChange} 
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Patient</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.full_name || `Patient ${patient.patient_id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Therapy Type *</label>
              <select 
                name="therapy_type" 
                value={formData.therapy_type} 
                onChange={handleChange} 
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Therapy</option>
                {therapyTypes.map(therapy => (
                  <option key={therapy.value} value={therapy.value}>
                    {therapy.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
              <input 
                type="date" 
                name="scheduled_date" 
                value={formData.scheduled_date} 
                onChange={handleChange} 
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time *</label>
              <select 
                name="scheduled_time" 
                value={formData.scheduled_time} 
                onChange={handleChange} 
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {timeSlots.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
              <select 
                name="duration_minutes" 
                value={formData.duration_minutes} 
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
                <option value={120}>120 minutes</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Room Number</label>
              <input 
                type="text" 
                name="room_number" 
                value={formData.room_number} 
                onChange={handleChange} 
                placeholder="e.g., Room 101"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pre-Session Instructions</label>
            <textarea 
              name="pre_instructions" 
              value={formData.pre_instructions} 
              onChange={handleChange} 
              placeholder="Instructions for the patient before the session..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Post-Session Instructions</label>
            <textarea 
              name="post_instructions" 
              value={formData.post_instructions} 
              onChange={handleChange} 
              placeholder="Instructions for the patient after the session..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
            />
          </div>
        </form>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
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
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-green-600 text-white font-medium flex items-center gap-2 disabled:opacity-50 hover:shadow-lg transition-all"
          >
            {isLoading ? 'Saving...' : (session ? 'Update Session' : 'Schedule Session')}
          </button>
        </div>
      </div>
    </div>
  );
}