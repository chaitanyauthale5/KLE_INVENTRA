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
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-xl font-semibold flex items-center gap-2"><UserPlus className="text-blue-500" /> New Patient Registration</h2>
            <p className="mt-2 text-gray-600">Onboard new patients into the system.</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-xl font-semibold flex items-center gap-2"><CreditCard className="text-green-500" /> Payment Processing</h2>
            <p className="mt-2 text-gray-600">Manage invoices and patient payments.</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-xl font-semibold flex items-center gap-2"><CreditCard className="text-green-500" /> Managment</h2>
            <p className="mt-2 text-gray-600">Scheduling and managing therapy sessions.</p>
        </div>
      </div>
    </div>
  );
}