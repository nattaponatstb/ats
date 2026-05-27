"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X, Pencil, Trash2, Image, FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface User { id: string; name: string }
interface TaskFile { id: string; fileName: string; filePath: string; fileType: string }
interface Task {
  id: string; title: string; description?: string;
  status: string; priority: string; dueDate?: string;
  creator: User; assignee?: User; files?: TaskFile[];
}

const INPUT = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  todo:        { label: "รอดำเนินการ",     color: "bg-gray-100 text-gray-600" },
  in_progress: { label: "กำลังดำเนินการ",  color: "bg-blue-100 text-blue-700" },
  done:        { label: "เสร็จแล้ว",       color: "bg-green-100 text-green-700" },
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low:    { label: "ต่ำ",       color: "bg-gray-100 text-gray-500" },
  medium: { label: "ปานกลาง",  color: "bg-yellow-100 text-yellow-700" },
  high:   { label: "สูง",       color: "bg-red-100 text-red-600" },
};

/* ── File upload area ── */
function FileArea({
  label, accept, icon, taskId, files, onUploaded, onDeleted,
}: {
  label: string; accept: string; icon: React.ReactNode; taskId?: string;
  files: TaskFile[]; onUploaded: (f: TaskFile) => void; onDeleted: (id: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    if (!taskId) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("taskId", taskId);
    const res = await fetch("/api/task-files", { method: "POST", body: fd });
    if (res.ok) onUploaded(await res.json());
    setUploading(false);
  }

  async function del(id: string) {
    await fetch("/api/task-files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    onDeleted(id);
  }

  return (
    <div className="flex-1 border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
      <p className="text-xs font-medium text-gray-600 flex items-center gap-1.5">{icon}{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {files.map((f) => (
          <div key={f.id} className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1 group">
            <a href={f.filePath} download={f.fileName} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-xs text-gray-700 hover:text-blue-600 max-w-[110px]">
              {f.fileType === "image" ? <Image size={11} className="flex-shrink-0" /> : <FileText size={11} className="flex-shrink-0" />}
              <span className="truncate">{f.fileName}</span>
            </a>
            <button onClick={() => del(f.id)} className="ml-1 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all">
              <X size={10} />
            </button>
          </div>
        ))}
      </div>
      {taskId ? (
        <>
          <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg bg-white disabled:opacity-50 transition-colors">
            <Plus size={11} /> {uploading ? "กำลังอัปโหลด..." : "แนบไฟล์"}
          </button>
          <input ref={ref} type="file" accept={accept} multiple className="hidden"
            onChange={(e) => { Array.from(e.target.files ?? []).forEach(upload); e.target.value = ""; }} />
        </>
      ) : (
        <p className="text-xs text-gray-400 italic">บันทึกงานก่อนแนบไฟล์</p>
      )}
    </div>
  );
}

/* ── Main page ── */
export default function TasksPage() {
  const [tasks, setTasks]         = useState<Task[]>([]);
  const [users, setUsers]         = useState<User[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [selected, setSelected]   = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [saving, setSaving]       = useState(false);
  const [imgFiles, setImgFiles]   = useState<TaskFile[]>([]);
  const [docFiles, setDocFiles]   = useState<TaskFile[]>([]);
  const [form, setForm] = useState({
    title: "", description: "", status: "todo",
    priority: "medium", dueDate: "", assigneeId: "",
  });

  useEffect(() => { fetchTasks(); fetchUsers(); }, []);

  async function fetchTasks() {
    const res = await fetch("/api/tasks");
    if (res.ok) setTasks(await res.json());
  }
  async function fetchUsers() {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }
  async function loadFiles(taskId: string) {
    const res = await fetch(`/api/task-files?taskId=${taskId}`);
    if (!res.ok) return;
    const all: TaskFile[] = await res.json();
    setImgFiles(all.filter((f) => f.fileType === "image"));
    setDocFiles(all.filter((f) => f.fileType !== "image"));
  }

  function openCreate() {
    setForm({ title: "", description: "", status: "todo", priority: "medium", dueDate: "", assigneeId: "" });
    setSelected(null);
    setImgFiles([]);
    setDocFiles([]);
    setShowPanel(true);
  }

  function openEdit(task: Task) {
    setForm({
      title: task.title, description: task.description ?? "",
      status: task.status, priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
      assigneeId: task.assignee?.id ?? "",
    });
    setSelected(task);
    setImgFiles([]);
    setDocFiles([]);
    loadFiles(task.id);
    setShowPanel(true);
  }

  function closePanel() { setShowPanel(false); setSelected(null); }

  async function handleSave() {
    if (!form.title) return;
    setSaving(true);
    const body = { ...form, dueDate: form.dueDate || null, assigneeId: form.assigneeId || null };
    if (selected) {
      await fetch(`/api/tasks/${selected.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        const created = await res.json();
        setSelected(created);
      }
    }
    setSaving(false);
    fetchTasks();
  }

  async function handleDelete() {
    if (!selected || !confirm(`ลบงาน "${selected.title}" ใช่ไหม?`)) return;
    await fetch(`/api/tasks/${selected.id}`, { method: "DELETE" });
    closePanel();
    fetchTasks();
  }

  async function quickStatus(id: string, status: string) {
    await fetch(`/api/tasks/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    fetchTasks();
  }

  const filtered = filterStatus === "all" ? tasks : tasks.filter((t) => t.status === filterStatus);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">งาน</h1>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> เพิ่มงาน
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[["all","ทั้งหมด"],["todo","รอดำเนินการ"],["in_progress","กำลังดำเนินการ"],["done","เสร็จแล้ว"]].map(([v,l]) => (
          <button key={v} onClick={() => setFilterStatus(v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === v ? "bg-blue-600 text-white" : "bg-white text-gray-600 border hover:bg-gray-50"
            }`}>{l}</button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {filtered.length === 0 && <div className="text-center py-16 text-gray-400">ไม่มีงาน</div>}
        {filtered.map((task) => (
          <div key={task.id}
            className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4 hover:shadow-sm transition-shadow">
            <input type="checkbox" checked={task.status === "done"}
              onChange={(e) => quickStatus(task.id, e.target.checked ? "done" : "todo")}
              className="mt-1 w-4 h-4 rounded cursor-pointer accent-blue-600" />
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(task)}>
              <p className={`font-medium text-gray-800 ${task.status === "done" ? "line-through text-gray-400" : ""}`}>
                {task.title}
              </p>
              {task.description && <p className="text-sm text-gray-500 mt-0.5 truncate">{task.description}</p>}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[task.status]?.color}`}>
                  {STATUS_LABELS[task.status]?.label}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_LABELS[task.priority]?.color}`}>
                  {PRIORITY_LABELS[task.priority]?.label}
                </span>
                {task.assignee && <span className="text-xs text-gray-400">ผู้รับผิดชอบ: {task.assignee.name}</span>}
                {task.dueDate && <span className="text-xs text-gray-400">ครบกำหนด: {format(new Date(task.dueDate), "d MMM yyyy", { locale: th })}</span>}
              </div>
            </div>
            <button onClick={() => openEdit(task)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              <Pencil size={15} />
            </button>
          </div>
        ))}
      </div>

      {/* Side panel */}
      {showPanel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-end z-50">
          <div className="bg-white h-full w-full max-w-md flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-bold text-gray-800">{selected ? "แก้ไขงาน" : "เพิ่มงาน"}</h2>
              <button onClick={closePanel} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ชื่องาน *</label>
                <input className={INPUT} placeholder="ระบุชื่องาน" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">รายละเอียด</label>
                <textarea className={INPUT + " resize-none"} rows={3} placeholder="รายละเอียดงาน"
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">สถานะ</label>
                  <select className={INPUT} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="todo">รอดำเนินการ</option>
                    <option value="in_progress">กำลังดำเนินการ</option>
                    <option value="done">เสร็จแล้ว</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ความสำคัญ</label>
                  <select className={INPUT} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="low">ต่ำ</option>
                    <option value="medium">ปานกลาง</option>
                    <option value="high">สูง</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">วันครบกำหนด</label>
                <input type="date" className={INPUT} value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">มอบหมายให้</label>
                <select className={INPUT} value={form.assigneeId}
                  onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
                  <option value=""> - </option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>

              {/* File attachments */}
              <hr className="border-gray-100" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">แนบไฟล์</p>
              {!selected && (
                <p className="text-xs text-gray-400 italic -mt-2">กด "บันทึก" ก่อน จึงจะแนบไฟล์ได้</p>
              )}
              <div className="flex gap-2">
                <FileArea label="ไฟล์รูปภาพ" accept="image/*"
                  icon={<Image size={12} className="text-purple-500" />}
                  taskId={selected?.id} files={imgFiles}
                  onUploaded={(f) => setImgFiles((p) => [...p, f])}
                  onDeleted={(id) => setImgFiles((p) => p.filter((f) => f.id !== id))} />
                <FileArea label="ไฟล์เอกสาร" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  icon={<FileText size={12} className="text-red-500" />}
                  taskId={selected?.id} files={docFiles}
                  onUploaded={(f) => setDocFiles((p) => [...p, f])}
                  onDeleted={(id) => setDocFiles((p) => p.filter((f) => f.id !== id))} />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t flex items-center justify-between gap-2">
              {selected ? (
                <button onClick={handleDelete}
                  className="flex items-center gap-1.5 text-sm text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors">
                  <Trash2 size={15} /> ลบ
                </button>
              ) : <div />}
              <div className="flex gap-2">
                <button onClick={closePanel}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                  ยกเลิก
                </button>
                <button onClick={handleSave} disabled={saving || !form.title}
                  className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors">
                  {saving ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
