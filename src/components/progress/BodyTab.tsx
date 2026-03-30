"use client";

import { useState, useMemo } from "react";
import { format, parseISO, subMonths } from "date-fns";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import type { MeasurementEntry } from "@/lib/storage";

const FIELDS = [
  { key: "neck", label: "Neck" },
  { key: "chest", label: "Chest" },
  { key: "waist", label: "Waist" },
  { key: "hips", label: "Hips" },
  { key: "leftBicep", label: "L Bicep" },
  { key: "rightBicep", label: "R Bicep" },
  { key: "leftThigh", label: "L Thigh" },
  { key: "rightThigh", label: "R Thigh" },
  { key: "calves", label: "Calves" },
] as const;

const RADAR_FIELDS = [
  { key: "neck", label: "Neck" },
  { key: "chest", label: "Chest" },
  { key: "waist", label: "Waist" },
  { key: "hips", label: "Hips" },
  { key: "biceps", label: "Biceps" },
  { key: "thighs", label: "Thighs" },
  { key: "calves", label: "Calves" },
] as const;

const PERIODS = [
  { label: "1M", months: 1 },
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
  { label: "All", months: 0 },
] as const;

const TREND_FIELDS = [
  { key: "waist", label: "Waist" },
  { key: "chest", label: "Chest" },
  { key: "biceps", label: "Biceps (avg)" },
] as const;

function getRadarValues(entry: MeasurementEntry) {
  const e = entry as unknown as Record<string, unknown>;
  return {
    neck: (e.neck as number) || 0,
    chest: (e.chest as number) || 0,
    waist: (e.waist as number) || 0,
    hips: (e.hips as number) || 0,
    biceps: Math.round((((e.leftBicep as number) || 0) + ((e.rightBicep as number) || 0)) / 2) || 0,
    thighs: Math.round((((e.leftThigh as number) || 0) + ((e.rightThigh as number) || 0)) / 2) || 0,
    calves: (e.calves as number) || 0,
  };
}

export default function BodyTab({ measurements }: { measurements: MeasurementEntry[] }) {
  const [period, setPeriod] = useState(0); // 0 = All
  const [compareIdx, setCompareIdx] = useState<number>(-1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (period === 0) return measurements;
    const cutoff = subMonths(new Date(), period);
    return measurements.filter((m) => parseISO(m.date) >= cutoff);
  }, [measurements, period]);

  const latest = measurements[0];

  // Compute max values for normalization
  const maxValues = useMemo(() => {
    const max: Record<string, number> = {};
    for (const f of RADAR_FIELDS) max[f.key] = 0;
    for (const m of measurements) {
      const v = getRadarValues(m);
      for (const f of RADAR_FIELDS) {
        if (v[f.key as keyof typeof v] > (max[f.key] || 0)) max[f.key] = v[f.key as keyof typeof v];
      }
    }
    return max;
  }, [measurements]);

  const radarData = useMemo(() => {
    if (!latest) return [];
    const latestVals = getRadarValues(latest);
    const compareEntry = compareIdx >= 0 ? filtered[compareIdx] : null;
    const compareVals = compareEntry ? getRadarValues(compareEntry) : null;

    return RADAR_FIELDS.map((f) => {
      const maxVal = maxValues[f.key] || 1;
      const item: Record<string, unknown> = {
        field: f.label,
        current: Math.round((latestVals[f.key as keyof typeof latestVals] / maxVal) * 100),
        currentRaw: latestVals[f.key as keyof typeof latestVals],
      };
      if (compareVals) {
        item.compare = Math.round((compareVals[f.key as keyof typeof compareVals] / maxVal) * 100);
        item.compareRaw = compareVals[f.key as keyof typeof compareVals];
      }
      return item;
    });
  }, [latest, compareIdx, filtered, maxValues]);

  // Trend data for sparklines
  const trendData = useMemo(() => {
    const reversed = [...filtered].reverse();
    return TREND_FIELDS.map((tf) => ({
      ...tf,
      data: reversed.map((m) => {
        const v = getRadarValues(m);
        return {
          date: format(parseISO(m.date), "M/d"),
          value: v[tf.key as keyof typeof v] || null,
        };
      }).filter((d) => d.value != null),
    }));
  }, [filtered]);

  if (measurements.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-sm">No measurements recorded yet.</p>
        <p className="text-xs mt-1">Log your body measurements to see progress here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex gap-1.5">
        {PERIODS.map((p) => (
          <button
            key={p.label}
            onClick={() => setPeriod(p.months)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
              period === p.months ? "bg-teal-600 text-white" : "bg-slate-800 text-slate-400"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Radar chart */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-300">Body Shape</p>
          {filtered.length > 1 && (
            <select
              value={compareIdx}
              onChange={(e) => setCompareIdx(parseInt(e.target.value))}
              className="bg-slate-700 rounded-lg px-2 py-1 text-[10px] text-white outline-none"
            >
              <option value={-1}>No comparison</option>
              {filtered.slice(1).map((m, i) => (
                <option key={m.id} value={i + 1}>
                  {format(parseISO(m.date), "MMM d, yyyy")}
                </option>
              ))}
            </select>
          )}
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis
              dataKey="field"
              tick={{ fill: "#94a3b8", fontSize: 10 }}
            />
            <Radar
              name="Current"
              dataKey="current"
              stroke="#0d9488"
              fill="#0d9488"
              fillOpacity={0.25}
              strokeWidth={2}
            />
            {compareIdx >= 0 && (
              <Radar
                name="Compare"
                dataKey="compare"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            )}
          </RadarChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-4 mt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
            <span className="text-[10px] text-slate-400">
              Latest ({latest && format(parseISO(latest.date), "MMM d")})
            </span>
          </div>
          {compareIdx >= 0 && filtered[compareIdx] && (
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
              <span className="text-[10px] text-slate-400">
                {format(parseISO(filtered[compareIdx].date), "MMM d")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Trend sparklines */}
      {trendData.some((t) => t.data.length >= 2) && (
        <div className="bg-slate-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-300 mb-3">Trends</p>
          <div className="space-y-4">
            {trendData
              .filter((t) => t.data.length >= 2)
              .map((t) => (
                <div key={t.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-400">{t.label}</span>
                    <span className="text-[10px] text-white font-medium">
                      {t.data[t.data.length - 1]?.value} cm
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={60}>
                    <LineChart data={t.data}>
                      <XAxis dataKey="date" hide />
                      <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: 8, fontSize: 10 }}
                        labelStyle={{ color: "#94a3b8" }}
                        itemStyle={{ color: "#0d9488" }}
                        formatter={(v: unknown) => [`${v} cm`, t.label]}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#0d9488"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Measurement history */}
      <div>
        <p className="text-xs font-semibold text-slate-300 mb-2">History</p>
        <div className="space-y-2">
          {filtered.map((m) => {
            const isExpanded = expandedId === m.id;
            const vals = getRadarValues(m);
            const summary = [
              vals.waist && `W: ${vals.waist}`,
              vals.chest && `C: ${vals.chest}`,
              vals.biceps && `B: ${vals.biceps}`,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <button
                key={m.id}
                onClick={() => setExpandedId(isExpanded ? null : m.id)}
                className="w-full text-left bg-slate-800 rounded-xl px-4 py-3 transition hover:bg-slate-700/80"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-white">
                    {format(parseISO(m.date), "MMM d, yyyy")}
                  </p>
                  <p className="text-[10px] text-slate-400">{summary || "View details"}</p>
                </div>
                {isExpanded && (
                  <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-700">
                    {FIELDS.map((f) => {
                      const v = (m as unknown as Record<string, unknown>)[f.key] as number | undefined;
                      if (!v) return null;
                      return (
                        <div key={f.key} className="text-center">
                          <p className="text-[10px] text-slate-400">{f.label}</p>
                          <p className="text-xs text-white font-medium">{v} cm</p>
                        </div>
                      );
                    }).filter(Boolean)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
