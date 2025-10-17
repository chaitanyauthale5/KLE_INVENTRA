import React from 'react';
import { UserPlus, CreditCard } from 'lucide-react';

export default function OfficeExecutiveDashboard() {
  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl flex items-center justify-center">
          <UserPlus className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Office Executive Dashboard</h1>
          <p className="text-gray-500">Tools for patient registration and administration.</p>
        </div>
      </div>
      {/* ...rest of the dashboard content... */}
    </div>
  );
}
