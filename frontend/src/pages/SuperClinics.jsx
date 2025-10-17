import { useEffect, useState } from "react";
import { SuperAdmin, Patient, TherapySession, Hospital } from "@/services";
import { motion } from "framer-motion";
import { Building, MapPin, Users, Calendar, Activity, TrendingUp, RefreshCcw, Star, MoreVertical, Edit, Trash2, Plus } from "lucide-react";
import PropTypes from 'prop-types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function SuperClinics() {
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [clinics, setClinics] = useState({ items: [], total: 0, page: 1, limit: 20 });
  const [statsMap, setStatsMap] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [editingClinic, setEditingClinic] = useState(null);
  const [form, setForm] = useState({ name: "", city: "", state: "", email: "" });
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [clinicDetails, setClinicDetails] = useState({
    adminName: "",
    doctorCount: 0,
    therapistCount: 0,
    officeExecCount: 0,
    patientCount: 0,
    rating: null,
  });

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const data = await SuperAdmin.listClinics({ page, limit: 12, search });
        setClinics(data);

        // Load real-time summary per clinic from backend
        const summaries = await Promise.all(
          (data.items || []).map(async (c) => {
            const hospitalId = c._id || c.id;
            try {
              const s = await Hospital.summary(hospitalId);
              return [hospitalId, {
                totalPatients: Number(s?.totalPatients) || 0,
                totalDoctors: Number(s?.totalDoctors) || 0,
                totalSessions: Number(s?.totalSessions) || 0,
                todaySessions: Number(s?.todaySessions) || 0,
                completionRate: typeof s?.completionRate === 'number' ? Math.round(s.completionRate) : (Number(s?.completionRate) || 0),
                revenue: Number(s?.totalRevenue ?? s?.revenue) || 0,
                net: Number(s?.net) || (Number(s?.totalRevenue || 0) - Number(s?.totalExpenses || 0)),
                rating: typeof s?.avgRating === 'number' ? s.avgRating : (typeof c.avgRating === 'number' ? c.avgRating : null),
              }];
            } catch {
              return [hospitalId, {
                totalPatients: Number(c.totalPatients) || 0,
                totalDoctors: Number(c.totalDoctors) || 0,
                totalSessions: Number(c.totalSessions) || 0,
                todaySessions: Number(c.todaySessions) || 0,
                completionRate: Number(c.completionRate) || 0,
                revenue: Number(c.totalRevenue) || 0,
                net: Number(c.net) || 0,
                rating: typeof c.avgRating === 'number' ? c.avgRating : null,
              }];
            }
          })
        );

        const map = {};
        summaries.forEach(([id, s]) => { map[id] = s; });

        // Second pass: if totalPatients is 0 or missing, verify via Patient.filter()
        const clinicsNeedingPatients = (data.items || []).filter(c => {
          const id = c._id || c.id;
          const val = map[id]?.totalPatients;
          return !(typeof val === 'number' && val > 0);
        });

        if (clinicsNeedingPatients.length) {
          const patientCounts = await Promise.all(
            clinicsNeedingPatients.map(async (c) => {
              const id = c._id || c.id;
              try {
                const pts = await Patient.filter({ hospital_id: id });
                return [id, Array.isArray(pts) ? pts.length : 0];
              } catch {
                return [id, map[id]?.totalPatients || 0];
              }
            })
          );
          patientCounts.forEach(([id, count]) => {
            map[id] = { ...(map[id] || {}), totalPatients: count };
          });
        }

        setStatsMap(map);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [page, search]);

  const openCreate = () => {
    setEditingClinic(null);
    setForm({ name: "", city: "", state: "", email: "" });
    setShowModal(true);
  };

  const openEdit = (clinic) => {
    setEditingClinic(clinic);
    setForm({ name: clinic.name || "", city: clinic.city || "", state: clinic.state || "", email: clinic.email || "" });
    setShowModal(true);
  };

  const saveClinic = async (e) => {
    e?.preventDefault?.();
    try {
      setLoading(true);
      if (editingClinic) {
        await Hospital.update(editingClinic._id || editingClinic.id, form);
      } else {
        await Hospital.create(form);
      }
      setShowModal(false);
      // reload
      const data = await SuperAdmin.listClinics({ page, limit: 12, search });
      setClinics(data);
    } catch (err) {
      window.showNotification?.({ type: 'error', title: 'Failed', message: err?.details?.message || err.message || 'Operation failed' });
    } finally {
      setLoading(false);
    }
  };

  const deleteClinic = async (clinic) => {
    const id = clinic._id || clinic.id;
    if (!id) return;
    if (!window.confirm(`Delete clinic "${clinic.name}"? This cannot be undone.`)) return;
    try {
      setLoading(true);
      await Hospital.delete(id);
      const data = await SuperAdmin.listClinics({ page, limit: 12, search });
      setClinics(data);
      window.showNotification?.({ type: 'success', title: 'Deleted', message: 'Clinic removed.' });
    } catch (err) {
      window.showNotification?.({ type: 'error', title: 'Error', message: err?.details?.message || err.message || 'Delete failed' });
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (clinic) => {
    const id = clinic._id || clinic.id;
    setSelectedClinic(clinic);
    setDetailLoading(true);
    try {
      const [staffList, patients, feedbackData, summary] = await Promise.all([
        Hospital.listStaff(id).catch(() => []),
        Patient.filter({ hospital_id: id }).catch(() => []),
        SuperAdmin.listFeedbacks(id).catch(() => ({})),
        Hospital.summary(id).catch(() => ({})),
      ]);
      const admin = staffList.find(s => s.role === 'clinic_admin');
      const doctors = staffList.filter(s => s.role === 'doctor').length;
      const therapists = staffList.filter(s => s.role === 'therapist').length;
      const execs = staffList.filter(s => s.role === 'office_executive').length;
      const feedbacks = Array.isArray(feedbackData?.feedbacks) ? feedbackData.feedbacks : (Array.isArray(feedbackData) ? feedbackData : []);
      let rating = null;
      if (feedbacks.length) {
        const nums = feedbacks
          .map(f => (typeof f?.rating === 'number' ? f.rating : (typeof f?.score === 'number' ? f.score : null)))
          .filter(v => typeof v === 'number');
        if (nums.length) rating = nums.reduce((a,b)=>a+b,0) / nums.length;
      }
      if (rating == null && typeof clinic.avgRating === 'number') rating = clinic.avgRating;
      setClinicDetails({
        adminName: admin?.full_name || admin?.name || "-",
        doctorCount: typeof summary?.totalDoctors === 'number' ? summary.totalDoctors : doctors,
        therapistCount: typeof summary?.totalTherapists === 'number' ? summary.totalTherapists : therapists,
        officeExecCount: typeof summary?.totalOfficeExecutives === 'number' ? summary.totalOfficeExecutives : execs,
        patientCount: typeof summary?.totalPatients === 'number' ? summary.totalPatients : (Array.isArray(patients) ? patients.length : 0),
        rating,
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const ClinicCard = ({ clinic }) => {
    const id = clinic._id || clinic.id;
    const s = statsMap[id] || {};
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 group cursor-pointer"
        onClick={() => openDetails(clinic)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center">
              <Building className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-1">{clinic.name}</h3>
              {(clinic.city || clinic.state) && (
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span>{[clinic.city, clinic.state].filter(Boolean).join(', ')}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">BASIC</span>
                {typeof s.rating === 'number' && (
                  <span className="text-xs text-gray-600 flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" /> {s.rating.toFixed(2)}</span>
                )}
              </div>
            </div>
          </div>
          <div className="relative group/actions">
            <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg" title="More actions" onClick={(e)=>e.stopPropagation()}>
              <MoreVertical className="w-4 h-4" />
            </button>
            <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-gray-200 py-2 opacity-0 invisible group-hover/actions:opacity-100 group-hover/actions:visible transition-all z-10 min-w-[160px] transform origin-top-right scale-95 group-hover/actions:scale-100">
              <button onClick={(e)=>{ e.stopPropagation(); openEdit(clinic); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"><Edit className="w-4 h-4" /> Manage Clinic</button>
              <button onClick={(e)=>{ e.stopPropagation(); deleteClinic(clinic); }} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete Clinic</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <Users className="w-4 h-4 text-blue-600 mr-1" />
              <span className="text-lg font-bold text-blue-600">{s.totalPatients || 0}</span>
            </div>
            <div className="text-xs text-gray-500">Patients</div>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <Calendar className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-lg font-bold text-green-600">{s.todaySessions || 0}</span>
            </div>
            <div className="text-xs text-gray-500">Today</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <Activity className="w-4 h-4 text-purple-600 mr-1" />
              <span className="text-lg font-bold text-purple-600">{s.totalSessions || 0}</span>
            </div>
            <div className="text-xs text-gray-500">Sessions</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="w-4 h-4 text-orange-600 mr-1" />
              <span className="text-lg font-bold text-orange-600">{s.completionRate || 0}%</span>
            </div>
            <div className="text-xs text-gray-500">Complete</div>
          </div>
        </div>

        <div className="text-xs text-gray-600 mt-2">
          Revenue ₹{(s.revenue||0).toLocaleString()} · Net ₹{(s.net||0).toLocaleString()} · Doctors {s.totalDoctors || 0}
        </div>
      </motion.div>
    );
  };

  ClinicCard.propTypes = {
    clinic: PropTypes.object.isRequired
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center">
            <Building className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clinics</h1>
            <p className="text-gray-500">Managed facilities</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search clinics..."
            value={search}
            onChange={(e)=>{ setPage(1); setSearch(e.target.value); }}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <button onClick={()=>setPage(1)} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center gap-2">
            <RefreshCcw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={openCreate} className="hidden md:flex items-center gap-2 bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-2 rounded-xl hover:shadow-lg transition-all">
            <Plus className="w-4 h-4" /> Assign New Clinic
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="h-40 bg-gray-200 rounded-2xl animate-pulse" />
          <div className="h-40 bg-gray-200 rounded-2xl animate-pulse" />
          <div className="h-40 bg-gray-200 rounded-2xl animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {(clinics.items || []).map((c) => (
            <ClinicCard key={c._id || c.id} clinic={c} />
          ))}
        </div>
      )}

      {(!clinics.items || clinics.items.length === 0) && !loading && (
        <div className="text-center text-gray-500 py-12">No clinics found</div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl" onClick={(e)=>e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4">{editingClinic ? 'Manage Clinic' : 'Assign New Clinic'}</h3>
            <form onSubmit={saveClinic} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500">Name</label>
                <input value={form.name} onChange={(e)=>setForm(f=>({...f, name:e.target.value}))} className="w-full border rounded-lg px-3 py-2" placeholder="Clinic name" required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500">City</label>
                  <input value={form.city} onChange={(e)=>setForm(f=>({...f, city:e.target.value}))} className="w-full border rounded-lg px-3 py-2" placeholder="City" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">State</label>
                  <input value={form.state} onChange={(e)=>setForm(f=>({...f, state:e.target.value}))} className="w-full border rounded-lg px-3 py-2" placeholder="State" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500">Email</label>
                <input type="email" value={form.email} onChange={(e)=>setForm(f=>({...f, email:e.target.value}))} className="w-full border rounded-lg px-3 py-2" placeholder="contact@example.com" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={()=>setShowModal(false)} className="px-4 py-2 rounded-lg bg-gray-100">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-green-600 text-white">{editingClinic ? 'Save Changes' : 'Create Clinic'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={!!selectedClinic} onOpenChange={(open)=>{ if (!open) setSelectedClinic(null); }}>
        <DialogContent className="sm:max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>{selectedClinic?.name || 'Clinic Details'}</DialogTitle>
            <DialogDescription>
              {selectedClinic ? ([selectedClinic.city, selectedClinic.state].filter(Boolean).join(', ') || '—') : ''}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-6">Loading details...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-xs text-gray-500 mb-1">Clinic Admin</div>
                  <div className="text-sm font-medium text-gray-800">{clinicDetails.adminName || '-'}</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-xs text-gray-500 mb-1">Total Rating</div>
                  <div className="text-sm font-medium text-gray-800 flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    {typeof clinicDetails.rating === 'number' ? clinicDetails.rating.toFixed(2) : '—'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <div className="text-xs text-gray-500 mb-1">Doctors</div>
                  <div className="text-xl font-bold text-blue-700">{clinicDetails.doctorCount}</div>
                </div>
                <div className="bg-teal-50 rounded-xl p-4 text-center">
                  <div className="text-xs text-gray-500 mb-1">Therapists</div>
                  <div className="text-xl font-bold text-teal-700">{clinicDetails.therapistCount}</div>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 text-center">
                  <div className="text-xs text-gray-500 mb-1">Office Executives</div>
                  <div className="text-xl font-bold text-orange-700">{clinicDetails.officeExecCount}</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <div className="text-xs text-gray-500 mb-1">Patients</div>
                  <div className="text-xl font-bold text-purple-700">{clinicDetails.patientCount}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// no props required
