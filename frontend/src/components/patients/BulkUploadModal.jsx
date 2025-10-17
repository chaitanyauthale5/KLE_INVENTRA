import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Download, FileText, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { Patient } from '@/services';
import { ExtractDataFromUploadedFile, UploadFile } from '@/services/integrations';

export default function BulkUploadModal({ isOpen, onClose, onUploadComplete }) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;
    
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv')) {
      setErrors(['Please select a valid CSV or Excel file']);
      return;
    }
    
    setFile(selectedFile);
    setErrors([]);
  };

  const processFile = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setUploadProgress(10);
    setErrors([]);
    
    try {
      // Upload file
      setUploadProgress(30);
      const { file_url } = await UploadFile({ file });
      
      setUploadProgress(50);
      
      // Define expected schema for patient data
      const patientSchema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            full_name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            age: { type: "number" },
            gender: { type: "string", enum: ["male", "female", "other"] },
            medical_history: { type: "string" },
            current_conditions: { type: "array", items: { type: "string" } },
            allergies: { type: "array", items: { type: "string" } },
            assigned_doctor: { type: "string" },
            emergency_contact: { type: "string" }
          },
          required: ["full_name", "age", "gender"]
        }
      };
      
      setUploadProgress(70);
      
      // Extract data from file
      const extractResult = await ExtractDataFromUploadedFile({
        file_url,
        json_schema: patientSchema
      });
      
      setUploadProgress(90);
      
      if (extractResult.status === 'error') {
        throw new Error(extractResult.details);
      }
      
      const patientsData = extractResult.output;
      
      // Validate and process each patient record
      const processedPatients = [];
      const processingErrors = [];
      
      for (let i = 0; i < patientsData.length; i++) {
        const patient = patientsData[i];
        try {
          // Create user first, then patient record
          const patientRecord = {
            user_id: patient.email || `patient_${Date.now()}_${i}`,
            age: patient.age,
            gender: patient.gender,
            medical_history: patient.medical_history || '',
            current_conditions: typeof patient.current_conditions === 'string' 
              ? patient.current_conditions.split(',').map(c => c.trim())
              : patient.current_conditions || [],
            allergies: typeof patient.allergies === 'string'
              ? patient.allergies.split(',').map(a => a.trim())
              : patient.allergies || [],
            assigned_doctor: patient.assigned_doctor || '',
            progress_score: 0,
            prescriptions: [],
            lifestyle_suggestions: ''
          };
          
          const createdPatient = await Patient.create(patientRecord);
          processedPatients.push(createdPatient);
          
        } catch (error) {
          processingErrors.push(`Row ${i + 1}: ${error.message}`);
        }
      }
      
      setUploadProgress(100);
      
      setResults({
        total: patientsData.length,
        successful: processedPatients.length,
        failed: processingErrors.length,
        patients: processedPatients
      });
      
      if (processingErrors.length > 0) {
        setErrors(processingErrors);
      }
      
      if (processedPatients.length > 0) {
        onUploadComplete?.(processedPatients);
      }
      
    } catch (error) {
      console.error('Bulk upload error:', error);
      setErrors([`Upload failed: ${error.message}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `full_name,email,phone,age,gender,medical_history,current_conditions,allergies,assigned_doctor,emergency_contact
"John Doe","john.doe@email.com","9876543210",45,"male","Hypertension, Diabetes","Diabetes, High Blood Pressure","None","Dr. Smith","Jane Doe - 9876543211"
"Jane Smith","jane.smith@email.com","9876543212",38,"female","Arthritis","Joint Pain","Shellfish","Dr. Patel","John Smith - 9876543213"
"Mike Johnson","mike.johnson@email.com","9876543214",52,"male","Heart Disease","Chest Pain, Fatigue","Penicillin","Dr. Kumar","Mary Johnson - 9876543215"`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'patient_upload_template.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const resetModal = () => {
    setFile(null);
    setUploadProgress(0);
    setIsProcessing(false);
    setResults(null);
    setErrors([]);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-green-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl flex items-center justify-center">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Bulk Patient Upload</h2>
                <p className="text-sm text-gray-500">Upload multiple patients via CSV/Excel file</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Template Download */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-blue-900">Need a template?</h3>
                  <p className="text-sm text-blue-700">Download our CSV template with sample data</p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Template
                </button>
              </div>
            </div>

            {/* File Upload Area */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {file ? file.name : 'Drop your CSV/Excel file here'}
              </h3>
              <p className="text-gray-500 mb-4">
                {file 
                  ? `File size: ${(file.size / 1024).toFixed(1)} KB`
                  : 'Or click to browse files'
                }
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => handleFile(e.target.files[0])}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg transition-colors"
              >
                Choose File
              </button>
            </div>

            {/* Progress Bar */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}

            {/* Results */}
            {results && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-900">{results.successful}</div>
                    <div className="text-sm text-green-700">Successful</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                    <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{results.total}</div>
                    <div className="text-sm text-gray-700">Total Records</div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-red-900">{results.failed}</div>
                    <div className="text-sm text-red-700">Failed</div>
                  </div>
                </div>
              </div>
            )}

            {/* Errors */}
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-900 mb-2">Upload Errors:</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {errors.map((error, index) => (
                    <p key={index} className="text-sm text-red-700">• {error}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <button
                onClick={resetModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Reset
              </button>
              <button
                onClick={processFile}
                disabled={!file || isProcessing}
                className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : 'Upload Patients'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}