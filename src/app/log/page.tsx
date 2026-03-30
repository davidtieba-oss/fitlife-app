"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Trash2, TrendingUp, TrendingDown } from "lucide-react";
import {
  getMetrics,
  saveMetric,
  deleteMetric,
  type MetricEntry,
} from "@/lib/storage";
import Toast from "@/components/Toast";

export default function LogPage() {
  const [mounted, setMounted] = useState(false);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [notes, setNotes] = useState("");
  const [metrics, setMetrics] = useState<MetricEntry[]>([]);
  const [toast, setToast] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const refresh = useCallback(() => setMetrics(getMetrics()), []);

  useEffect(() => {
    setMounted(true);
    refresh();
  }, [refresh]);

  if (!mounted) {
    return <div className="h-screen flex items-center justify-center text-slate-500">Loading...</div>;
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    const w = parseFloat(weight);
    if (!weight || isNaN(w)) errs.weight = "Required";
    else if (w < 30 || w > 300) errs.weight = "Must be 30-300 kg";
    if (bodyFat) {
      const bf = parseFloat(bodyFat);
      if (isNaN(bf) || bf < 3 || bf > 60) errs.bodyFat = "Must be 3-60%";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    saveMetric({
      date,
      weight: parseFloat(weight),
      bodyFat: bodyFat ? parseFloat(bodyFat) : undefined,
      notes: notes || undefined,
    });
    setWeight("");
    setBodyFat("");
    setNotes("");
    setToast("Entry saved!");
    refresh();
  }

  function handleDelete(id: string) {
    deleteMetric(id);
    refresh();
  }

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <h1 className="text-xl font-bold">Log Body Metrics</h1>

      <form onSubmit={handleSubmit} className="bg-slate-800 rounded-2xl p-4 space-y-4">
        <div>
          <label className="text-xs text-slate-400 font-medium">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full mt-1 bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 font-medium">Weight (kg) *</label>
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="72.5"
            className="w-full mt-1 bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500"
          />
          {errors.weight && (
            <p className="text-xs text-red-400 mt-1">{errors.weight}</p>
          )}
        </div>
        <div>
          <label className="text-xs text-slate-400 font-medium">Body Fat % (optional)</label>
          <input
            type="number"
            step="0.1"
            value={bodyFat}
            onChange={(e) => setBodyFat(e.target.value)}
            placeholder="18.5"
            className="w-full mt-1 bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500"
          />
          {errors.bodyFat && (
            <p className="text-xs text-red-400 mt-1">{errors.bodyFat}</p>
          )}
        </div>
        <div>
          <label className="text-xs text-slate-400 font-medium">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Feeling good today..."
            className="w-full mt-1 bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500 resize-none"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-teal-600 hover:bg-teal-500 text-white py-2.5 rounded-xl text-sm font-semibold transition active:scale-[0.98]"
        >
          Save Entry
        </button>
      </form>

      {/* Recent Entries */}
      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-2">Recent Entries</h2>
        {metrics.length === 0 ? (
          <p className="text-sm text-slate-500">No entries yet.</p>
        ) : (
          <div className="space-y-2">
            {metrics.slice(0, 10).map((m, i) => {
              const prev = metrics[i + 1];
              const diff = prev ? m.weight - prev.weight : 0;
              return (
                <div
                  key={m.id}
                  className="bg-slate-800 rounded-xl px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {format(parseISO(m.date), "MMM d, yyyy")}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-400">
                        {m.weight} kg
                      </span>
                      {m.bodyFat !== undefined && (
                        <span className="text-xs text-slate-400">
                          {m.bodyFat}% BF
                        </span>
                      )}
                      {diff !== 0 && (
                        <span
                          className={`flex items-center gap-0.5 text-xs ${
                            diff > 0 ? "text-red-400" : "text-green-400"
                          }`}
                        >
                          {diff > 0 ? (
                            <TrendingUp size={12} />
                          ) : (
                            <TrendingDown size={12} />
                          )}
                          {Math.abs(diff).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="text-slate-500 hover:text-red-400 p-1 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
