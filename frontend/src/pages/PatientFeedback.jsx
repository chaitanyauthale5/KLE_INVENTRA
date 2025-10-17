import React from "react";

export default function PatientFeedback({ currentUser }) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Patient Feedback</h2>
        <p className="text-gray-500">Log observations, side effects, and patient notes.</p>
      </div>

      {/* Placeholder content - integrate with API when available */}
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <div className="text-gray-600">No feedback captured yet.</div>
      </div>
    </div>
  );
}
