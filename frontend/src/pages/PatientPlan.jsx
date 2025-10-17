import React from "react";
import { CheckCircle, Clock } from "lucide-react";

export default function PatientPlan() {
  // Demo data – replace with data coming from doctor panel later
  const plan = {
    date: new Date().toISOString().slice(0, 10),
    morning: [
      { time: "6:30 AM", item: "Warm water with lemon and honey" },
      { time: "7:30 AM", item: "Light walk/Pranayama – 15 mins" },
      { time: "8:00 AM", item: "Moong dal porridge + 4 soaked almonds" },
    ],
    afternoon: [
      { time: "12:30 PM", item: "Steamed rice + dal + sautéed seasonal veggies" },
      { time: "3:30 PM", item: "Herbal tea (ginger-tulsi) + fruit (papaya)" },
    ],
    evening: [
      { time: "7:00 PM", item: "Khichdi with ghee + cucumber salad" },
      { time: "8:30 PM", item: "Golden milk (turmeric) – optional" },
    ],
    instructions: [
      "Hydrate well: 8–10 glasses of warm water spread across the day.",
      "Avoid cold/processed foods and heavy fried meals.",
      "Chew slowly; maintain consistent meal times.",
      "Light walk after lunch and dinner (5–10 mins).",
      "Sleep by 10:30 PM for optimal recovery.",
    ],
    prescribedBy: {
      name: "Dr. A. Sharma",
      note: "This is a sample plan for demonstration.",
    },
  };

  const Section = ({ title, entries }) => (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <div className="text-xs text-gray-500">{plan.date}</div>
      </div>
      <div className="space-y-3">
        {entries.map((e, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-gray-100">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-gray-500" />
              <div>
                <div className="text-sm font-medium text-gray-900">{e.item}</div>
                <div className="text-xs text-gray-500">Suggested time: {e.time}</div>
              </div>
            </div>
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Daily Plan</h1>
          <p className="text-gray-500">Diet and routine suggested by your doctor</p>
        </div>
        <div className="text-right text-xs text-gray-500">
          <div>Prescribed by</div>
          <div className="font-medium text-gray-700">{plan.prescribedBy.name}</div>
          <div>{plan.prescribedBy.note}</div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Morning" entries={plan.morning} />
        <Section title="Afternoon" entries={plan.afternoon} />
        <Section title="Evening" entries={plan.evening} />
      </div>

      {/* Instructions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-3">Instructions for Patient</h3>
        <ul className="list-disc pl-6 space-y-2 text-sm text-gray-700">
          {plan.instructions.map((i, idx) => (
            <li key={idx}>{i}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
