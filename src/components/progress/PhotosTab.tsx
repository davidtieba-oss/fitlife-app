"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Camera, Upload, Trash2, X, Columns2, Image, SlidersHorizontal } from "lucide-react";
import {
  getProgressPhotos,
  saveProgressPhoto,
  deleteProgressPhoto,
  getPhotoStorageSize,
  getMetrics,
  getMeasurements,
  type ProgressPhoto,
  type MetricEntry,
  type MeasurementEntry,
} from "@/lib/storage";
import Toast from "@/components/Toast";

const MAX_STORAGE = 5 * 1024 * 1024; // 5MB
const POSES = [
  { value: "front", label: "Front" },
  { value: "side", label: "Side" },
  { value: "back", label: "Back" },
] as const;

type CompareMode = "side-by-side" | "slider";

function findClosest<T extends { date: string }>(entries: T[], targetDate: string): T | null {
  if (entries.length === 0) return null;
  const target = new Date(targetDate).getTime();
  let closest = entries[0];
  let minDiff = Math.abs(new Date(closest.date).getTime() - target);
  for (const e of entries) {
    const diff = Math.abs(new Date(e.date).getTime() - target);
    if (diff < minDiff) {
      minDiff = diff;
      closest = e;
    }
  }
  return closest;
}

function getOverlayText(
  photo: ProgressPhoto,
  metrics: MetricEntry[],
  measurements: MeasurementEntry[],
  detailed: boolean
): string {
  const closestMetric = findClosest(metrics, photo.date);
  const closestMeasure = findClosest(measurements, photo.date);
  const parts: string[] = [];
  if (closestMetric) parts.push(`${closestMetric.weight} kg`);
  if (closestMeasure) {
    if (detailed) {
      if (closestMeasure.waist) parts.push(`W: ${closestMeasure.waist}cm`);
      if (closestMeasure.chest) parts.push(`C: ${closestMeasure.chest}cm`);
      const bicep = closestMeasure.leftBicep || closestMeasure.rightBicep;
      if (bicep) parts.push(`B: ${bicep}cm`);
    } else {
      if (closestMeasure.waist) parts.push(`W: ${closestMeasure.waist}`);
    }
  }
  return parts.join(" | ");
}

export default function PhotosTab() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [metrics, setMetricsState] = useState<MetricEntry[]>([]);
  const [measurementsData, setMeasurementsData] = useState<MeasurementEntry[]>([]);
  const [storageUsed, setStorageUsed] = useState(0);
  const [toast, setToast] = useState("");
  const [viewPhoto, setViewPhoto] = useState<ProgressPhoto | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareView, setCompareView] = useState<CompareMode>("side-by-side");
  const [sliderPos, setSliderPos] = useState(50);
  const [pose, setPose] = useState<"front" | "side" | "back">("front");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const refresh = useCallback(() => {
    setPhotos(getProgressPhotos());
    setStorageUsed(getPhotoStorageSize());
    setMetricsState(getMetrics());
    setMeasurementsData(getMeasurements());
  }, []);

  useEffect(() => refresh(), [refresh]);

  function resizeAndSave(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxW = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxW) {
          h = Math.round((h * maxW) / w);
          w = maxW;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        const result = saveProgressPhoto({ date, dataUrl, pose });
        if (result) {
          setToast("Photo saved!");
          refresh();
        } else {
          setToast("Storage full! Delete old photos.");
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) resizeAndSave(file);
    e.target.value = "";
  }

  function handleDelete(id: string) {
    deleteProgressPhoto(id);
    setViewPhoto(null);
    refresh();
  }

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  // Slider drag handlers
  function handleSliderStart(clientX: number) {
    isDragging.current = true;
    updateSlider(clientX);
  }

  function updateSlider(clientX: number) {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setSliderPos(pct);
  }

  useEffect(() => {
    function onMove(e: MouseEvent | TouchEvent) {
      if (!isDragging.current) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      updateSlider(clientX);
    }
    function onUp() {
      isDragging.current = false;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  const storagePct = Math.round((storageUsed / MAX_STORAGE) * 100);
  const comparePhotos = compareIds
    .map((id) => photos.find((p) => p.id === id))
    .filter(Boolean) as ProgressPhoto[];

  // Group photos by month for timeline
  const grouped = photos.reduce<Record<string, ProgressPhoto[]>>((acc, p) => {
    const month = format(parseISO(p.date), "MMMM yyyy");
    (acc[month] ||= []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      {/* Upload controls */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex gap-2">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFile}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white py-2.5 rounded-xl text-sm font-medium transition"
          >
            <Camera size={16} /> Take Photo
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl text-sm font-medium transition"
          >
            <Upload size={16} /> Upload
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 bg-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none"
          />
          <div className="flex bg-slate-700 rounded-lg overflow-hidden">
            {POSES.map((p) => (
              <button
                key={p.value}
                onClick={() => setPose(p.value)}
                className={`px-3 py-2 text-xs font-medium transition ${
                  pose === p.value ? "bg-teal-600 text-white" : "text-slate-400"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Storage bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400">Storage</span>
            <span className={`text-[10px] ${storagePct > 80 ? "text-red-400" : "text-slate-400"}`}>
              {(storageUsed / 1024 / 1024).toFixed(1)} / 5 MB
            </span>
          </div>
          <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${storagePct > 80 ? "bg-red-500" : "bg-teal-500"}`}
              style={{ width: `${Math.min(storagePct, 100)}%` }}
            />
          </div>
          {storagePct > 80 && (
            <p className="text-[10px] text-red-400 mt-1">
              Storage nearly full. Delete old photos to free space.
            </p>
          )}
        </div>
      </div>

      {/* Compare mode toggle */}
      {photos.length >= 2 && (
        <button
          onClick={() => {
            setCompareMode(!compareMode);
            setCompareIds([]);
            setSliderPos(50);
          }}
          className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition ${
            compareMode ? "bg-teal-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          }`}
        >
          <Columns2 size={14} /> {compareMode ? "Exit Compare" : "Compare Photos"}
        </button>
      )}

      {/* Comparison view */}
      {compareMode && comparePhotos.length === 2 && (
        <div className="bg-slate-800 rounded-2xl p-3 space-y-2">
          {/* Mode toggle */}
          <div className="flex bg-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setCompareView("side-by-side")}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-medium transition ${
                compareView === "side-by-side" ? "bg-teal-600 text-white" : "text-slate-400"
              }`}
            >
              <Columns2 size={12} /> Side by Side
            </button>
            <button
              onClick={() => { setCompareView("slider"); setSliderPos(50); }}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-medium transition ${
                compareView === "slider" ? "bg-teal-600 text-white" : "text-slate-400"
              }`}
            >
              <SlidersHorizontal size={12} /> Slider
            </button>
          </div>

          {/* Side by side */}
          {compareView === "side-by-side" && (
            <div className="grid grid-cols-2 gap-2">
              {comparePhotos.map((p) => (
                <div key={p.id}>
                  <img src={p.dataUrl} alt={p.pose || "Progress"} className="w-full aspect-[3/4] object-cover rounded-lg" />
                  <p className="text-[10px] text-slate-400 text-center mt-1">
                    {format(parseISO(p.date), "MMM d, yyyy")}
                    {p.pose && ` · ${p.pose}`}
                  </p>
                  <p className="text-[9px] text-slate-500 text-center">
                    {getOverlayText(p, metrics, measurementsData, false)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Slider comparison */}
          {compareView === "slider" && (
            <div
              ref={sliderRef}
              className="relative aspect-[3/4] rounded-lg overflow-hidden cursor-col-resize select-none"
              onMouseDown={(e) => handleSliderStart(e.clientX)}
              onTouchStart={(e) => handleSliderStart(e.touches[0].clientX)}
            >
              {/* Base image (right / after) */}
              <img
                src={comparePhotos[1].dataUrl}
                alt="After"
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Clipped image (left / before) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${sliderPos}%` }}
              >
                <img
                  src={comparePhotos[0].dataUrl}
                  alt="Before"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ minWidth: sliderRef.current ? `${sliderRef.current.offsetWidth}px` : "100%" }}
                />
              </div>
              {/* Slider handle */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
                style={{ left: `${sliderPos}%`, transform: "translateX(-50%)" }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <SlidersHorizontal size={14} className="text-slate-800" />
                </div>
              </div>
              {/* Labels */}
              <div className="absolute bottom-2 left-2 bg-black/60 rounded px-1.5 py-0.5">
                <p className="text-[9px] text-white">{format(parseISO(comparePhotos[0].date), "MMM d, yyyy")}</p>
              </div>
              <div className="absolute bottom-2 right-2 bg-black/60 rounded px-1.5 py-0.5">
                <p className="text-[9px] text-white">{format(parseISO(comparePhotos[1].date), "MMM d, yyyy")}</p>
              </div>
            </div>
          )}

          <button
            onClick={() => setCompareIds([])}
            className="w-full mt-1 text-[10px] text-slate-500 hover:text-slate-300"
          >
            Clear selection
          </button>
        </div>
      )}

      {compareMode && comparePhotos.length < 2 && (
        <p className="text-xs text-slate-500 text-center">
          Select {2 - comparePhotos.length} photo{comparePhotos.length === 0 ? "s" : ""} to compare
        </p>
      )}

      {/* Photo timeline */}
      {photos.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Image size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">No progress photos yet.</p>
          <p className="text-xs mt-1">Take or upload your first photo!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([month, monthPhotos]) => (
            <div key={month}>
              <h3 className="text-xs font-semibold text-slate-400 mb-2">{month}</h3>
              <div className="grid grid-cols-3 gap-2">
                {monthPhotos.map((p) => {
                  const isSelected = compareIds.includes(p.id);
                  const overlay = getOverlayText(p, metrics, measurementsData, false);
                  return (
                    <button
                      key={p.id}
                      onClick={() => (compareMode ? toggleCompare(p.id) : setViewPhoto(p))}
                      className={`relative aspect-[3/4] rounded-lg overflow-hidden group ${
                        isSelected ? "ring-2 ring-teal-400" : ""
                      }`}
                    >
                      <img src={p.dataUrl} alt={p.pose || "Progress"} className="w-full h-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4">
                        <p className="text-[9px] text-white">{format(parseISO(p.date), "MMM d")}</p>
                        {p.pose && (
                          <span className="inline-block bg-slate-800/80 rounded px-1 py-0.5 text-[8px] text-slate-300 mt-0.5">
                            {p.pose}
                          </span>
                        )}
                        {overlay && (
                          <p className="text-[8px] text-slate-300 mt-0.5">{overlay}</p>
                        )}
                      </div>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                          {compareIds.indexOf(p.id) + 1}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photo viewer modal */}
      {viewPhoto && (
        <div className="fixed inset-0 z-[90] bg-slate-950/95 flex flex-col items-center justify-center p-4">
          <div className="max-w-lg w-full">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-white">
                  {format(parseISO(viewPhoto.date), "MMMM d, yyyy")}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {viewPhoto.pose && (
                    <span className="inline-block bg-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-300">
                      {viewPhoto.pose}
                    </span>
                  )}
                  {viewPhoto.label && (
                    <span className="text-xs text-slate-400">{viewPhoto.label}</span>
                  )}
                </div>
                {/* Detailed overlay */}
                {(() => {
                  const detail = getOverlayText(viewPhoto, metrics, measurementsData, true);
                  return detail ? (
                    <p className="text-[10px] text-teal-400 mt-1">{detail}</p>
                  ) : null;
                })()}
              </div>
              <button
                onClick={() => setViewPhoto(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>
            <img
              src={viewPhoto.dataUrl}
              alt={viewPhoto.pose || "Progress photo"}
              className="w-full rounded-xl"
            />
            <button
              onClick={() => handleDelete(viewPhoto.id)}
              className="mt-3 flex items-center justify-center gap-1.5 w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 py-2.5 rounded-xl text-sm font-medium transition"
            >
              <Trash2 size={16} /> Delete Photo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
