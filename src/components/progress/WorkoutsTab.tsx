"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Flame, Trophy, Dumbbell, Activity, Medal } from "lucide-react";
import { type WorkoutEntry } from "@/lib/storage";
import {
  computeWorkoutsPerWeek,
  computeWorkoutStreaks,
  computeWeeklyVolume,
  computePersonalRecords,
} from "@/lib/progress-utils";

const TOOLTIP_STYLE = {
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#fff",
};

interface Props {
  workouts: WorkoutEntry[];
}

export default function WorkoutsTab({ workouts }: Props) {
  const weeklyData = useMemo(() => computeWorkoutsPerWeek(workouts), [workouts]);
  const streaks = useMemo(() => computeWorkoutStreaks(workouts), [workouts]);
  const volumeData = useMemo(() => computeWeeklyVolume(workouts), [workouts]);
  const prs = useMemo(() => computePersonalRecords(workouts), [workouts]);

  const hasVolume = volumeData.some((v) => v.volume > 0);

  return (
    <div className="space-y-3">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={<Activity size={16} className="text-teal-400" />}
          label="Total Workouts"
          value={streaks.totalWorkouts}
        />
        <StatCard
          icon={<Flame size={16} className="text-orange-400" />}
          label="Current Streak"
          value={`${streaks.currentStreak}w`}
        />
        <StatCard
          icon={<Trophy size={16} className="text-amber-400" />}
          label="Longest Streak"
          value={`${streaks.longestStreak}w`}
        />
        <StatCard
          icon={<Dumbbell size={16} className="text-cyan-400" />}
          label="Most Common"
          value={streaks.mostCommonType || "—"}
          small
        />
      </div>

      {/* Workouts per week bar chart */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <p className="text-xs text-slate-400 font-medium mb-2">
          Workouts Per Week (12 weeks)
        </p>
        {weeklyData.some((w) => w.count > 0) ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 9, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                interval={1}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                width={20}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar
                dataKey="count"
                fill="#0d9488"
                radius={[4, 4, 0, 0]}
                name="Workouts"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-32 flex items-center justify-center text-slate-500 text-sm">
            No workout data yet.
          </div>
        )}
      </div>

      {/* Volume chart */}
      {hasVolume && (
        <div className="bg-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-400 font-medium mb-2">
            Weekly Volume (kg)
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 9, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                interval={1}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line
                type="monotone"
                dataKey="volume"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={{ r: 2.5, fill: "#06b6d4" }}
                name="Volume"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Personal Records */}
      {prs.length > 0 && (
        <div className="bg-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Medal size={16} className="text-amber-400" />
            <p className="text-xs text-slate-400 font-medium">Personal Records</p>
          </div>
          <div className="space-y-1.5">
            {prs.map((pr, i) => (
              <div
                key={pr.exerciseName}
                className="flex items-center justify-between py-1.5 border-b border-slate-700/50 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 w-4">{i + 1}</span>
                  <span className="text-xs font-medium text-white">
                    {pr.exerciseName}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-teal-400">
                    {pr.maxWeight} kg
                  </span>
                  <span className="text-[10px] text-slate-500 ml-1.5">
                    {format(parseISO(pr.date), "MMM d")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  small,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  small?: boolean;
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-3 flex items-start gap-2.5">
      <div className="p-1.5 bg-slate-700 rounded-lg">{icon}</div>
      <div>
        <p className="text-[10px] text-slate-400">{label}</p>
        <p className={`font-bold ${small ? "text-xs truncate max-w-[80px]" : "text-sm"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
