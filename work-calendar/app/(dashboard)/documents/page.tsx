"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, X, Download, Trash2, FileText, Image, File } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface Doc {
  id: string; name: string; description?: string;
  fileName: string; fileSize: number; fileType: string; filePath: string;
  category: string; createdAt: string; user: { name: string };
}

const CATEGORIES = ["general", "contract", "report", "finance", "hr", "other"];
const CATEGORY_LABELS: Record<string, string> = {
  general: "ทั่วไป", contract: "สัญญา", report: "รายงาน", finance: "การเงิน", hr: "บุคคล", other: "อื่นๆ",
};

function FileIcon({ type }: { type: string }) {
  if (type.startsWith("image/")) return <Image size={20} className="text-purple-500" />;
  if (type === "application/pdf") return <FileText size={20} className="text-red-500" />;
  return <File size={20} className="text-blue-500" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [filterCat, setFilterCat] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", category: "general" });
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchDocs(); }, []);

  async function fetchDocs() {
    const res = await fetch("/api/documents");
    if (res.ok) setDocs(await res.json());
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", form.name || file.name);
    fd.append("description", form.description);
    fd.append("category", form.category);

    await fetch("/api/documents", { method: "POST", body: fd });
    setShowModal(false);
    setFile(null);
    setForm({ name: "", description: "", category: "general" });
    setUploading(false);
    fetchDocs();
  }

  async function handleDelete(id: string) {
    if (!confirm("ต้องการลบเอกสารนี้?")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    fetchDocs();
  }

  const filtered = filterCat === "all" ? docs : docs.filter((d) => d.category === filterCat);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">เอกสาร</h1>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> อัปโหลดเอกสาร
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilterCat("all")} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterCat === "all" ? "bg-blue-600 text-white" : "bg-white text-gray-600 border hover:bg-gray-50"}`}>ทั้งหมด</button>
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setFilterCat(c)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterCat === c ? "bg-blue-600 text-white" : "bg-white text-gray-600 border hover:bg-gray-50"}`}>{CATEGORY_LABELS[c]}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 text-gray-400">ไม่มีเอกสาร</div>
        )}
        {filtered.map((doc) => (
          <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                  <FileIcon type={doc.fileType} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate max-w-[160px]">{doc.name}</p>
                  <p className="text-xs text-gray-400">{formatSize(doc.fileSize)}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <a href={doc.filePath} download={doc.fileName} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Download size={15} />
                </a>
                <button onClick={() => handleDelete(doc.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            {doc.description && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{doc.description}</p>}
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{CATEGORY_LABELS[doc.category]}</span>
              <span className="text-xs text-gray-400">{doc.user.name} · {format(new Date(doc.createdAt), "d MMM yy", { locale: th })}</span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold text-gray-800">อัปโหลดเอกสาร</h2>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                {file ? (
                  <p className="text-sm text-blue-600 font-medium">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">คลิกเพื่อเลือกไฟล์</p>
                    <p className="text-xs text-gray-400 mt-1">รองรับทุกประเภทไฟล์</p>
                  </>
                )}
                <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
              <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ชื่อเอกสาร" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} placeholder="คำอธิบาย" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">ยกเลิก</button>
              <button onClick={handleUpload} disabled={!file || uploading} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
                {uploading ? "กำลังอัปโหลด..." : "อัปโหลด"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
