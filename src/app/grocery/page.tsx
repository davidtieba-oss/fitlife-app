"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  ShoppingCart,
  X,
} from "lucide-react";
import {
  getGroceryList,
  saveGroceryItem,
  toggleGroceryItem,
  deleteGroceryItem,
  clearCheckedGrocery,
  GROCERY_CATEGORIES,
  type GroceryItem,
} from "@/lib/storage";
import { ListSkeleton } from "@/components/Skeleton";
import Toast from "@/components/Toast";

export default function GroceryPage() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Other");
  const [toast, setToast] = useState("");
  const [mounted, setMounted] = useState(false);

  const refresh = useCallback(() => setItems(getGroceryList()), []);

  useEffect(() => {
    setMounted(true);
    refresh();
  }, [refresh]);

  if (!mounted) {
    return (
      <ListSkeleton />
    );
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    saveGroceryItem({ name: trimmed, category, checked: false });
    setName("");
    refresh();
  }

  function handleToggle(id: string) {
    toggleGroceryItem(id);
    refresh();
  }

  function handleDelete(id: string) {
    deleteGroceryItem(id);
    refresh();
  }

  function handleClearChecked() {
    clearCheckedGrocery();
    refresh();
    setToast("Completed items cleared!");
  }

  const checkedCount = items.filter((i) => i.checked).length;

  // Group by category
  const grouped = GROCERY_CATEGORIES.map((cat) => ({
    category: cat,
    items: items.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Grocery List</h1>
        {checkedCount > 0 && (
          <button
            onClick={handleClearChecked}
            className="text-xs text-gray-500 dark:text-slate-400 hover:text-red-400 transition flex items-center gap-1"
          >
            <X size={12} /> Clear {checkedCount} done
          </button>
        )}
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add item..."
            className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="submit"
            className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-2.5 rounded-lg transition active:scale-95"
          >
            <Plus size={18} />
          </button>
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full bg-gray-200 dark:bg-slate-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white outline-none"
        >
          {GROCERY_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </form>

      {/* Items by category */}
      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-slate-500">
          <ShoppingCart size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Your grocery list is empty.</p>
          <p className="text-xs mt-1">Add items above to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(({ category: cat, items: catItems }) => (
            <div key={cat} className="bg-gray-100 dark:bg-slate-800 rounded-xl overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-200/50 dark:border-slate-700/50">
                <p className="text-[10px] text-teal-400 font-semibold uppercase tracking-wider">
                  {cat}
                </p>
              </div>
              <div className="divide-y divide-gray-200/30 dark:divide-slate-700/30">
                {catItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <button
                      onClick={() => handleToggle(item.id)}
                      className="shrink-0 transition"
                    >
                      {item.checked ? (
                        <CheckCircle2
                          size={20}
                          className="text-teal-400"
                        />
                      ) : (
                        <Circle size={20} className="text-gray-400 dark:text-slate-500" />
                      )}
                    </button>
                    <span
                      className={`flex-1 text-sm ${
                        item.checked
                          ? "line-through text-gray-400 dark:text-slate-500"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {item.name}
                    </span>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-gray-400 dark:text-slate-500 hover:text-red-400 p-1 transition shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-gray-400 dark:text-slate-500 text-center">
        Grocery list is shared across all profiles.
      </p>
    </div>
  );
}
