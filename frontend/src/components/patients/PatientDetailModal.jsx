import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Download, FileText, Calendar, Heart, Activity, User, Phone, Mail, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { Patient } from '@/services';
import { TherapySession } from '@/services';
import { Feedback } from '@/services';
import { Appointments } from '@/services';
import { createPortal } from 'react-dom';

const generatePDFReport = (patient, sessions, feedback) => {
  // Create a comprehensive HTML structure for PDF generation
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Patient Report - ${patient.full_name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }
        .report-container { 
          max-width: 800px; 
          margin: 0 auto; 
          background: white; 
          border-radius: 15px; 
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .header { 
          background: linear-gradient(135deg, #2e7d32 0%, #1565c0 100%); 
          color: white; 
          padding: 30px; 
          text-align: center; 
          position: relative;
        }
        .header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="medical" patternUnits="userSpaceOnUse" width="20" height="20"><circle cx="10" cy="10" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23medical)"/></svg>');
        }
        .header h1 { 
          font-size: 2.5em; 
          margin-bottom: 10px; 
          position: relative;
          z-index: 1;
        }
        .header .subtitle { 
          font-size: 1.2em; 
          opacity: 0.9; 
          position: relative;
          z-index: 1;
        }
        .content { padding: 30px; }
        .patient-info { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 30px; 
          margin-bottom: 30px; 
        }
        .info-card { 
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); 
          padding: 20px; 
          border-radius: 10px; 
          border-left: 4px solid #2e7d32;
        }
        .info-card h3 { 
          color: #2e7d32; 
          margin-bottom: 15px; 
          font-size: 1.3em;
          display: flex;
          align-items: center;
        }
        .info-card .icon {
          width: 20px;
          height: 20px;
          margin-right: 10px;
          background: #2e7d32;
          border-radius: 50%;
        }
        .info-row { 
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 8px; 
          padding: 5px 0;
          border-bottom: 1px solid rgba(0,0,0,0.1);
        }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-weight: 600; color: #555; }
        .info-value { color: #333; }
        .section { 
          margin-bottom: 30px; 
          background: white; 
          border-radius: 10px; 
          padding: 20px; 
          box-shadow: 0 5px 15px rgba(0,0,0,0.08);
          border: 1px solid #e0e0e0;
        }
        .section h2 { 
          color: #1565c0; 
          margin-bottom: 20px; 
          font-size: 1.5em;
          padding-bottom: 10px;
          border-bottom: 2px solid #1565c0;
        }
        .sessions-grid { 
          display: grid; 
          gap: 15px; 
        }
        .session-card { 
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); 
          padding: 15px; 
          border-radius: 8px; 
          border-left: 4px solid #1565c0;
        }
        .session-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 10px; 
        }
        .session-title { 
          font-weight: 600; 
          color: #1565c0; 
          text-transform: capitalize;
        }
        .session-status { 
          padding: 4px 12px; 
          border-radius: 20px; 
          font-size: 0.8em; 
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-completed { background: #c8e6c9; color: #2e7d32; }
        .status-scheduled { background: #bbdefb; color: #1565c0; }
        .status-in-progress { background: #fff3e0; color: #f57c00; }
        .progress-bar { 
          width: 100%; 
          height: 20px; 
          background: #f0f0f0; 
          border-radius: 10px; 
          overflow: hidden;
          margin: 10px 0;
        }
        .progress-fill { 
          height: 100%; 
          background: linear-gradient(90deg, #2e7d32, #4caf50); 
          transition: width 0.3s ease;
        }
        .progress-text { 
          text-align: center; 
          margin-top: 5px; 
          font-weight: 600; 
          color: #2e7d32;
        }
        .footer { 
          background: #f8f9fa; 
          padding: 20px 30px; 
          text-align: center; 
          border-top: 1px solid #e0e0e0;
          color: #666;
        }
        .watermark {
          position: fixed;
          bottom: 20px;
          right: 20px;
          opacity: 0.1;
          font-size: 3em;
          color: #2e7d32;
          transform: rotate(-15deg);
          z-index: -1;
        }
        @media print {
          body { background: white; padding: 0; }
          .report-container { box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="watermark">🏥 AyurSutra</div>
      <div class="report-container">
        <div class="header">
          <h1>🏥 AyurSutra Patient Report</h1>
          <div class="subtitle">Comprehensive Panchakarma Treatment Analysis</div>
        </div>
        
        <div class="content">
          <div class="patient-info">
            <div class="info-card">
              <h3><span class="icon"></span>Personal Information</h3>
              <div class="info-row">
                <span class="info-label">Full Name:</span>
                <span class="info-value">${patient.full_name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Age:</span>
                <span class="info-value">${patient.age || 'Not specified'} years</span>
              </div>
              <div class="info-row">
                <span class="info-label">Gender:</span>
                <span class="info-value">${patient.gender || 'Not specified'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Phone:</span>
                <span class="info-value">${patient.phone || 'Not provided'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Patient ID:</span>
                <span class="info-value">${patient.patient_id || patient.id}</span>
              </div>
            </div>
            
            <div class="info-card">
              <h3><span class="icon"></span>Medical Overview</h3>
              <div class="info-row">
                <span class="info-label">Assigned Doctor:</span>
                <span class="info-value">${patient.assigned_doctor || 'Not assigned'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Current Status:</span>
                <span class="info-value" style="text-transform: capitalize;">${patient.status || 'Active'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Total Sessions:</span>
                <span class="info-value">${sessions.length} sessions</span>
              </div>
              <div class="info-row">
                <span class="info-label">Progress Score:</span>
                <span class="info-value">${patient.progress_score || 0}%</span>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>🎯 Treatment Progress</h2>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${patient.progress_score || 0}%"></div>
            </div>
            <div class="progress-text">${patient.progress_score || 0}% Complete</div>
          </div>
          
          ${patient.medical_history ? `
          <div class="section">
            <h2>📋 Medical History</h2>
            <p style="background: #f8f9fa; padding: 15px; border-radius: 8px; line-height: 1.6;">${patient.medical_history}</p>
          </div>
          ` : ''}
          
          ${patient.current_conditions && patient.current_conditions.length > 0 ? `
          <div class="section">
            <h2>🏥 Current Conditions</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
              ${patient.current_conditions.map(condition => `
                <div style="background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); padding: 10px 15px; border-radius: 20px; text-align: center; border: 1px solid #ffcc02; font-weight: 500;">${condition}</div>
              `).join('')}
            </div>
          </div>
          ` : ''}
          
          ${patient.allergies && patient.allergies.length > 0 ? `
          <div class="section">
            <h2>⚠️ Allergies & Precautions</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
              ${patient.allergies.map(allergy => `
                <div style="background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%); padding: 10px 15px; border-radius: 20px; text-align: center; border: 1px solid #f44336; font-weight: 500; color: #c62828;">${allergy}</div>
              `).join('')}
            </div>
          </div>
          ` : ''}
          
          <div class="section">
            <h2>🌿 Panchakarma Therapy Sessions</h2>
            <div class="sessions-grid">
              ${sessions.length > 0 ? sessions.map(session => `
                <div class="session-card">
                  <div class="session-header">
                    <div class="session-title">${session.therapy_type?.replace('_', ' ')} Therapy</div>
                    <div class="session-status status-${session.status}">${session.status?.replace('_', ' ')}</div>
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 0.9em;">
                    <div><strong>Date:</strong> ${session.scheduled_date ? format(new Date(session.scheduled_date), 'MMM dd, yyyy') : 'Not scheduled'}</div>
                    <div><strong>Time:</strong> ${session.scheduled_time || 'Not specified'}</div>
                    <div><strong>Duration:</strong> ${session.duration_minutes || 60} minutes</div>
                    <div><strong>Room:</strong> ${session.room_number || 'TBD'}</div>
                  </div>
                  ${session.pre_instructions ? `<div style="margin-top: 10px; padding: 10px; background: rgba(255,193,7,0.1); border-radius: 5px; border-left: 3px solid #ffc107;"><strong>Pre-instructions:</strong> ${session.pre_instructions}</div>` : ''}
                  ${session.post_instructions ? `<div style="margin-top: 10px; padding: 10px; background: rgba(76,175,80,0.1); border-radius: 5px; border-left: 3px solid #4caf50;"><strong>Post-instructions:</strong> ${session.post_instructions}</div>` : ''}
                  ${session.completion_notes ? `<div style="margin-top: 10px; padding: 10px; background: rgba(33,150,243,0.1); border-radius: 5px; border-left: 3px solid #2196f3;"><strong>Completion Notes:</strong> ${session.completion_notes}</div>` : ''}
                </div>
              `).join('') : '<p style="text-align: center; color: #666; font-style: italic; padding: 20px;">No therapy sessions recorded yet.</p>'}
            </div>
          </div>
          
          ${feedback.length > 0 ? `
          <div class="section">
            <h2>💬 Patient Feedback & Progress Notes</h2>
            <div style="display: grid; gap: 15px;">
              ${feedback.map(fb => `
                <div style="background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%); padding: 15px; border-radius: 10px; border-left: 4px solid #9c27b0;">
                  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 10px; font-size: 0.9em;">
                    <div><strong>Energy Level:</strong> ${fb.energy_level || 'N/A'}/10</div>
                    <div><strong>Pain Level:</strong> ${fb.pain_level || 'N/A'}/10</div>
                    <div><strong>Sleep Quality:</strong> ${fb.sleep_quality || 'N/A'}/10</div>
                  </div>
                  ${fb.additional_notes ? `<div style="margin-top: 10px; font-style: italic; color: #555;">"${fb.additional_notes}"</div>` : ''}
                  <div style="margin-top: 10px; text-align: right; font-size: 0.8em; color: #666;">
                    Submitted on ${format(new Date(fb.created_date), 'MMM dd, yyyy')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <p><strong>🏥 AyurSutra Healthcare Management System</strong></p>
          <p>Generated on ${format(new Date(), 'MMMM dd, yyyy \'at\' hh:mm a')}</p>
          <p style="margin-top: 10px; font-size: 0.9em; color: #888;">
            This report contains confidential medical information. Please handle with appropriate care and maintain patient privacy.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Create and download the PDF
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `AyurSutra_Patient_Report_${patient.full_name?.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  // Also trigger print dialog for PDF conversion
  const printWindow = window.open('', '_blank');
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 1000);
};

export default function PatientDetailModal({ isOpen, onClose, patientId, currentUser }) {
  const [patient, setPatient] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [booking, setBooking] = useState({ date: '', time: '', duration: 30, notes: '' });
  const [bookingBusy, setBookingBusy] = useState(false);
  const dialogRef = useRef(null);
  const scrollYRef = useRef(0);

  // Lock body scroll (iOS-safe) and enable ESC-to-close
  useEffect(() => {
    if (!isOpen) return;
    // Save scroll position and freeze body
    scrollYRef.current = window.scrollY || window.pageYOffset;
    const prev = {
      body: {
        position: document.body.style.position,
        top: document.body.style.top,
        left: document.body.style.left,
        right: document.body.style.right,
        width: document.body.style.width,
        overflow: document.body.style.overflow,
      },
      html: {
        overflow: document.documentElement.style.overflow,
        overscrollBehavior: document.documentElement.style.overscrollBehavior,
      }
    };
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollYRef.current}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);

    return () => {
      // Restore body scroll
      document.body.style.position = prev.body.position;
      document.body.style.top = prev.body.top;
      document.body.style.left = prev.body.left;
      document.body.style.right = prev.body.right;
      document.body.style.width = prev.body.width;
      document.body.style.overflow = prev.body.overflow;
      document.documentElement.style.overflow = prev.html.overflow;
      document.documentElement.style.overscrollBehavior = prev.html.overscrollBehavior;
      window.scrollTo(0, scrollYRef.current || 0);
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  // Focus heading on open for accessibility
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      try { dialogRef.current.focus(); } catch {}
    }
  }, [isOpen]);

  // Focus trap inside dialog
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;
    const root = dialogRef.current;
    const getFocusable = () => Array.from(root.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )).filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
    const handler = (e) => {
      if (e.key !== 'Tab') return;
      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    };
    root.addEventListener('keydown', handler);
    return () => root.removeEventListener('keydown', handler);
  }, [isOpen]);

  const loadPatientDetails = useCallback(async () => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const [patientData, sessionsData, feedbackData] = await Promise.all([
        Patient.get(patientId).catch(() => null),
        TherapySession.filter({ patient_id: patientId }, '-scheduled_date').catch(() => []),
        Feedback.filter({ patient_id: patientId }, '-created_date').catch(() => [])
      ]);
      
      setPatient(patientData);
      setSessions(sessionsData);
      setFeedback(feedbackData);
    } catch (error) {
      console.error('Error loading patient details:', error);
    }
    setIsLoading(false);
  }, [patientId]);

  useEffect(() => {
    if (isOpen && patientId) {
      loadPatientDetails();
    }
  }, [isOpen, patientId, loadPatientDetails]);

  const handleDownloadReport = () => {
    if (patient) {
      generatePDFReport(patient, sessions, feedback);
      window.showNotification?.({
        type: 'success',
        title: 'Report Generated',
        message: `Comprehensive report for ${patient.full_name} has been generated and is ready for download.`,
        autoClose: true
      });
    }
  };

  const handleBookAppointment = async (e) => {
    e?.preventDefault?.();
    if (!patient?.hospital_id) {
      return window.showNotification?.({ type: 'error', title: 'Missing Clinic', message: 'Patient is not linked to a clinic.' });
    }
    if (!patient?.assigned_doctor_id) {
      return window.showNotification?.({ type: 'error', title: 'Assign Doctor', message: 'Assign a doctor to the patient first.' });
    }
    if (!booking.date || !booking.time) {
      return window.showNotification?.({ type: 'error', title: 'Missing Date/Time', message: 'Select appointment date and time.' });
    }
    try {
      setBookingBusy(true);
      const start = new Date(`${booking.date}T${booking.time}:00`);
      const end = new Date(start.getTime() + (Number(booking.duration) || 30) * 60000);
      await Appointments.book({
        hospital_id: patient.hospital_id,
        staff_id: patient.assigned_doctor_id,
        type: 'doctor',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        notes: booking.notes || `Appointment for patient ${patient.full_name}`,
      });
      window.showNotification?.({ type: 'success', title: 'Appointment Booked', message: 'The appointment has been scheduled.' });
      // reset
      setBooking({ date: '', time: '', duration: 30, notes: '' });
    } catch (err) {
      console.error('Failed to book appointment', err);
      window.showNotification?.({ type: 'error', title: 'Booking Failed', message: err?.message || 'Unable to book appointment.' });
    } finally {
      setBookingBusy(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-0 sm:p-2 md:p-4 overscroll-none touch-none"
      onClick={onClose}
      onTouchMove={(e) => { /* prevent background scroll on iOS */ if (e.target === e.currentTarget) e.preventDefault(); }}
      aria-hidden="true"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-dialog-title"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-none sm:rounded-3xl shadow-2xl w-screen h-screen sm:w-full sm:h-auto md:w-[92vw] lg:w-[88vw] xl:w-[82vw] max-w-6xl max-h-[90dvh] flex flex-col overflow-hidden"
        style={{ height: '100dvh' }}
      >
        {/* Header (draggable on touch devices to close) */}
        <motion.div
          className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-green-50 sticky top-0 z-10 touch-pan-y cursor-default sm:cursor-auto"
          drag="y"
          dragConstraints={{ top: 0, bottom: 120 }}
          dragElastic={0.2}
          onDragEnd={(e, info) => { if (info && info.offset && info.offset.y > 80) { onClose?.(); } }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 id="patient-dialog-title" className="text-2xl font-bold text-gray-800">Patient Detail Report</h2>
              <p className="text-gray-500">Comprehensive Panchakarma treatment overview</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadReport}
              disabled={!patient}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Download PDF Report
            </button>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Close">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </motion.div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 pb-24" style={{ paddingTop: 'max(env(safe-area-inset-top), 0rem)', paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)' }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
            </div>
          ) : patient ? (
            <div className="space-y-6">
              {/* Patient Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200">
                  <div className="flex items-center gap-3 mb-4">
                    <User className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-bold text-blue-800">Personal Information</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-semibold">{patient.full_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Age:</span>
                      <span className="font-semibold">{patient.age || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gender:</span>
                      <span className="font-semibold capitalize">{patient.gender || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-semibold">{patient.phone || 'Not provided'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl border border-green-200">
                  <div className="flex items-center gap-3 mb-4">
                    <Heart className="w-6 h-6 text-green-600" />
                    <h3 className="text-lg font-bold text-green-800">Medical Overview</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Doctor:</span>
                      <span className="font-semibold">{patient.assigned_doctor || 'Not assigned'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-semibold capitalize">{patient.status || 'Active'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sessions:</span>
                      <span className="font-semibold">{sessions.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Progress:</span>
                      <span className="font-semibold">{patient.progress_score || 0}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Activity className="w-6 h-6 text-purple-600" />
                  <h3 className="text-lg font-bold text-gray-800">Treatment Progress</h3>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${patient.progress_score || 0}%` }}
                  ></div>
                </div>
                <div className="text-center mt-2 font-semibold text-gray-700">
                  {patient.progress_score || 0}% Complete
                </div>
              </div>

              {/* Recent Sessions */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-800">Recent Therapy Sessions</h3>
                </div>
                {sessions.length > 0 ? (
                  <div className="space-y-3">
                    {sessions.slice(0, 5).map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">
                            {session.therapy_type === 'vamana' && '🤮'}
                            {session.therapy_type === 'virechana' && '💊'}
                            {session.therapy_type === 'basti' && '💉'}
                            {session.therapy_type === 'nasya' && '👃'}
                            {session.therapy_type === 'raktamokshana' && '🩸'}
                            {session.therapy_type === 'abhyanga' && '💆‍♀️'}
                            {session.therapy_type === 'shirodhara' && '🫗'}
                            {session.therapy_type === 'swedana' && '♨️'}
                            {!['vamana', 'virechana', 'basti', 'nasya', 'raktamokshana', 'abhyanga', 'shirodhara', 'swedana'].includes(session.therapy_type) && '🏥'}
                          </div>
                          <div>
                            <h4 className="font-semibold capitalize">{session.therapy_type?.replace('_', ' ')}</h4>
                            <p className="text-sm text-gray-500">
                              {session.scheduled_date && format(new Date(session.scheduled_date), 'MMM dd, yyyy')} at {session.scheduled_time}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          session.status === 'completed' ? 'bg-green-100 text-green-700' :
                          session.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                          session.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {session.status?.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No therapy sessions recorded yet.</p>
                )}
              </div>

              {/* Appointment Section */}
              {currentUser?.role !== 'clinic_admin' && (
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-teal-600" />
                    <h3 className="text-lg font-bold text-gray-800">Book Appointment</h3>
                  </div>
                  <div className="text-sm text-gray-500">
                    Doctor: <span className="font-semibold">{patient.assigned_doctor || 'Not assigned'}</span>
                  </div>
                </div>
                <form onSubmit={handleBookAppointment} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Date</label>
                    <input type="date" value={booking.date} onChange={e=>setBooking(b=>({ ...b, date: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Time</label>
                    <input type="time" value={booking.time} onChange={e=>setBooking(b=>({ ...b, time: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Duration (min)</label>
                    <input type="number" min="10" step="5" value={booking.duration} onChange={e=>setBooking(b=>({ ...b, duration: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-sm text-gray-600 mb-1">Notes</label>
                    <input type="text" value={booking.notes} onChange={e=>setBooking(b=>({ ...b, notes: e.target.value }))} placeholder="Optional notes" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="md:col-span-4 flex justify-end gap-3">
                    <button type="button" onClick={()=>setBooking({ date: '', time: '', duration: 30, notes: '' })} className="px-4 py-2 rounded-lg border">Clear</button>
                    <button type="submit" disabled={bookingBusy || !patient?.assigned_doctor_id} className="px-4 py-2 rounded-lg bg-gradient-to-r from-teal-600 to-green-600 text-white disabled:opacity-50">
                      {bookingBusy ? 'Booking...' : 'Book Appointment'}
                    </button>
                  </div>
                </form>
                {!patient?.assigned_doctor_id && (
                  <p className="text-xs text-red-500 mt-2">Assign a doctor to enable appointment booking.</p>
                )}
              </div>
            )}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-gray-500">Patient not found or error loading data.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
