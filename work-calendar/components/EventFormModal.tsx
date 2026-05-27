"use client";

import { useState, useRef, useEffect } from "react";
import { X, Plus, Trash2, Image, FileText } from "lucide-react";
import EditableSelect from "@/components/EditableSelect";
import { WORK_CATEGORIES, EVENT_COLORS } from "@/lib/eventFormConfig";

interface CustomField { key: string; value: string }

export type EventStatus = "pending" | "in_progress" | "done";

export const EVENT_STATUSES: { value: EventStatus; label: string; dot: string; activeBg: string; activeBorder: string; activeText: string }[] = [
  { value: "pending",     label: "รอดำเนินการ",    dot: "#f87171", activeBg: "bg-red-50",    activeBorder: "border-red-400",    activeText: "text-red-600" },
  { value: "in_progress", label: "กำลังดำเนินการ", dot: "#facc15", activeBg: "bg-yellow-50", activeBorder: "border-yellow-400", activeText: "text-yellow-700" },
  { value: "done",        label: "เสร็จแล้ว",      dot: "#4ade80", activeBg: "bg-green-50",  activeBorder: "border-green-400",  activeText: "text-green-700" },
];

interface FormData {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  color: string;
  status: EventStatus;
  workCategory: string;
  subValues: string[];
  generalNotes: string;
  customFields: CustomField[];
}

const EMPTY: FormData = {
  title: "", date: "", startTime: "09:00", endTime: "10:00", color: "#3B82F6",
  status: "pending",
  workCategory: "",
  subValues: [], generalNotes: "",
  customFields: [],
};

interface Props {
  initial?: Partial<FormData> & { id?: string };
  onSave: (data: FormData, id?: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

const enc = (s: string) => encodeURIComponent(s);

// ── Recursive dynamic sub-dropdown chain ─────────────────────────────────────
function DynamicSubs({
  parentChain, selectedValues, onSelect,
}: {
  parentChain: string[];
  selectedValues: string[];
  onSelect: (level: number, val: string) => void;
}) {
  const groupKey = "sub__" + parentChain.join("__");
  const lblKey   = "_lbl__" + groupKey;
  const [opts,  setOpts]  = useState<string[]>([]);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!parentChain[0]) { setOpts([]); return; }
    Promise.all([
      fetch(`/api/dropdown-options?group=${enc(groupKey)}`).then(r => r.ok ? r.json() : []),
      fetch(`/api/dropdown-options?group=${enc(lblKey)}`).then(r => r.ok ? r.json() : []),
    ]).then(([optData, lblData]: [{ label: string }[], { label: string }[]]) => {
      setOpts(optData.map(o => o.label));
      setLabel(lblData.length > 0 ? lblData[0].label : null);
    });
  }, [groupKey]);

  const depth = parentChain.length;
  const level    = depth - 1;
  const selected = selectedValues[level] ?? "";

  // Always include the currently-selected value in the option list so it
  // remains visible even if it was renamed or removed by an admin.
  const optsWithCurrent = (selected && !opts.includes(selected))
    ? [selected, ...opts]
    : opts;

  if (optsWithCurrent.length === 0) return null;

  const displayLabel = label ?? (depth === 1 ? "ตัวเลือกย่อย" : `ตัวเลือกย่อย (ระดับ ${depth})`);

  return (
    <>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{displayLabel}</label>
        <select
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={selected}
          onChange={e => onSelect(level, e.target.value)}
        >
          <option value=""> - </option>
          {optsWithCurrent.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      {selected && (
        <DynamicSubs
          parentChain={[...parentChain, selected]}
          selectedValues={selectedValues}
          onSelect={onSelect}
        />
      )}
    </>
  );
}

// ── File upload area ──────────────────────────────────────────────────────────
function FileUploadArea({
  label, section, accept, icon, eventId, files, onUploaded,
}: {
  label: string; section: string; accept: string; icon: React.ReactNode;
  eventId?: string;
  files: { name: string; path: string; type: string }[];
  onUploaded: (f: { name: string; path: string; type: string }) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    if (!eventId) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("eventId", eventId);
    fd.append("section", section);
    const res = await fetch("/api/event-files", { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      onUploaded({ name: file.name, path: data.filePath, type: data.fileType });
    }
    setUploading(false);
  }

  return (
    <div className="flex-1 border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
      <p className="text-xs font-medium text-gray-600 flex items-center gap-1.5">{icon}{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {files.map((f, i) => (
          <a key={i} href={f.path} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 text-xs bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700 px-2 py-1 rounded-lg transition-colors truncate max-w-[140px]">
            {f.type === "image" ? <Image size={11} className="flex-shrink-0" /> : <FileText size={11} className="flex-shrink-0" />}
            <span className="truncate">{f.name}</span>
          </a>
        ))}
      </div>
      {eventId ? (
        <>
          <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 bg-white">
            <Plus size={11} /> {uploading ? "กำลังอัปโหลด..." : "แนบไฟล์"}
          </button>
          <input ref={ref} type="file" accept={accept} className="hidden" multiple
            onChange={e => { Array.from(e.target.files ?? []).forEach(upload); e.target.value = ""; }} />
        </>
      ) : (
        <p className="text-xs text-gray-400 italic">บันทึกกิจกรรมก่อนแนบไฟล์</p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

const INPUT = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

// ── Main component ────────────────────────────────────────────────────────────
export default function EventFormModal({ initial, onSave, onDelete, onClose }: Props) {
  const [form, setForm] = useState<FormData>(() => {
    const base: FormData = { ...EMPTY, ...initial as any };
    base.status       = (initial as any)?.status       ?? "pending";
    base.subValues    = (initial as any)?.subValues    ?? [];
    base.generalNotes = (initial as any)?.generalNotes ?? "";
    base.customFields = (initial as any)?.customFields ?? [];
    return base;
  });
  const [saving, setSaving] = useState(false);

  const [generalImages, setGeneralImages] = useState<{ name: string; path: string; type: string }[]>([]);
  const [generalDocs,   setGeneralDocs]   = useState<{ name: string; path: string; type: string }[]>([]);

  const set = (k: keyof FormData, v: any) => setForm(f => ({ ...f, [k]: v }));

  function changeWorkCategory(v: string) {
    setForm(f => ({ ...f, workCategory: v, subValues: [] }));
  }

  function handleSubSelect(level: number, val: string) {
    const next = form.subValues.slice(0, level);
    next[level] = val;
    set("subValues", next);
  }

  async function handleSave() {
    if (!form.title || !form.date) return;
    setSaving(true);
    await onSave(form, initial?.id);
    setSaving(false);
  }

  function addCustomField() {
    setForm(f => ({ ...f, customFields: [...f.customFields, { key: "", value: "" }] }));
  }
  function updateCustomField(i: number, k: "key" | "value", v: string) {
    const next = [...form.customFields]; next[i] = { ...next[i], [k]: v };
    setForm(f => ({ ...f, customFields: next }));
  }
  function removeCustomField(i: number) {
    setForm(f => ({ ...f, customFields: f.customFields.filter((_, j) => j !== i) }));
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-end z-50">
      <div className="bg-white h-full w-full max-w-lg flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-white sticky top-0 z-10">
          <h2 className="font-bold text-gray-800">{initial?.id ? "แก้ไขกำหนดการ" : "เพิ่มกำหนดการ"}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ชื่อกิจกรรม */}
          <Field label="ชื่อกิจกรรม *">
            <input className={INPUT} placeholder="ระบุชื่อกิจกรรม" value={form.title}
              onChange={e => set("title", e.target.value)} />
          </Field>

          {/* วันที่ + เวลา */}
          <Field label="วันที่ *">
            <input type="date" className={INPUT} value={form.date}
              onChange={e => set("date", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="เวลาเริ่มต้น">
              <input type="time" className={INPUT} value={form.startTime}
                onChange={e => set("startTime", e.target.value)} />
            </Field>
            <Field label="เวลาสิ้นสุด">
              <input type="time" className={INPUT} value={form.endTime}
                onChange={e => set("endTime", e.target.value)} />
            </Field>
          </div>

          {/* สถานะกำหนดการ */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">สถานะ</label>
            <div className="grid grid-cols-3 gap-2">
              {EVENT_STATUSES.map(s => (
                <button key={s.value} type="button" onClick={() => set("status", s.value)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                    form.status === s.value
                      ? `${s.activeBorder} ${s.activeBg} ${s.activeText}`
                      : "border-gray-200 text-gray-500 hover:border-gray-300 bg-white"
                  }`}>
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.dot }} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* หมวดงาน */}
          <Field label="หมวดงาน">
            <EditableSelect
              groupKey="workCategory"
              value={form.workCategory}
              onChange={changeWorkCategory}
              defaultOptions={WORK_CATEGORIES}
              placeholder=" - "
            />
          </Field>

          {/* Dynamic sub-dropdown chain — applies to ALL categories */}
          {form.workCategory && (
            <DynamicSubs
              parentChain={[form.workCategory]}
              selectedValues={form.subValues}
              onSelect={handleSubSelect}
            />
          )}

          {/* ── หมายเหตุ + แนบไฟล์ (always visible) ── */}
          <hr className="border-gray-100" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">หมายเหตุ / แนบไฟล์</p>

          <Field label="หมายเหตุ">
            <textarea className={INPUT + " resize-none"} rows={3}
              placeholder="บันทึกเพิ่มเติม..."
              value={form.generalNotes}
              onChange={e => set("generalNotes", e.target.value)} />
          </Field>

          <div className="flex gap-2">
            <FileUploadArea label="แนบไฟล์รูป" section="general-image" accept="image/*"
              icon={<Image size={12} className="text-purple-500" />}
              eventId={initial?.id} files={generalImages}
              onUploaded={f => setGeneralImages(p => [...p, f])} />
            <FileUploadArea label="แนบไฟล์เอกสาร" section="general-doc"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              icon={<FileText size={12} className="text-red-500" />}
              eventId={initial?.id} files={generalDocs}
              onUploaded={f => setGeneralDocs(p => [...p, f])} />
          </div>

          {/* รายละเอียดเพิ่มเติม (custom fields) */}
          <hr className="border-gray-100" />
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">รายละเอียดเพิ่มเติม</p>
            <button type="button" onClick={addCustomField}
              className="flex items-center gap-1 text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">
              <Plus size={12} /> เพิ่มหัวข้อ
            </button>
          </div>
          {form.customFields.map((cf, i) => (
            <div key={i} className="flex gap-2 items-start">
              <input className={INPUT + " flex-1"} placeholder="หัวข้อ" value={cf.key}
                onChange={e => updateCustomField(i, "key", e.target.value)} />
              <input className={INPUT + " flex-[2]"} placeholder="รายละเอียด" value={cf.value}
                onChange={e => updateCustomField(i, "value", e.target.value)} />
              <button type="button" onClick={() => removeCustomField(i)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg mt-0.5">
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {/* สีกำหนดการ */}
          <hr className="border-gray-100" />
          <Field label="สีกำหนดการ">
            <div className="flex gap-2 flex-wrap">
              {EVENT_COLORS.map(c => (
                <button key={c} type="button" onClick={() => set("color", c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${form.color === c ? "border-gray-800 scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </Field>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t bg-white flex items-center justify-between gap-2 sticky bottom-0">
          {onDelete ? (
            <button type="button" onClick={onDelete}
              className="flex items-center gap-1.5 text-sm text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors">
              <Trash2 size={15} /> ลบ
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              ยกเลิก
            </button>
            <button type="button" onClick={handleSave} disabled={saving || !form.title || !form.date}
              className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
