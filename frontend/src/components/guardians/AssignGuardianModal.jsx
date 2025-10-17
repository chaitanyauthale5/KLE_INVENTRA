import PropTypes from 'prop-types';

export default function AssignGuardianModal({ isOpen, onClose, patient, onAssignmentComplete }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Assign Guardian</h2>
        <p className="text-sm text-gray-600 mb-4">
          This feature is coming soon. For now, you can close this dialog.
        </p>
        {patient && (
          <div className="mb-4 text-sm text-gray-700">
            <div><span className="font-medium">Patient:</span> {patient.full_name || patient.patient_id || patient.id}</div>
          </div>
        )}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >Close</button>
          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-green-600 text-white disabled:opacity-60"
            onClick={() => {
              onAssignmentComplete?.();
              onClose?.();
            }}
          >Mark Assigned</button>
        </div>
      </div>
    </div>
  );
}

AssignGuardianModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  patient: PropTypes.object,
  onAssignmentComplete: PropTypes.func,
};
