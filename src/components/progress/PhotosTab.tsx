"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Camera, Upload, Trash2, X, Columns2, Image } from "lucide-react";
import {
  getProgressPhotos,
  saveProgressPhoto,
  deleteProgressPhoto,
  getPhotoStorageSize,
  type ProgressPhoto,
} from "@/lib/storage";
import Toast from "@/components/Toast";

const MAX_STORAGE = 5 * 1024 * 1024; // 5MB
const LABELS = ["Front", "Side", "Back"] as const;

export default function PhotosTab() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [storageUsed, setStorageUsed] = useState(0);
  const [toast, setToast] = useState("");
  const [viewPhoto, setViewPhoto] = useState<ProgressPhoto | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [label, setLabel] = useState<string>("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    setPhotos(getProgressPhotos());
    setStorageUsed(getPhotoStorageSize());
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
        const result = saveProgressPhoto({
          date,
          dataUrl,
          label: label || undefined,
        });
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

  const storagePct = Math.round((storageUsed / MAX_STORAGE) * 100);
  const comparePhotos = compareIds
    .map((id) => photos.find((p) => p.id === id))
    .filter(Boolean) as ProgressPhoto[];

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
          <select
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="bg-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none"
          >
            <option value="">No label</option>
            {LABELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        {/* Storage bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400">Storage</span>
            <span
              className={`text-[10px] ${
                storagePct > 80 ? "text-red-400" : "text-slate-400"
              }`}
            >
              {(storageUsed / 1024 / 1024).toFixed(1)} / 5 MB
            </span>
          </div>
          <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                storagePct > 80 ? "bg-red-500" : "bg-teal-500"
              }`}
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
          }}
          className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition ${
            compareMode
              ? "bg-teal-600 text-white"
              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          }`}
        >
          <Columns2 size={14} /> {compareMode ? "Exit Compare" : "Compare Photos"}
        </button>
      )}

      {/* Side-by-side comparison */}
      {compareMode && comparePhotos.length === 2 && (
        <div className="bg-slate-800 rounded-2xl p-3">
          <div className="grid grid-cols-2 gap-2">
            {comparePhotos.map((p) => (
              <div key={p.id}>
                <img
                  src={p.dataUrl}
                  alt={p.label || "Progress"}
                  className="w-full aspect-[3/4] object-cover rounded-lg"
                />
                <p className="text-[10px] text-slate-400 text-center mt-1">
                  {format(parseISO(p.date), "MMM d, yyyy")}
                  {p.label && ` · ${p.label}`}
                </p>
              </div>
            ))}
          </div>
          <button
            onClick={() => setCompareIds([])}
            className="w-full mt-2 text-[10px] text-slate-500 hover:text-slate-300"
          >
            Clear selection
          </button>
        </div>
      )}

      {compareMode && comparePhotos.length < 2 && (
        <p className="text-xs text-slate-500 text-center">
          Select {2 - comparePhotos.length} photo{comparePhotos.length === 0 && "s"} to compare
        </p>
      )}

      {/* Photo grid */}
      {photos.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Image size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">No progress photos yet.</p>
          <p className="text-xs mt-1">Take or upload your first photo!</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => {
            const isSelected = compareIds.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() =>
                  compareMode ? toggleCompare(p.id) : setViewPhoto(p)
                }
                className={`relative aspect-[3/4] rounded-lg overflow-hidden group ${
                  isSelected ? "ring-2 ring-teal-400" : ""
                }`}
              >
                <img
                  src={p.dataUrl}
                  alt={p.label || "Progress"}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4">
                  <p className="text-[9px] text-white">
                    {format(parseISO(p.date), "MMM d")}
                  </p>
                  {p.label && (
                    <p className="text-[8px] text-slate-300">{p.label}</p>
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
                {viewPhoto.label && (
                  <p className="text-xs text-slate-400">{viewPhoto.label}</p>
                )}
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
              alt={viewPhoto.label || "Progress photo"}
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
