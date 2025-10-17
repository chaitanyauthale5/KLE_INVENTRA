import { useState, useEffect } from "react";
import { Notification, Hospital } from "@/services";
import { User } from "@/services";
import { Bell, Check, X, AlertTriangle, Calendar, Edit, Shield, Send, Search, Building2 } from "lucide-react";
import { formatDistanceToNow, isWithinInterval } from "date-fns";


export default function NotificationsPage() {
  // Incoming/Outgoing segregation
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [activeTab, setActiveTab] = useState('incoming'); // incoming | outgoing
  const [isLoading, setIsLoading] = useState(true);
  const [me, setMe] = useState(null);

  // filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all"); // all|unread|read
  const [filterClinic, setFilterClinic] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [clinics, setClinics] = useState([]);

  // compose (super admin -> clinics)
  const [compose, setCompose] = useState({
    title: "",
    message: "",
    type: "general",
    priority: "normal", // normal|high
    clinicIds: [],
  });
  const [sending, setSending] = useState(false);

  // clinic admin compose -> doctors/office_executives in own clinic
  const [clinicCompose, setClinicCompose] = useState({
    title: '',
    message: '',
    type: 'general',
    priority: 'normal',
    roles: ['doctor','office_executive'],
    userIds: [],
  });
  const [clinicStaff, setClinicStaff] = useState([]);

  // drafts (persist per user in localStorage)
  const [drafts, setDrafts] = useState([]); // [{id, kind:'super'|'clinic', title, updatedAt, data}]

  useEffect(() => {
    (async () => {
      try {
        const user = await User.me();
        setMe(user);
        // load drafts for this user
        try {
          const raw = localStorage.getItem(`notif_drafts_${user.id}`);
          if (raw) setDrafts(JSON.parse(raw));
        } catch (e) { console.debug('Failed to load drafts', e); }
        // preload clinics for super admin
        if (user.role === 'super_admin') {
          const list = await Hospital.list();
          setClinics(list);
        }

        // preload clinic staff for clinic_admin
        if (user.role === 'clinic_admin' && user.hospital_id) {
          const staff = await Hospital.listStaff(user.hospital_id).catch(() => []);
          setClinicStaff(staff || []);
        }

        // load incoming and outgoing lists
        const [inc, out] = await Promise.all([
          Notification.filter({ recipient_id: user.id }, "-created_date", 100).catch(() => []),
          Notification.filter({ sender_id: user.id }, "-created_date", 100).catch(() => []),
        ]);
        setIncoming(inc || []);
        setOutgoing(out || []);
      } catch (error) {
        console.error("Failed to load notifications:", error);
      }
      setIsLoading(false);
    })();
  }, []);

  // helpers to persist drafts
  const persistDrafts = (arr, userId = me?.id) => {
    setDrafts(arr);
    try { if (userId) localStorage.setItem(`notif_drafts_${userId}`, JSON.stringify(arr)); } catch (e) { console.debug('Failed to persist drafts', e); }
  };
  const saveDraft = (kind) => {
    const now = new Date().toISOString();
    if (kind === 'super') {
      if (!compose.title && !compose.message) return;
      const d = { id: crypto.randomUUID?.() || String(Date.now()), kind, title: compose.title || 'Untitled', updatedAt: now, data: { ...compose } };
      persistDrafts([d, ...drafts], me?.id);
      window.showNotification?.({ type: 'success', title: 'Draft saved', message: 'Your draft has been saved.' });
    } else {
      if (!clinicCompose.title && !clinicCompose.message) return;
      const d = { id: crypto.randomUUID?.() || String(Date.now()), kind, title: clinicCompose.title || 'Untitled', updatedAt: now, data: { ...clinicCompose } };
      persistDrafts([d, ...drafts], me?.id);
      window.showNotification?.({ type: 'success', title: 'Draft saved', message: 'Your draft has been saved.' });
    }
  };
  const loadDraft = (d) => {
    if (d.kind === 'super') setCompose(d.data);
    if (d.kind === 'clinic') setClinicCompose(d.data);
  };
  const deleteDraft = (id) => {
    const next = drafts.filter(x => x.id !== id);
    persistDrafts(next, me?.id);
  };

  const markAsRead = async (id) => {
    try {
      await Notification.update(id, { is_read: true });
      setIncoming(incoming.map(n => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const toggleClinicInCompose = (id) => {
    setCompose((c) => {
      const exists = c.clinicIds.includes(id);
      const clinicIds = exists ? c.clinicIds.filter(x => x !== id) : [...c.clinicIds, id];
      return { ...c, clinicIds };
    });
  };

  const sendNotifications = async () => {
    if (!compose.title.trim() || !compose.message.trim()) {
      window.showNotification?.({ type: 'error', title: 'Missing fields', message: 'Title and message are required.' });
      return;
    }
    if (!compose.clinicIds.length) {
      window.showNotification?.({ type: 'error', title: 'No clinics selected', message: 'Pick at least one clinic.' });
      return;
    }
    try {
      setSending(true);
      // One message per clinic to target its clinic_admins (server implementation-dependent)
      await Promise.all(
        compose.clinicIds.map((hospital_id) =>
          Notification.create({
            title: compose.title,
            message: compose.message,
            type: compose.type,
            priority: compose.priority,
            audience: 'clinic_admin',
            hospital_id,
          })
        )
      );
      window.showNotification?.({ type: 'success', title: 'Sent', message: 'Notifications sent.' });
      // refresh sent list for super admin
      if (me?.role === 'super_admin') {
        const sent = await Notification.filter({ sender_id: me.id }, "-created_date", 100).catch(() => []);
        setOutgoing(sent || []);
        setActiveTab('outgoing');
      }
      setCompose({ title: '', message: '', type: 'general', priority: 'normal', clinicIds: [] });
    } catch (err) {
      console.error(err);
      window.showNotification?.({ type: 'error', title: 'Failed to send', message: err?.details?.message || err.message || 'Could not send notifications' });
    } finally {
      setSending(false);
    }
  };

  const sendClinicNotifications = async () => {
    if (!clinicCompose.title.trim() || !clinicCompose.message.trim()) {
      return window.showNotification?.({ type: 'error', title: 'Missing fields', message: 'Title and message are required.' });
    }
    if (!me?.hospital_id) {
      return window.showNotification?.({ type: 'error', title: 'No hospital', message: 'Your account is not linked to a hospital.' });
    }
    try {
      setSending(true);
      // Determine recipient set
      let recipients = [];
      if (clinicCompose.userIds.length) {
        recipients = clinicStaff.filter(u => clinicCompose.userIds.includes(u.id || u._id));
      } else {
        const roleSet = new Set(clinicCompose.roles);
        recipients = clinicStaff.filter(u => roleSet.has(u.role));
      }
      if (!recipients.length) {
        return window.showNotification?.({ type: 'error', title: 'No recipients', message: 'Select at least one role or person.' });
      }
      await Promise.all(
        recipients.map(u => Notification.create({
          title: clinicCompose.title,
          message: clinicCompose.message,
          type: clinicCompose.type,
          priority: clinicCompose.priority,
          recipient_id: u.id || u._id,
          hospital_id: me.hospital_id,
        }))
      );
      window.showNotification?.({ type: 'success', title: 'Sent', message: `Sent to ${recipients.length} recipient(s).` });
      // refresh outgoing list
      const out = await Notification.filter({ sender_id: me.id }, "-created_date", 100).catch(() => []);
      setOutgoing(out || []);
      setActiveTab('outgoing');
      setClinicCompose({ title: '', message: '', type: 'general', priority: 'normal', roles: ['doctor','office_executive'], userIds: [] });
    } catch (err) {
      console.error(err);
      window.showNotification?.({ type: 'error', title: 'Failed to send', message: err?.details?.message || err.message || 'Could not send notifications' });
    } finally {
      setSending(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = incoming.filter(n => !n.is_read).map(n => n.id);
      await Promise.all(unreadIds.map(id => Notification.update(id, { is_read: true })));
      setIncoming(incoming.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case "pre_therapy":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "post_therapy":
        return <Check className="w-5 h-5 text-green-500" />;
      case "schedule_change":
        return <Calendar className="w-5 h-5 text-blue-500" />;
      case "feedback_request":
        return <Edit className="w-5 h-5 text-purple-500" />;
      case "guardian_assignment":
        return <Shield className="w-5 h-5 text-indigo-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  // Only admins can send; patients should never see outgoing
  const canSend = me?.role === 'super_admin' || me?.role === 'clinic_admin' || me?.role === 'doctor' || me?.role === 'office_executive';
  const list = canSend && activeTab === 'outgoing' ? outgoing : incoming;
  const filteredNotifications = list.filter((n) => {
    // status filter
    if (filterStatus === 'unread') {
      if (n.is_read) return false;
    } else if (filterStatus === 'read') {
      if (!n.is_read) return false;
    }
    // rich filters
    if (filterType !== 'all' && n.type !== filterType) return false;
    if (filterClinic !== 'all' && String(n.hospital_id || n.clinic_id) !== String(filterClinic)) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const text = `${n.title || ''} ${n.message || ''}`.toLowerCase();
      if (!text.includes(s)) return false;
    }
    if (dateFrom || dateTo) {
      const d = new Date(n.created_date || n.createdAt || n.date);
      const from = dateFrom ? new Date(dateFrom) : new Date('1970-01-01');
      const to = dateTo ? new Date(dateTo) : new Date('2999-12-31');
      if (!isWithinInterval(d, { start: from, end: to })) return false;
    }
    return true;
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications Hub</h1>
            <p className="text-gray-500">{me?.role === 'super_admin' ? 'Create and send announcements to clinics' : 'Incoming alerts and your sent messages'}</p>
          </div>
        </div>
        {activeTab === 'incoming' && me?.role !== 'super_admin' && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-xl hover:bg-blue-200 transition-colors"
          >
            <Check className="w-4 h-4" />
            Mark All as Read
          </button>
        )}
      </div>

      {/* Tabs (only for roles that can send) */}
      {canSend && (
        <div className="flex items-center gap-2 mb-6">
          <button onClick={()=>setActiveTab('incoming')} className={`px-4 py-2 rounded-xl border ${activeTab==='incoming'?'bg-white shadow':'bg-gray-50 hover:bg-white'} `}>Incoming</button>
          <button onClick={()=>setActiveTab('outgoing')} className={`px-4 py-2 rounded-xl border ${activeTab==='outgoing'?'bg-white shadow':'bg-gray-50 hover:bg-white'} `}>Outgoing</button>
        </div>
      )}

      {/* Super Admin Composer (Outgoing tab) */}
      {activeTab === 'outgoing' && me?.role === 'super_admin' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4 text-gray-700 font-semibold">
            <Send className="w-4 h-4" /> Compose Notification
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <input value={compose.title} onChange={(e)=>setCompose(c=>({...c, title:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-4 py-3" placeholder="Title" />
            </div>
            <select value={compose.type} onChange={(e)=>setCompose(c=>({...c, type:e.target.value}))} className="border border-gray-200 rounded-xl px-4 py-3">
              <option value="general">General</option>
              <option value="schedule_change">Schedule Change</option>
              <option value="pre_therapy">Pre-Therapy</option>
              <option value="post_therapy">Post-Therapy</option>
            </select>
          </div>
          <textarea value={compose.message} onChange={(e)=>setCompose(c=>({...c, message:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4" rows={4} placeholder="Write your message..." />

          {/* Clinic multi-select */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2 text-sm text-gray-600"><Building2 className="w-4 h-4" /> Select Clinics</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-36 overflow-auto">
              {clinics.map((c)=>{
                const id = c.id || c._id;
                const checked = compose.clinicIds.includes(id);
                return (
                  <label key={id} className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer ${checked ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
                    <input type="checkbox" className="accent-blue-600" checked={checked} onChange={()=>toggleClinicInCompose(id)} />
                    <span className="text-sm text-gray-700 truncate">{c.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <select value={compose.priority} onChange={(e)=>setCompose(c=>({...c, priority:e.target.value}))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
              <option value="normal">Priority: Normal</option>
              <option value="high">Priority: High</option>
            </select>
            <button onClick={()=>saveDraft('super')} className="px-4 py-2 border rounded-xl hover:bg-gray-50">Save Draft</button>
            <button disabled={sending} onClick={sendNotifications} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-2 rounded-xl hover:shadow-lg transition-all disabled:opacity-60">
              <Send className="w-4 h-4" /> {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {/* Clinic Admin Composer (Outgoing tab) */}
      {activeTab === 'outgoing' && me?.role === 'clinic_admin' && me?.hospital_id && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4 text-gray-700 font-semibold">
            <Send className="w-4 h-4" /> Compose to Clinic Staff
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <input value={clinicCompose.title} onChange={(e)=>setClinicCompose(c=>({...c, title:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-4 py-3" placeholder="Title" />
            </div>
            <select value={clinicCompose.type} onChange={(e)=>setClinicCompose(c=>({...c, type:e.target.value}))} className="border border-gray-200 rounded-xl px-4 py-3">
              <option value="general">General</option>
              <option value="schedule_change">Schedule Change</option>
              <option value="pre_therapy">Pre-Therapy</option>
              <option value="post_therapy">Post-Therapy</option>
            </select>
          </div>
          <textarea value={clinicCompose.message} onChange={(e)=>setClinicCompose(c=>({...c, message:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4" rows={3} placeholder="Write your message..." />

          {/* Simple roles selector */}
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-2">Target Roles</div>
            <div className="flex flex-wrap gap-2">
              {['doctor','office_executive'].map(role => {
                const checked = clinicCompose.roles.includes(role);
                return (
                  <label key={role} className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer ${checked ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
                    <input type="checkbox" className="accent-blue-600" checked={checked} onChange={()=>setClinicCompose(c=>({...c, roles: checked ? c.roles.filter(r=>r!==role) : [...c.roles, role]}))} />
                    <span className="text-sm capitalize">{role.replace('_',' ')}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <select value={clinicCompose.priority} onChange={(e)=>setClinicCompose(c=>({...c, priority:e.target.value}))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
              <option value="normal">Priority: Normal</option>
              <option value="high">Priority: High</option>
            </select>
            <button onClick={()=>saveDraft('clinic')} className="px-4 py-2 border rounded-xl hover:bg-gray-50">Save Draft</button>
            <button disabled={sending} onClick={sendClinicNotifications} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-2 rounded-xl hover:shadow-lg transition-all disabled:opacity-60">
              <Send className="w-4 h-4" /> {sending ? 'Sending...' : 'Send to Staff'}
            </button>
          </div>
        </div>
      )}

      {/* Drafts panel (Outgoing tab) */}
      {activeTab === 'outgoing' && drafts.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="text-sm font-semibold text-gray-700 mb-3">Your Drafts</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {drafts.map(d => (
              <div key={d.id} className="border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-800 truncate">{d.title}</div>
                  <div className="text-xs text-gray-400">{d.kind === 'super' ? 'To Clinics' : 'To Staff'} • {new Date(d.updatedAt).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>loadDraft(d)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">Load</button>
                  <button onClick={()=>deleteDraft(d.id)} className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters row */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-col md:flex-row gap-3 items-stretch">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} placeholder="Search title or message..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl" />
        </div>
        <div className="flex gap-2">
          <select value={filterType} onChange={(e)=>setFilterType(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5">
            <option value="all">All Types</option>
            <option value="general">General</option>
            <option value="schedule_change">Schedule Change</option>
            <option value="pre_therapy">Pre-Therapy</option>
            <option value="post_therapy">Post-Therapy</option>
          </select>
          <select value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5">
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
          <select value={filterClinic} onChange={(e)=>setFilterClinic(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5">
            <option value="all">All Clinics</option>
            {clinics.map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <input type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5" />
          <input type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5" />
        </div>
      </div>

      {/* Notifications List (by tab) */}
      <div className="space-y-4">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-2xl p-6 animate-pulse h-24"></div>
          ))
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map((n) => (
            <div
              key={n.id}
              className={`p-6 rounded-2xl transition-all duration-300 flex items-start gap-4 ${
                n.is_read ? "bg-gray-50" : "bg-blue-50 border border-blue-200"
              }`}
            >
              {!n.is_read && (
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
              )}
              <div className="flex-shrink-0">{getIconForType(n.type)}</div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-800">{n.title}</h3>
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(n.created_date), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-gray-600 mt-1">{n.message}</p>
                {(n.hospital_id || n.clinic_id) && (
                  <div className="text-xs text-gray-400 mt-1">Clinic: {String(n.hospital_id || n.clinic_id)}</div>
                )}
              </div>
              {activeTab === 'incoming' && me?.role !== 'super_admin' && !n.is_read && (
                <button
                  onClick={() => markAsRead(n.id)}
                  className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-16">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500">No {activeTab} notifications</h3>
            <p className="text-gray-400">{activeTab==='outgoing' ? 'Your sent messages will appear here.' : (me?.role === 'super_admin' ? 'No incoming announcements.' : "You're all caught up!")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
