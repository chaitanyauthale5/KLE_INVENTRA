import React from "react";

export default function TherapyProgress({ currentUser }) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Therapy Progress</h2>
        <p className="text-gray-500">Mark sessions as completed / in-progress and track outcomes.</p>
      </div>

      {/* Placeholder content - integrate with API when available */}
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-700">No sessions yet.</span>
        </div>
      </div>
    </div>
  );
}
