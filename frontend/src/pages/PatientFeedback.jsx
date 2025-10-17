import React, { useState, useEffect } from "react";
import { Star, Send } from "lucide-react";
import { Feedback, User } from "@/services";

export default function PatientFeedback({ currentUser }) {
  const [me, setMe] = useState(currentUser || null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    let mounted = true;
    if (!me) {
      User.me().then((u) => { if (mounted) setMe(u); });
    }
    return () => { mounted = false; };
  }, [me]);

  useEffect(() => {
    (async () => {
      try {
        const items = await Feedback.filter({ patient_user_id: me?.id }, "-created_date", 10).catch(() => []);
        setRecent(items || []);
      } catch {}
    })();
  }, [me?.id]);

  const submit = async () => {
    if (!me?.id) return;
    if (!rating || !message.trim()) return;
    try {
      setSubmitting(true);
      const payload = {
        rating,
        message: message.trim(),
        patient_user_id: me.id,
        hospital_id: me.hospital_id || me.hospitalId || undefined,
        audience: "clinic_admin",
      };
      await Feedback.create(payload);
      window.showNotification?.({ type: "success", title: "Thank you", message: "Your feedback was submitted." });
      setMessage("");
      setRating(0);
      const items = await Feedback.filter({ patient_user_id: me.id }, "-created_date", 10).catch(() => []);
      setRecent(items || []);
    } catch (e) {
      window.showNotification?.({ type: "error", title: "Failed", message: e?.details?.message || e.message || "Could not submit feedback" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Share Feedback with Clinic</h2>
        <p className="text-gray-500">Rate your experience and send a note to the clinic administrator.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-2">Your Rating</div>
            <div className="flex items-center gap-2">
              {[1,2,3,4,5].map((i) => (
                <button
                  key={i}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(i)}
                  className="p-2"
                >
                  <Star className={(hover || rating) >= i ? "w-7 h-7 text-yellow-400 fill-yellow-400" : "w-7 h-7 text-gray-300"} />
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-500">{rating ? `${rating}/5` : "Select rating"}</span>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-2">Message</div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Describe your experience, suggestions, or issues"
            />
          </div>

          <div className="flex justify-end">
            <button
              disabled={submitting || !rating || !message.trim()}
              onClick={submit}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-3 rounded-xl disabled:opacity-60"
            >
              <Send className="w-4 h-4" /> {submitting ? "Submitting..." : "Submit Feedback"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="font-semibold text-gray-800 mb-4">Recent Submissions</div>
          <div className="space-y-3">
            {recent && recent.length ? recent.map((f) => (
              <div key={f.id} className="border rounded-xl p-3">
                <div className="flex items-center gap-1 mb-1">
                  {[1,2,3,4,5].map((i) => (
                    <Star key={i} className={i <= (f.rating || 0) ? "w-4 h-4 text-yellow-400 fill-yellow-400" : "w-4 h-4 text-gray-300"} />
                  ))}
                </div>
                <div className="text-sm text-gray-700 line-clamp-3">{f.message}</div>
                {f.created_date && (
                  <div className="text-xs text-gray-400 mt-1">{new Date(f.created_date).toLocaleString()}</div>
                )}
              </div>
            )) : (
              <div className="text-sm text-gray-500">No feedback yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
