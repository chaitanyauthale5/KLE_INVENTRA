import React from 'react';

// This is a placeholder component to ensure no errors are thrown.
// The main Reports.js file no longer uses this, but we'll keep it simple.
export default function ExportReportModal({ isOpen, onClose }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Export Reports</h2>
        <p className="mb-4">This feature is currently being stabilized.</p>
        <button
          onClick={onClose}
          className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg"
          type="button"
        >
          Close
        </button>
      </div>
    </div>
  );
}