import React, { useState, useEffect } from 'react';
import { Patient } from '@/services';
import { X, Plus, Upload } from 'lucide-react';

export default function AddRecordModal({ isOpen, onClose, onRecordAdded, patientToEdit }) {
  const [formData, setFormData] = useState({
    user_id: '',
    age: '',
    gender: 'other',
    medical_history: '',
    current_conditions: '',
    allergies: '',
    therapy_plan: '',
    prescriptions: '',
    lifestyle_suggestions: ''
  });
  const [patientUser, setPatientUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (patientToEdit) {
      setFormData({
        user_id: patientToEdit.user_id || '',
        age: patientToEdit.age || '',
        gender: patientToEdit.gender || 'other',
        medical_history: patientToEdit.medical_history || '',
        current_conditions: patientToEdit.current_conditions?.join(', ') || '',
        allergies: patientToEdit.allergies?.join(', ') || '',
        therapy_plan: JSON.stringify(patientToEdit.therapy_plan, null, 2) || '',
        prescriptions: patientToEdit.prescriptions?.join('\n') || '',
        lifestyle_suggestions: patientToEdit.lifestyle_suggestions || '',
      });
      // In a real app, we would fetch the User record based on user_id
      setPatientUser({ full_name: patientToEdit.user_id });
    } else {
      // Reset form when opening for a new record
      setFormData({
        user_id: '', age: '', gender: 'other', medical_history: '',
        current_conditions: '', allergies: '', therapy_plan: '',
        prescriptions: '', lifestyle_suggestions: ''
      });
      setPatientUser(null);
    }
  }, [isOpen, patientToEdit]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const dataToSave = {
        ...formData,
        age: Number(formData.age),
        current_conditions: formData.current_conditions.split(',').map(s => s.trim()),
        allergies: formData.allergies.split(',').map(s => s.trim()),
        prescriptions: formData.prescriptions.split('\n').map(s => s.trim()),
        therapy_plan: formData.therapy_plan ? JSON.parse(formData.therapy_plan) : {},
      };

      if (patientToEdit) {
        await Patient.update(patientToEdit.id, dataToSave);
      } else {
        // This assumes user_id is an email for a new user, a real app would have a user selector
        // For simplicity, we are updating, as "Add Record" on this page implies adding details to existing patients.
        // A true "Add" would be on the Patients page.
        // This logic can be expanded. For now, let's show an alert.
        alert("Creating a new record from here is not yet implemented. Please use the 'Add Patient' button on the Patients page.");
        throw new Error("Creation not implemented from this modal.");
      }
      
      onRecordAdded();
      onClose();
    } catch (err) {
      console.error("Failed to save record:", err);
      setError('Failed to save record. Please check your data format, especially for Therapy Plan (must be valid JSON).');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b bg-gray-50 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-gray-800">
            {patientToEdit ? `Edit Record for ${patientUser?.full_name}` : 'Add New Patient Record'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-4">
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input name="age" type="number" value={formData.age} onChange={handleChange} placeholder="Age" className="w-full px-4 py-3 border border-gray-200 rounded-xl" />
            <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white">
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <textarea name="medical_history" value={formData.medical_history} onChange={handleChange} placeholder="Medical History" className="w-full px-4 py-3 border border-gray-200 rounded-xl h-24"></textarea>
          <input name="current_conditions" value={formData.current_conditions} onChange={handleChange} placeholder="Current Conditions (comma-separated)" className="w-full px-4 py-3 border border-gray-200 rounded-xl" />
          <input name="allergies" value={formData.allergies} onChange={handleChange} placeholder="Allergies (comma-separated)" className="w-full px-4 py-3 border border-gray-200 rounded-xl" />
          <textarea name="therapy_plan" value={formData.therapy_plan} onChange={handleChange} placeholder="Therapy Plan (JSON format)" className="w-full px-4 py-3 border border-gray-200 rounded-xl h-28 font-mono text-sm"></textarea>
          <textarea name="prescriptions" value={formData.prescriptions} onChange={handleChange} placeholder="Prescriptions (one per line)" className="w-full px-4 py-3 border border-gray-200 rounded-xl h-28"></textarea>
          <textarea name="lifestyle_suggestions" value={formData.lifestyle_suggestions} onChange={handleChange} placeholder="Lifestyle Suggestions" className="w-full px-4 py-3 border border-gray-200 rounded-xl h-24"></textarea>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
            <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-300" />
                <div className="mt-4 flex text-sm leading-6 text-gray-600">
                  <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500">
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs leading-5 text-gray-600">PDF, PNG, JPG up to 10MB</p>
              </div>
            </div>
          </div>

        </form>
        <div className="p-6 border-t flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl border bg-white hover:bg-gray-100 font-medium">Cancel</button>
          <button type="submit" onClick={handleSubmit} disabled={isLoading} className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-green-600 text-white font-medium flex items-center gap-2 disabled:opacity-50">
            {isLoading ? 'Saving...' : 'Save Record'}
          </button>
        </div>
      </div>
    </div>
  );
}