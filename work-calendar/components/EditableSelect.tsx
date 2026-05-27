"use client";

import { useState, useEffect } from "react";
import { Plus, Check, X, Pencil, Trash2, Settings } from "lucide-react";

interface CustomOption { id: string; label: string }

interface Props {
  groupKey: string;
  value: string;
  onChange: (val: string) => void;
  defaultOptions: string[];
  placeholder?: string;
  className?: string;
}

export default function EditableSelect({
  groupKey, value, onChange, defaultOptions, placeholder = " - ", className = "",
}: Props) {
  const [customOptions, setCustomOptions] = useState<CustomOption[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [newVal, setNewVal] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");

  useEffect(() => { loadOptions(); }, [groupKey]);

  async function loadOptions() {
    const res = await fetch(`/api/dropdown-options?group=${groupKey}`);
    if (res.ok) setCustomOptions(await res.json());
  }

  // When DB has options (including seeded defaults), use DB as source of truth.
  // Fall back to the defaultOptions prop only if DB is still empty (fresh install).
  const baseOptions = customOptions.length > 0
    ? customOptions.map((c) => c.label)
    : defaultOptions;

  // Always include the current value in the list so it shows even if it was
  // renamed or deleted — prevents the select from silently reverting to blank.
  const allOptions = (value && !baseOptions.includes(value))
    ? [value, ...baseOptions]
    : baseOptions;

  async function handleAdd() {
    const trimmed = newVal.trim();
    if (!trimmed) return;
    const res = await fetch("/api/dropdown-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupKey, label: trimmed }),
    });
    if (res.ok) {
      const opt = await res.json();
      setCustomOptions((prev) => [...prev, opt]);
      onChange(trimmed);
    }
    setNewVal("");
    setShowAdd(false);
  }

  async function handleEdit(id: string) {
    const trimmed = editVal.trim();
    if (!trimmed) return;
    const res = await fetch("/api/dropdown-options", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, label: trimmed }),
    });
    if (res.ok) {
      setCustomOptions((prev) => prev.map((o) => (o.id === id ? { ...o, label: trimmed } : o)));
      if (value === customOptions.find((o) => o.id === id)?.label) onChange(trimmed);
    }
    setEditId(null);
  }

  async function handleDelete(opt: CustomOption) {
    if (!confirm(`ลบ "${opt.label}" ออกจากรายการ?`)) return;
    await fetch("/api/dropdown-options", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: opt.id }),
    });
    setCustomOptions((prev) => prev.filter((o) => o.id !== opt.id));
    if (value === opt.label) onChange("");
  }

  return (
    <div className="space-y-1.5">
      {/* Select row */}
      <div className="flex gap-1.5">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${className}`}
        >
          <option value="">{placeholder}</option>
          {allOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>

        {/* Add */}
        <button type="button" onClick={() => { setShowAdd((v) => !v); setShowManage(false); }}
          title="เพิ่มรายการใหม่"
          className={`px-2 py-2 border rounded-lg text-sm transition-colors ${showAdd ? "border-blue-400 text-blue-600 bg-blue-50" : "border-gray-300 text-gray-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50"}`}>
          <Plus size={15} />
        </button>

        {/* Manage */}
        <button type="button" onClick={() => { setShowManage((v) => !v); setShowAdd(false); }}
          title="จัดการรายการ"
          className={`px-2 py-2 border rounded-lg text-sm transition-colors ${showManage ? "border-orange-400 text-orange-600 bg-orange-50" : "border-gray-300 text-gray-500 hover:text-orange-500 hover:border-orange-300 hover:bg-orange-50"}`}>
          <Settings size={15} />
        </button>
      </div>

      {/* Add input */}
      {showAdd && (
        <div className="flex gap-1.5">
          <input autoFocus value={newVal} onChange={(e) => setNewVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setShowAdd(false); }}
            placeholder="พิมพ์รายการใหม่..."
            className="flex-1 border border-blue-400 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="button" onClick={handleAdd} className="px-2 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Check size={14} />
          </button>
          <button type="button" onClick={() => setShowAdd(false)} className="px-2 py-1.5 border rounded-lg text-gray-500 hover:bg-gray-50">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Manage panel */}
      {showManage && (
        <div className="border border-orange-200 rounded-lg bg-orange-50 p-2 space-y-1">
          <p className="text-xs font-medium text-orange-700 mb-1.5">จัดการรายการ</p>
          {customOptions.length === 0 && (
            <p className="text-xs text-gray-400 italic px-1">ยังไม่มีรายการ กด + เพื่อเพิ่ม</p>
          )}
          {customOptions.map((opt) => (
            <div key={opt.id} className="flex items-center gap-1.5">
              {editId === opt.id ? (
                <>
                  <input autoFocus value={editVal} onChange={(e) => setEditVal(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleEdit(opt.id); if (e.key === "Escape") setEditId(null); }}
                    className="flex-1 border border-blue-400 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                  <button type="button" onClick={() => handleEdit(opt.id)} className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                    <Check size={12} />
                  </button>
                  <button type="button" onClick={() => setEditId(null)} className="p-1 border rounded text-gray-500 hover:bg-white">
                    <X size={12} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-xs text-gray-700 truncate px-1">{opt.label}</span>
                  <button type="button" onClick={() => { setEditId(opt.id); setEditVal(opt.label); }}
                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                    <Pencil size={12} />
                  </button>
                  <button type="button" onClick={() => handleDelete(opt)}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                    <Trash2 size={12} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
