import React, { useEffect, useState, useMemo } from "react";
import { Feedback, User } from "@/services";
import { Star, RefreshCw, Search, Send, MessageSquare } from "lucide-react";

export default function ClinicFeedbacks({ currentUser }) {
  const [me, setMe] = useState(currentUser || null);
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all"); // all|5|4+|3+|2-|1
  const [editingId, setEditingId] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!me) {
      User.me().then((u) => { if (mounted) setMe(u); });
    }
    return () => { mounted = false; };
  }, [me]);

  const load = async () => {
    if (!me?.hospital_id && !me?.hospitalId) return;
    try {
      setLoading(true);
      const items = await Feedback.filter({ hospital_id: me.hospital_id || me.hospitalId }, "-created_at", 100).catch(() => []);
      setList(Array.isArray(items) ? items : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [me?.hospital_id, me?.hospitalId]);

  const filtered = useMemo(() => {
    let arr = list;
    if (ratingFilter !== "all") {
      if (ratingFilter === "4+") arr = arr.filter((x) => (x.rating || 0) >= 4);
      else if (ratingFilter === "3+") arr = arr.filter((x) => (x.rating || 0) >= 3);
      else if (ratingFilter === "2-") arr = arr.filter((x) => (x.rating || 0) <= 2);
      else if (ratingFilter === "5") arr = arr.filter((x) => (x.rating || 0) === 5);
      else if (ratingFilter === "1") arr = arr.filter((x) => (x.rating || 0) === 1);
    }
    if (search) {
      const s = search.toLowerCase();
      arr = arr.filter((x) => `${x.message || ""}`.toLowerCase().includes(s));
    }
    return arr;
  }, [list, ratingFilter, search]);

  const startRespond = (f) => {
    setEditingId(f.id);
    setResponseText(f.admin_response || "");
  };

  const cancelRespond = () => {
    setEditingId(null);
    setResponseText("");
  };

  const saveRespond = async (id) => {
    if (!responseText.trim()) return;
    try {
      setSaving(true);
      await Feedback.update(id, { admin_response: responseText.trim() });
      await load();
      cancelRespond();
      window.showNotification?.({ type: "success", title: "Saved", message: "Response sent to patient." });
    } catch (e) {
      window.showNotification?.({ type: "error", title: "Failed", message: e?.details?.message || e.message || "Could not save response" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Patient Feedback</h2>
          <p className="text-gray-500">Feedback submitted by patients for your clinic.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 bg-white border rounded-xl px-4 py-2 hover:bg-gray-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-col md:flex-row gap-3 items-stretch">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search feedback..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl" />
        </div>
        <div>
          <select value={ratingFilter} onChange={(e)=>setRatingFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5">
            <option value="all">All Ratings</option>
            <option value="5">5 stars</option>
            <option value="4+">4+ stars</option>
            <option value="3+">3+ stars</option>
            <option value="2-">2 or below</option>
            <option value="1">1 star</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          [...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)
        ) : filtered.length ? (
          filtered.map((f) => (
            <div key={f.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    {[1,2,3,4,5].map((i) => (
                      <Star key={i} className={i <= (f.rating || 0) ? "w-4 h-4 text-yellow-400 fill-yellow-400" : "w-4 h-4 text-gray-300"} />
                    ))}
                  </div>
                  <div className="text-gray-800">{f.message}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Patient: {f.patient_name ? f.patient_name : String(f.patient_user_id || "Unknown")}
                  </div>
                  {/* Admin response section */}
                  {f.admin_response ? (
                    <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" /> Admin response
                      </div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">{f.admin_response}</div>
                    </div>
                  ) : (
                    <div className="mt-3">
                      {editingId === f.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={responseText}
                            onChange={(e)=>setResponseText(e.target.value)}
                            rows={3}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2"
                            placeholder="Write a response to the patient..."
                          />
                          <div className="flex items-center gap-2">
                            <button disabled={saving || !responseText.trim()} onClick={()=>saveRespond(f.id)} className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl disabled:opacity-60">
                              <Send className="w-4 h-4" /> {saving ? 'Saving...' : 'Send Response'}
                            </button>
                            <button disabled={saving} onClick={cancelRespond} className="px-3 py-2 rounded-xl border">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={()=>startRespond(f)} className="text-sm text-blue-600 hover:underline">Respond</button>
                      )}
                    </div>
                  )}
                </div>
                {f.created_date && (
                  <div className="text-xs text-gray-400">{new Date(f.created_date).toLocaleString()}</div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <div className="flex items-center justify-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 text-gray-300" />)}
            </div>
            <div className="text-gray-500">No feedback yet.</div>
          </div>
        )}
      </div>
    </div>
  );
}
