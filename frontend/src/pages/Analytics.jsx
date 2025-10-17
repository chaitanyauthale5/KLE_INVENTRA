import React from 'react';
import { BarChart3, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Analytics({ currentUser }) {
  const getDashboardUrl = () => {
    switch (currentUser?.role) {
      case 'doctor':
        return createPageUrl('DoctorDashboard');
      case 'therapist':
        return createPageUrl('TherapistDashboard');
      // Add other role-specific dashboards if they exist
      default:
        return createPageUrl('Dashboard');
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-500">Insights into your healthcare operations.</p>
          </div>
        </div>
        <Link
          to={getDashboardUrl()}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
      <div className="text-center py-20 bg-gray-50 rounded-2xl">
        <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-600">Analytics Dashboard is Under Construction</h2>
        <p className="text-gray-500 mt-2">Check back soon for detailed reports and insights.</p>
      </div>
    </div>
  );
}