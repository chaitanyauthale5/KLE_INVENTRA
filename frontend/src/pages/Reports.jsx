import { useState } from 'react';
import PropTypes from 'prop-types';
import { FileText, Download, Users, Activity, BarChart3, TrendingUp, Eye, Printer, Briefcase } from 'lucide-react';
import { format } from 'date-fns';

// Mock data
const mockStats = { totalPatients: 127, completedSessions: 432, averageProgress: 78, activeStaff: 14 };
const mockReports = [
  { id: 'RPT001', title: 'Monthly Patient Progress Report', type: 'Patient Analytics', generatedDate: '2024-12-20', status: 'Ready', pages: 15, description: 'Comprehensive analysis of patient progress across all therapy types.' },
  { id: 'RPT002', title: 'Therapy Session Efficiency Analysis', type: 'Operational Report', generatedDate: '2024-12-19', status: 'Ready', pages: 23, description: 'Detailed breakdown of therapy session completion rates, duration, and resource utilization.' },
  { id: 'RPT003', title: 'Financial Summary & Revenue Analysis', type: 'Financial Report', generatedDate: '2024-12-18', status: 'Processing', pages: 12, description: 'Monthly revenue analysis, payment collections, and outstanding dues summary.' }
];

const StatCard = ({ title, value, icon: Icon, color, suffix = '' }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value}<span className="text-lg font-medium">{suffix}</span></p>
      </div>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color}`}>
        <Icon className="w-7 h-7 text-white" />
      </div>
    </div>
  </div>
);

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.elementType.isRequired,
  color: PropTypes.string.isRequired,
  suffix: PropTypes.string,
};

const ReportCard = ({ report }) => {
  const handleAction = (actionType) => {
    window.showNotification?.({ type: 'info', title: `${actionType} Requested`, message: `This is a demo. The ${report.title} would be ${actionType.toLowerCase()}ed.` });
  };
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{report.title}</h3>
            <p className="text-sm text-gray-500">ID: {report.id} • {report.type}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${report.status === 'Ready' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {report.status}
        </span>
      </div>
      <p className="text-gray-600 text-sm mb-4">{report.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>Generated: {format(new Date(report.generatedDate), 'MMM d, yyyy')}</span>
          <span>Pages: {report.pages}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleAction('View')} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Eye className="w-4 h-4" /></button>
          <button onClick={() => handleAction('Download')} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><Download className="w-4 h-4" /></button>
          <button onClick={() => handleAction('Print')} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"><Printer className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
};

ReportCard.propTypes = {
  report: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    generatedDate: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    pages: PropTypes.number.isRequired,
    description: PropTypes.string,
  }).isRequired,
};

export default function Reports() {
  const [stats] = useState(mockStats);
  const [reports, setReports] = useState(mockReports);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReport = () => {
    setIsGenerating(true);
    window.showNotification?.({ type: 'info', title: 'Generating Report', message: 'Your new comprehensive report is being generated...' });
    setTimeout(() => {
      const newReport = { id: `RPT${Math.floor(Math.random() * 900) + 100}`, title: 'On-Demand Comprehensive Report', type: 'Generated Report', generatedDate: new Date().toISOString(), status: 'Ready', pages: 20, description: 'A newly generated report with the latest data.' };
      setReports(prev => [newReport, ...prev]);
      setIsGenerating(false);
      window.showNotification?.({ type: 'success', title: 'Report Ready!', message: 'Your new report has been successfully generated.' });
    }, 2000);
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-500">Comprehensive insights and performance metrics.</p>
          </div>
        </div>
        <button onClick={generateReport} disabled={isGenerating} className="mt-4 md:mt-0 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-3 rounded-2xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-wait">
          <Download className="w-5 h-5" />
          {isGenerating ? 'Generating...' : 'Generate New Report'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Patients" value={stats.totalPatients} icon={Users} color="bg-gradient-to-br from-blue-500 to-blue-600" />
        <StatCard title="Completed Sessions" value={stats.completedSessions} icon={Activity} color="bg-gradient-to-br from-green-500 to-green-600" />
        <StatCard title="Average Progress" value={stats.averageProgress} suffix="%" icon={TrendingUp} color="bg-gradient-to-br from-purple-500 to-purple-600" />
        <StatCard title="Active Staff" value={stats.activeStaff} icon={Briefcase} color="bg-gradient-to-br from-orange-500 to-orange-600" />
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-6">Generated Reports</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {reports.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>
    </div>
  );
}