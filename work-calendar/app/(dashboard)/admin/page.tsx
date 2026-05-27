"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Plus, Pencil, Trash2, Check, X,
  ChevronDown, ChevronRight, Tag, Settings2,
  Copy, Clipboard, Loader2, Layers,
} from "lucide-react";
import { THEMES, applyTheme } from "@/lib/themes";
import {
  OFFICIAL_SUB_CATEGORIES, COURSE_TYPES,
  DEFAULT_SUBJECTS, DEFAULT_INSTRUCTORS, DEFAULT_TEACHING_METHODS,
  DEFAULT_LOCATIONS, DEFAULT_EVIDENCE, DEFAULT_DRESS_CODES,
} from "@/lib/eventFormConfig";

interface Option { id: string; label: string; groupKey: string }

// ── Clipboard types ───────────────────────────────────────────────────────────
interface DropdownNode { label: string; children?: DropdownTree }
interface DropdownTree { levelLabel?: string; items: DropdownNode[] }
interface ClipboardCtx {
  clipboard: DropdownTree | null;
  setClipboard: (tree: DropdownTree | null) => void;
}
const ClipboardContext = createContext<ClipboardCtx>({ clipboard: null, setClipboard: () => {} });

// Recursive helper — fetches an entire subtree from the API (used by copy & paste)
// prefix: "sub" for regular categories, "tmpl" for template categories
async function fetchTree(path: string[], prefix = "sub"): Promise<DropdownTree> {
  const gk = `${prefix}__${path.join("__")}`;
  const lk = `_lbl__${prefix}__${path.join("__")}`;
  const [optData, lblData]: [Option[], Option[]] = await Promise.all([
    fetch(`/api/dropdown-options?group=${encodeURIComponent(gk)}`).then(r => r.ok ? r.json() : []),
    fetch(`/api/dropdown-options?group=${encodeURIComponent(lk)}`).then(r => r.ok ? r.json() : []),
  ]);
  const nodeItems: DropdownNode[] = await Promise.all(
    optData.map(async (o) => {
      const children = await fetchTree([...path, o.label], prefix);
      return { label: o.label, children: children.items.length > 0 ? children : undefined };
    })
  );
  return { levelLabel: lblData[0]?.label, items: nodeItems };
}

// Recursive helper — writes a DropdownTree into the DB under `path`
async function writeTree(path: string[], tree: DropdownTree, prefix = "sub") {
  const gk = `${prefix}__${path.join("__")}`;
  const lk = `_lbl__${prefix}__${path.join("__")}`;
  // Write level label only if absent
  const existingLbl: Option[] = await fetch(`/api/dropdown-options?group=${encodeURIComponent(lk)}`).then(r => r.ok ? r.json() : []);
  if (tree.levelLabel && existingLbl.length === 0) {
    await fetch("/api/dropdown-options", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupKey: lk, label: tree.levelLabel }),
    });
  }
  // Write items (skip duplicates)
  const existingOpts: Option[] = await fetch(`/api/dropdown-options?group=${encodeURIComponent(gk)}`).then(r => r.ok ? r.json() : []);
  const existingLabels = new Set(existingOpts.map(o => o.label));
  for (const node of tree.items) {
    if (!existingLabels.has(node.label)) {
      await fetch("/api/dropdown-options", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupKey: gk, label: node.label }),
      });
    }
    if (node.children && node.children.items.length > 0) {
      await writeTree([...path, node.label], node.children, prefix);
    }
  }
}

// ─── Draft tree types + pure operations (for local-state editing) ──────────────
type DraftItem  = { id: string; label: string; sub: DraftLevel | null }
type DraftLevel = { lbl: string; items: DraftItem[] }

function uid() { return Math.random().toString(36).slice(2, 9) + Math.random().toString(36).slice(2, 5); }

function treeToLevel(tree: DropdownTree): DraftLevel {
  return {
    lbl: tree.levelLabel ?? "",
    items: tree.items.map(n => ({
      id: uid(), label: n.label,
      sub: n.children && n.children.items.length > 0 ? treeToLevel(n.children) : null,
    })),
  };
}
function levelToTree(lvl: DraftLevel): DropdownTree {
  return {
    levelLabel: lvl.lbl || undefined,
    items: lvl.items.map(n => ({
      label: n.label,
      children: n.sub && n.sub.items.length > 0 ? levelToTree(n.sub) : undefined,
    })),
  };
}
function dMap(lvl: DraftLevel, id: string, fn: (i: DraftItem) => DraftItem): DraftLevel {
  return {
    ...lvl,
    items: lvl.items.map(i => {
      if (i.id === id) return fn(i);
      return i.sub ? { ...i, sub: dMap(i.sub, id, fn) } : i;
    }),
  };
}
function dAdd(lvl: DraftLevel, parentId: string | null, label: string): DraftLevel {
  const item: DraftItem = { id: uid(), label, sub: null };
  if (!parentId) return { ...lvl, items: [...lvl.items, item] };
  return dMap(lvl, parentId, i => ({
    ...i, sub: i.sub ? { ...i.sub, items: [...i.sub.items, item] } : { lbl: "", items: [item] },
  }));
}
function dRename(lvl: DraftLevel, id: string, label: string): DraftLevel {
  return dMap(lvl, id, i => ({ ...i, label }));
}
function dDelete(lvl: DraftLevel, id: string): DraftLevel {
  const filtered = { ...lvl, items: lvl.items.filter(i => i.id !== id) };
  if (filtered.items.length < lvl.items.length) return filtered;
  return { ...lvl, items: lvl.items.map(i => i.sub ? { ...i, sub: dDelete(i.sub, id) } : i) };
}
function dSetLbl(lvl: DraftLevel, parentId: string | null, lbl: string): DraftLevel {
  if (!parentId) return { ...lvl, lbl };
  return dMap(lvl, parentId, i => ({ ...i, sub: { ...(i.sub ?? { lbl: "", items: [] }), lbl } }));
}
async function clearTreeFromDB(path: string[], prefix = "sub") {
  await fetch("/api/dropdown-options", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prefixes: [
        `${prefix}__${path.join("__")}`,
        `_lbl__${prefix}__${path.join("__")}`,
      ],
    }),
  });
}

// Dropdown groups used by the military-training event form
const FORM_GROUPS = [
  { key: "subCategory",    label: "ประเภทงานราชการ",      defaults: OFFICIAL_SUB_CATEGORIES },
  { key: "courseType",     label: "หลักสูตร",             defaults: COURSE_TYPES },
  { key: "subject",        label: "วิชา",                 defaults: DEFAULT_SUBJECTS },
  { key: "instructor",     label: "ผู้สอน",               defaults: DEFAULT_INSTRUCTORS },
  { key: "teachingMethod", label: "วิธีสอน",              defaults: DEFAULT_TEACHING_METHODS },
  { key: "location",       label: "สถานที่",              defaults: DEFAULT_LOCATIONS },
  { key: "evidence",       label: "หลักฐาน",              defaults: DEFAULT_EVIDENCE },
  { key: "dressCode",      label: "การแต่งกาย",           defaults: DEFAULT_DRESS_CODES },
  { key: "docTopic",       label: "เรื่องเอกสารประกอบ",  defaults: [] },
];

const enc = (s: string) => encodeURIComponent(s);

// ─────────────────────────────────────────────────────────────────────────────
// LevelEditor — recursive UI for one DraftLevel (used inside DraftSubEditor)
// ─────────────────────────────────────────────────────────────────────────────
function LevelEditor({
  level, depth, parentId, root, onCommit,
}: {
  level: DraftLevel; depth: number; parentId: string | null;
  root: DraftLevel; onCommit: (newRoot: DraftLevel) => void;
}) {
  const [addVal,     setAddVal]     = useState("");
  const [editId,     setEditId]     = useState<string | null>(null);
  const [editVal,    setEditVal]    = useState("");
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [editingLbl, setEditingLbl] = useState(false);
  const [lblDraft,   setLblDraft]   = useState("");

  function add() {
    const l = addVal.trim(); if (!l) return;
    onCommit(dAdd(root, parentId, l)); setAddVal("");
  }
  function rename(id: string) {
    const l = editVal.trim(); if (!l) return;
    onCommit(dRename(root, id, l)); setEditId(null);
  }
  function del(id: string) {
    if (!confirm("ลบรายการนี้และตัวเลือกย่อยทั้งหมด?")) return;
    onCommit(dDelete(root, id));
    if (expanded === id) setExpanded(null);
  }
  function commitLbl() { onCommit(dSetLbl(root, parentId, lblDraft)); setEditingLbl(false); }

  return (
    <div className={depth > 0 ? "mt-1 pl-4 border-l-2 border-dashed border-gray-200" : ""}>
      {/* Level label */}
      <div className="flex items-center gap-2 mb-1 mt-1">
        <Tag size={11} className="text-gray-400 flex-shrink-0" />
        {editingLbl ? (
          <>
            <input autoFocus value={lblDraft} onChange={e => setLblDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") commitLbl(); if (e.key === "Escape") setEditingLbl(false); }}
              placeholder="ชื่อ dropdown เช่น หลักสูตร / วิชา"
              className="flex-1 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1" style={{ borderColor: "var(--primary)" }} />
            <button onClick={commitLbl} className="p-1 text-white rounded" style={{ backgroundColor: "var(--primary)" }}><Check size={11} /></button>
            <button onClick={() => setEditingLbl(false)} className="p-1 border rounded text-gray-400 hover:bg-gray-50"><X size={11} /></button>
          </>
        ) : (
          <>
            <span className="text-xs flex-1 italic text-gray-400">
              {level.lbl
                ? <span>ชื่อ dropdown: <strong className="not-italic text-gray-700">{level.lbl}</strong></span>
                : <span>ยังไม่ได้ตั้งชื่อ dropdown สำหรับระดับนี้</span>}
            </span>
            <button onClick={() => { setLblDraft(level.lbl); setEditingLbl(true); }}
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded border flex-shrink-0"
              style={{ color: "var(--primary)", borderColor: "var(--primary)", backgroundColor: "var(--primary-light)" }}>
              <Pencil size={10} /> ตั้งชื่อ
            </button>
          </>
        )}
      </div>

      {/* Items */}
      <div className="space-y-1">
        {level.items.length === 0 && <p className="text-xs text-gray-400 italic px-1">ยังไม่มีตัวเลือก — เพิ่มด้านล่าง</p>}
        {level.items.map(item => (
          <div key={item.id}>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-gray-100">
              <button onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                className="flex-shrink-0 p-0.5 rounded transition-colors"
                style={{ color: expanded === item.id ? "var(--primary)" : "#d1d5db" }}>
                <ChevronRight size={13} className={`transition-transform ${expanded === item.id ? "rotate-90" : ""}`} />
              </button>
              {editId === item.id ? (
                <>
                  <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") rename(item.id); if (e.key === "Escape") setEditId(null); }}
                    className="flex-1 text-sm border rounded px-2 py-0.5 focus:outline-none focus:ring-1" style={{ borderColor: "var(--primary)" }} />
                  <button onClick={() => rename(item.id)} className="p-1 text-white rounded" style={{ backgroundColor: "var(--primary)" }}><Check size={12} /></button>
                  <button onClick={() => setEditId(null)} className="p-1 border rounded text-gray-400 hover:bg-gray-50"><X size={12} /></button>
                  <button onClick={() => { setEditId(null); del(item.id); }} className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors" title="ลบ"><Trash2 size={12} /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-gray-700 truncate">{item.label}</span>
                  <button onClick={() => { setEditId(item.id); setEditVal(item.label); }}
                    className="p-1 text-gray-400 rounded transition-colors"
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--primary)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "")}>
                    <Pencil size={12} />
                  </button>
                </>
              )}
            </div>
            {expanded === item.id && (
              <div className="mt-1 mb-1">
                <LevelEditor
                  level={item.sub ?? { lbl: "", items: [] }}
                  depth={depth + 1}
                  parentId={item.id}
                  root={root}
                  onCommit={onCommit}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add */}
      <div className="flex gap-1.5 mt-2">
        <input value={addVal} onChange={e => setAddVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") add(); }}
          placeholder="เพิ่มตัวเลือก..."
          className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1"
          style={{ "--tw-ring-color": "var(--primary)" } as any} />
        <button onClick={add}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-white rounded-lg transition-colors"
          style={{ backgroundColor: "var(--primary)" }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--primary-dark)")}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--primary)")}>
          <Plus size={12} /> เพิ่ม
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DraftSubEditor — edit session: local state, undo/redo, save to DB on commit
// ─────────────────────────────────────────────────────────────────────────────
function DraftSubEditor({
  rootPath, prefix = "sub", onDone,
}: {
  rootPath: string[]; prefix?: string; onDone: () => void;
}) {
  const [es, setEs] = useState<{ hist: DraftLevel[]; idx: number }>({ hist: [], idx: -1 });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  const cur: DraftLevel = es.hist[es.idx] ?? { lbl: "", items: [] };
  const canUndo = es.idx > 0;
  const canRedo = es.idx < es.hist.length - 1;

  useEffect(() => {
    fetchTree(rootPath, prefix).then(tree => {
      const lvl = treeToLevel(tree);
      setEs({ hist: [lvl], idx: 0 });
      setLoading(false);
    });
  }, []);

  // Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); setEs(p => ({ ...p, idx: Math.max(0, p.idx - 1) })); }
      if (e.key === "y" || (e.key === "z" && e.shiftKey)) { e.preventDefault(); setEs(p => ({ ...p, idx: Math.min(p.hist.length - 1, p.idx + 1) })); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function commit(newRoot: DraftLevel) {
    setEs(prev => {
      const newHist = [...prev.hist.slice(0, prev.idx + 1), newRoot];
      return { hist: newHist, idx: newHist.length - 1 };
    });
  }

  async function save() {
    setSaving(true);
    await clearTreeFromDB(rootPath, prefix);
    await writeTree(rootPath, levelToTree(cur), prefix);
    setSaving(false);
    onDone();
  }

  if (loading) return <p className="text-xs text-gray-400 py-3 animate-pulse px-1">กำลังโหลด...</p>;

  return (
    <div>
      {/* Edit toolbar */}
      <div className="flex items-center gap-1.5 mb-3 pb-2.5 border-b border-gray-100">
        <button onClick={() => setEs(p => ({ ...p, idx: Math.max(0, p.idx - 1) }))} disabled={!canUndo}
          title="ย้อนกลับ (Ctrl+Z)"
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          ↩ Undo
        </button>
        <button onClick={() => setEs(p => ({ ...p, idx: Math.min(p.hist.length - 1, p.idx + 1) }))} disabled={!canRedo}
          title="ทำซ้ำ (Ctrl+Y)"
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          ↪ Redo
        </button>
        <span className="text-xs text-gray-300 ml-1">{es.idx + 1}/{es.hist.length}</span>
        <span className="flex-1" />
        <button onClick={onDone}
          className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
          ยกเลิก
        </button>
        <button onClick={save} disabled={saving}
          className="text-xs px-4 py-1.5 rounded text-white font-medium transition-colors disabled:opacity-50"
          style={{ backgroundColor: "var(--primary)" }}
          onMouseEnter={e => !saving && (e.currentTarget.style.backgroundColor = "var(--primary-dark)")}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--primary)")}>
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </div>

      <LevelEditor
        level={cur}
        depth={0}
        parentId={null}
        root={cur}
        onCommit={commit}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FlatGroupManager — flat editable list with copy/paste (for military-form dropdowns)
// ─────────────────────────────────────────────────────────────────────────────
function FlatGroupManager({ groupKey, defaults }: { groupKey: string; defaults: string[] }) {
  const { clipboard, setClipboard } = useContext(ClipboardContext);

  const [items,   setItems]   = useState<Option[]>([]);
  const [adding,  setAdding]  = useState("");
  const [editId,  setEditId]  = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [copying, setCopying] = useState(false);
  const [copied,  setCopied]  = useState(false);
  const [pasting, setPasting] = useState(false);

  useEffect(() => { load(); }, [groupKey]);

  async function load() {
    const r = await fetch(`/api/dropdown-options?group=${enc(groupKey)}`);
    let opts: Option[] = r.ok ? await r.json() : [];
    if (opts.length === 0 && defaults.length > 0) {
      await Promise.all(defaults.map(label =>
        fetch("/api/dropdown-options", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupKey, label }) })
      ));
      const r2 = await fetch(`/api/dropdown-options?group=${enc(groupKey)}`);
      opts = r2.ok ? await r2.json() : [];
    }
    setItems(opts);
  }
  async function add() {
    const label = adding.trim();
    if (!label) return;
    const r = await fetch("/api/dropdown-options", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupKey, label }) });
    if (r.ok) { const o = await r.json(); setItems(p => [...p, o]); setAdding(""); }
  }
  async function save(id: string) {
    const label = editVal.trim();
    if (!label) return;
    const r = await fetch("/api/dropdown-options", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, label }) });
    if (r.ok) { setItems(p => p.map(o => o.id === id ? { ...o, label } : o)); setEditId(null); }
  }
  async function del(opt: Option) {
    if (!confirm(`ลบ "${opt.label}"?`)) return;
    await fetch("/api/dropdown-options", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: opt.id }) });
    setItems(p => p.filter(o => o.id !== opt.id));
  }
  function handleCopy() {
    setCopying(true);
    const tree: DropdownTree = { items: items.map(o => ({ label: o.label })) };
    setClipboard(tree);
    setCopying(false);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }
  async function handlePaste() {
    if (!clipboard) return;
    setPasting(true);
    const existingLabels = new Set(items.map(o => o.label));
    for (const node of clipboard.items) {
      if (!existingLabels.has(node.label)) {
        const r = await fetch("/api/dropdown-options", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupKey, label: node.label }),
        });
        if (r.ok) {
          const o = await r.json();
          setItems(p => [...p, o]);
          existingLabels.add(node.label);
        }
      }
    }
    setPasting(false);
  }

  return (
    <div className="space-y-1 mt-2">
      {/* Copy / Paste toolbar */}
      <div className="flex items-center gap-1.5 mb-2">
        <button onClick={handleCopy} disabled={copying || items.length === 0}
          title="คัดลอกรายการทั้งหมดในกลุ่มนี้"
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${
            copied ? "border-green-400 text-green-600 bg-green-50"
                   : "border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
          } disabled:opacity-40`}>
          <Copy size={10} />
          {copied ? "คัดลอกแล้ว!" : "คัดลอก"}
        </button>
        {clipboard && (
          <button onClick={handlePaste} disabled={pasting}
            title={`วาง ${clipboard.items.length} รายการลงในกลุ่มนี้ (ข้ามรายการที่มีอยู่แล้ว)`}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-orange-300 text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors disabled:opacity-40">
            {pasting ? <Loader2 size={10} className="animate-spin" /> : <Clipboard size={10} />}
            {pasting ? "กำลังวาง..." : `วาง (${clipboard.items.length} รายการ)`}
          </button>
        )}
      </div>

      {items.length === 0 && <p className="text-xs text-gray-400 italic px-1">ยังไม่มีรายการ — เพิ่มด้านล่าง</p>}
      {items.map(opt => (
        <div key={opt.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-100">
          {editId === opt.id ? (
            <>
              <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") save(opt.id); if (e.key === "Escape") setEditId(null); }}
                className="flex-1 text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1" style={{ borderColor: "var(--primary)" }} />
              <button onClick={() => save(opt.id)} className="p-1 text-white rounded" style={{ backgroundColor: "var(--primary)" }}><Check size={12} /></button>
              <button onClick={() => setEditId(null)} className="p-1 border rounded text-gray-400 hover:bg-gray-50"><X size={12} /></button>
              <button onClick={() => { setEditId(null); del(opt); }} className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors" title="ลบ"><Trash2 size={12} /></button>
            </>
          ) : (
            <>
              <span className="flex-1 text-sm text-gray-700 truncate">{opt.label}</span>
              <button onClick={() => { setEditId(opt.id); setEditVal(opt.label); }}
                className="p-1 text-gray-400 rounded transition-colors"
                onMouseEnter={e => (e.currentTarget.style.color = "var(--primary)")}
                onMouseLeave={e => (e.currentTarget.style.color = "")}>
                <Pencil size={13} />
              </button>
            </>
          )}
        </div>
      ))}
      <div className="flex gap-2 mt-2">
        <input value={adding} onChange={e => setAdding(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") add(); }}
          placeholder="เพิ่มรายการใหม่..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
          style={{ "--tw-ring-color": "var(--primary)" } as any} />
        <button onClick={add}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-white rounded-lg transition-colors"
          style={{ backgroundColor: "var(--primary)" }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--primary-dark)")}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--primary)")}>
          <Plus size={14} /> เพิ่ม
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main admin page
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<"dropdown" | "theme">("dropdown");
  const [currentTheme, setCurrentTheme] = useState("blue");

  // All work categories (including งานราชการ) — all equal
  const [allCats,    setAllCats]    = useState<Option[]>([]);
  const [openCatId,  setOpenCatId]  = useState<string | null>(null);
  const [editCatId,  setEditCatId]  = useState<string | null>(null);
  const [editCatVal, setEditCatVal] = useState("");
  const [newCatInput, setNewCatInput] = useState("");
  const [addingCat,   setAddingCat]  = useState(false);
  const [loading,     setLoading]    = useState(false);

  // Which category is currently open in DraftSubEditor
  const [editingCatId,  setEditingCatId]  = useState<string | null>(null);
  const [editingTmplId, setEditingTmplId] = useState<string | null>(null);

  // Collapsible section for military-form dropdowns
  const [showFormGroups,   setShowFormGroups]   = useState(false);
  const [openFormGroupKey, setOpenFormGroupKey] = useState<string | null>(null);

  // Template categories (ไม่แสดงในปฏิทิน — ใช้เป็นแม่แบบสำหรับตั้งค่า dropdown)
  const [tmplCats,      setTmplCats]      = useState<Option[]>([]);
  const [openTmplId,    setOpenTmplId]    = useState<string | null>(null);
  const [editTmplId,    setEditTmplId]    = useState<string | null>(null);
  const [editTmplVal,   setEditTmplVal]   = useState("");
  const [newTmplInput,  setNewTmplInput]  = useState("");
  const [addingTmpl,    setAddingTmpl]    = useState(false);
  const [showTmplSect,  setShowTmplSect]  = useState(false);

  const isAdmin = session?.user.role === "admin";

  // Shared clipboard for copy/paste across all SubItemsManager instances
  const [clipboard, setClipboardState] = useState<DropdownTree | null>(null);
  function setClipboard(tree: DropdownTree | null) {
    setClipboardState(tree);
    if (tree) {
      try { localStorage.setItem("dropdown_clipboard", JSON.stringify(tree)); } catch {}
    } else {
      localStorage.removeItem("dropdown_clipboard");
    }
  }

  useEffect(() => {
    setCurrentTheme(localStorage.getItem("themeId") ?? "blue");
    // Restore clipboard from last session
    try {
      const saved = localStorage.getItem("dropdown_clipboard");
      if (saved) setClipboardState(JSON.parse(saved));
    } catch {}
    loadAllCats();
    loadTmplCats();
  }, []);

  async function loadAllCats() {
    setLoading(true);
    const r = await fetch("/api/dropdown-options?group=workCategory");
    let opts: Option[] = r.ok ? await r.json() : [];

    // Seed defaults if empty
    if (opts.length === 0) {
      const defaults = ["งานราชการ", "งานนอกราชการ"];
      await Promise.all(defaults.map(label =>
        fetch("/api/dropdown-options", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupKey: "workCategory", label }) })
      ));
      const r2 = await fetch("/api/dropdown-options?group=workCategory");
      opts = r2.ok ? await r2.json() : [];
    }
    setAllCats(opts);
    setLoading(false);
  }

  async function addCategory() {
    const label = newCatInput.trim();
    if (!label) return;
    const r = await fetch("/api/dropdown-options", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupKey: "workCategory", label }),
    });
    if (r.ok) {
      const opt = await r.json();
      setAllCats(p => [...p, opt]);
      setNewCatInput(""); setAddingCat(false);
      setOpenCatId(opt.id);
    }
  }

  async function saveEditCat(id: string) {
    const label = editCatVal.trim();
    if (!label) return;
    const oldLabel = allCats.find(o => o.id === id)?.label ?? "";
    // Cascade: every sub-item groupKey that starts with "sub__<oldLabel>" → "sub__<newLabel>"
    const cascadePrefixes = oldLabel && oldLabel !== label ? [
      { old: `sub__${oldLabel}`,       new: `sub__${label}` },
      { old: `_lbl__sub__${oldLabel}`, new: `_lbl__sub__${label}` },
    ] : [];
    const r = await fetch("/api/dropdown-options", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, label, cascadePrefixes }),
    });
    if (r.ok) {
      setAllCats(p => p.map(o => o.id === id ? { ...o, label } : o));
      setEditCatId(null);
      // Close draft editor (rootPath would be stale after rename)
      if (editingCatId === id) setEditingCatId(null);
    }
  }

  async function deleteCategory(opt: Option) {
    if (!confirm(`ลบหมวดงาน "${opt.label}" ออกจากระบบ?\n\nตัวเลือก dropdown ทั้งหมดของหมวดนี้จะถูกลบด้วย`)) return;
    await fetch("/api/dropdown-options", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: opt.id }),
    });
    setAllCats(p => p.filter(o => o.id !== opt.id));
    if (openCatId === opt.id) setOpenCatId(null);
  }

  // ── Template category CRUD ────────────────────────────────────────────────
  async function loadTmplCats() {
    const r = await fetch("/api/dropdown-options?group=templateCategory");
    if (r.ok) setTmplCats(await r.json());
  }
  async function addTmplCategory() {
    const label = newTmplInput.trim();
    if (!label) return;
    const r = await fetch("/api/dropdown-options", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupKey: "templateCategory", label }),
    });
    if (r.ok) {
      const opt = await r.json();
      setTmplCats(p => [...p, opt]);
      setNewTmplInput(""); setAddingTmpl(false);
      setOpenTmplId(opt.id);
    }
  }
  async function saveEditTmpl(id: string) {
    const label = editTmplVal.trim();
    if (!label) return;
    const oldLabel = tmplCats.find(o => o.id === id)?.label ?? "";
    const cascadePrefixes = oldLabel && oldLabel !== label ? [
      { old: `tmpl__${oldLabel}`,       new: `tmpl__${label}` },
      { old: `_lbl__tmpl__${oldLabel}`, new: `_lbl__tmpl__${label}` },
    ] : [];
    const r = await fetch("/api/dropdown-options", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, label, cascadePrefixes }),
    });
    if (r.ok) {
      setTmplCats(p => p.map(o => o.id === id ? { ...o, label } : o));
      setEditTmplId(null);
      if (editingTmplId === id) setEditingTmplId(null);
    }
  }
  async function deleteTmplCategory(opt: Option) {
    if (!confirm(`ลบหมวดต้นแบบ "${opt.label}"?\n\nตัวเลือก dropdown ทั้งหมดของหมวดนี้จะถูกลบด้วย`)) return;
    await fetch("/api/dropdown-options", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: opt.id }),
    });
    setTmplCats(p => p.filter(o => o.id !== opt.id));
    if (openTmplId === opt.id) setOpenTmplId(null);
  }

  function handleTheme(id: string) { setCurrentTheme(id); applyTheme(id); }

  if (!isAdmin) return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">ตั้งค่าระบบ</h1>
      <p className="text-gray-500 text-sm">คุณไม่มีสิทธิ์เข้าถึงหน้านี้ กรุณาติดต่อผู้ดูแลระบบ</p>
    </div>
  );

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">ตั้งค่าระบบ</h1>
      <p className="text-sm text-gray-400 mb-6">จัดการ Dropdown และธีมสีของระบบ</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {[{ id: "dropdown", label: "จัดการ Dropdown" }, { id: "theme", label: "ธีมสี" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t.id ? "" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            style={tab === t.id ? { color: "var(--primary)", borderColor: "var(--primary)" } : {}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Dropdown Tab ── */}
      {tab === "dropdown" && (
        <ClipboardContext.Provider value={{ clipboard, setClipboard }}>
        <div className="space-y-3">

          {/* ══ Clipboard status banner ══ */}
          {clipboard && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-orange-200 bg-orange-50 text-xs text-orange-700">
              <div className="flex items-center gap-2">
                <Clipboard size={13} />
                <span>
                  คลิปบอร์ด: <strong>{clipboard.items.length} รายการ</strong>
                  {clipboard.levelLabel && <span className="ml-1 text-orange-500">(ชื่อ: {clipboard.levelLabel})</span>}
                  {" — กด "}<strong>วาง</strong>{" ในระดับที่ต้องการ"}
                </span>
              </div>
              <button onClick={() => setClipboard(null)}
                title="ล้างคลิปบอร์ด"
                className="ml-3 p-0.5 rounded hover:bg-orange-200 text-orange-400 hover:text-orange-600 transition-colors">
                <X size={13} />
              </button>
            </div>
          )}

          {/* ══ หมวดงาน section header ══ */}
          <div className="flex items-center justify-between mb-1 px-1">
            <div>
              <h2 className="text-sm font-bold text-gray-700">หมวดงาน</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                คลิก <span className="font-semibold">▶</span> เพื่อสร้าง/จัดการ dropdown ย่อยของแต่ละหมวด — ไม่จำกัดจำนวนระดับ
              </p>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {allCats.length} หมวด
            </span>
          </div>

          {loading && <p className="text-sm text-gray-400 animate-pulse px-1">กำลังโหลด...</p>}

          {/* ══ Category cards (ALL equal — no lock) ══ */}
          {allCats.map(cat => (
            <div key={cat.id} className="rounded-xl border border-gray-200 overflow-hidden bg-white">
              {/* Card header */}
              <div className={`flex items-center gap-2 px-4 py-3 transition-colors ${openCatId === cat.id ? "border-b border-gray-100" : ""}`}
                style={openCatId === cat.id ? { backgroundColor: "var(--primary-light)" } : {}}>

                {/* Expand toggle */}
                <button onClick={() => setOpenCatId(openCatId === cat.id ? null : cat.id)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left">
                  {openCatId === cat.id
                    ? <ChevronDown size={15} style={{ color: "var(--primary)", flexShrink: 0 }} />
                    : <ChevronRight size={15} className="text-gray-400 flex-shrink-0" />}

                  {editCatId === cat.id ? (
                    <input autoFocus value={editCatVal} onChange={e => setEditCatVal(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") saveEditCat(cat.id); if (e.key === "Escape") setEditCatId(null); }}
                      onClick={e => e.stopPropagation()}
                      className="flex-1 text-sm font-semibold border rounded px-2 py-0.5 focus:outline-none focus:ring-1"
                      style={{ borderColor: "var(--primary)" }} />
                  ) : (
                    <span className="font-semibold text-gray-800 text-sm truncate">{cat.label}</span>
                  )}
                </button>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  {editCatId === cat.id ? (
                    <>
                      <button onClick={() => saveEditCat(cat.id)}
                        className="p-1.5 text-white rounded-lg" style={{ backgroundColor: "var(--primary)" }}>
                        <Check size={13} />
                      </button>
                      <button onClick={() => setEditCatId(null)} className="p-1.5 border rounded-lg text-gray-400 hover:bg-gray-100">
                        <X size={13} />
                      </button>
                      <button onClick={() => { setEditCatId(null); deleteCategory(cat); }}
                        title="ลบหมวดงาน"
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => { setEditCatId(cat.id); setEditCatVal(cat.label); }}
                      title="เปลี่ยนชื่อหมวดงาน"
                      className="p-1.5 text-gray-400 rounded-lg hover:bg-white/70 transition-colors"
                      onMouseEnter={e => (e.currentTarget.style.color = "var(--primary)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "")}>
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Sub-items area */}
              {openCatId === cat.id && (
                <div className="p-4">
                  {editingCatId === cat.id ? (
                    /* ── Edit mode: DraftSubEditor ── */
                    <DraftSubEditor
                      rootPath={[cat.label]}
                      prefix="sub"
                      onDone={() => setEditingCatId(null)}
                    />
                  ) : (
                    /* ── View mode: show "แก้ไขตัวเลือก" button ── */
                    <div className="flex items-center gap-3">
                      <Settings2 size={12} className="text-gray-400 flex-shrink-0" />
                      <p className="text-xs text-gray-500 flex-1">
                        จัดการ dropdown ย่อยสำหรับ <strong>{cat.label}</strong>
                      </p>
                      <button
                        onClick={() => { setEditingCatId(cat.id); }}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors flex-shrink-0"
                        style={{ color: "var(--primary)", borderColor: "var(--primary)", backgroundColor: "var(--primary-light)" }}>
                        <Pencil size={11} /> แก้ไขตัวเลือก
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* ══ Add new category ══ */}
          {addingCat ? (
            <div className="flex gap-2 p-3 rounded-xl border-2 border-dashed"
              style={{ borderColor: "var(--primary)" }}>
              <input autoFocus value={newCatInput} onChange={e => setNewCatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addCategory(); if (e.key === "Escape") setAddingCat(false); }}
                placeholder="ชื่อหมวดงานใหม่..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": "var(--primary)" } as any} />
              <button onClick={addCategory}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-white rounded-lg transition-colors"
                style={{ backgroundColor: "var(--primary)" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--primary-dark)")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--primary)")}>
                <Plus size={14} /> เพิ่ม
              </button>
              <button onClick={() => setAddingCat(false)} className="px-3 py-2 text-sm text-gray-500 border rounded-lg hover:bg-gray-50">
                ยกเลิก
              </button>
            </div>
          ) : (
            <button onClick={() => setAddingCat(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.color = ""; }}>
              <Plus size={15} /> เพิ่มหมวดงานใหม่
            </button>
          )}

          {/* ══ หมวดต้นแบบ (Template categories — hidden from calendar) ══ */}
          <div className="mt-4 rounded-xl border border-dashed border-indigo-200 overflow-hidden bg-indigo-50/30">
            <button onClick={() => setShowTmplSect(v => !v)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-indigo-50 transition-colors">
              <div className="flex items-center gap-3">
                <Layers size={15} className="text-indigo-400 flex-shrink-0" />
                <div className="text-left">
                  <span className="font-semibold text-indigo-700 text-sm">หมวดต้นแบบ (Template)</span>
                  <span className="ml-2 text-xs bg-indigo-100 text-indigo-500 px-2 py-0.5 rounded-full">ไม่แสดงในปฏิทิน</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-indigo-400">{tmplCats.length} แม่แบบ</span>
                {showTmplSect
                  ? <ChevronDown size={15} className="text-indigo-400" />
                  : <ChevronRight size={15} className="text-indigo-400" />}
              </div>
            </button>

            {showTmplSect && (
              <div className="px-4 pb-4 space-y-2 bg-white border-t border-indigo-100">
                <p className="text-xs text-indigo-500 mt-3 mb-2 leading-relaxed">
                  สร้างโครงสร้าง dropdown ไว้เป็นแม่แบบ — <strong>ไม่ปรากฏในหน้าสร้างกิจกรรม</strong>
                  ใช้ปุ่ม <strong>คัดลอก</strong> แล้ว <strong>วาง</strong> ลงหมวดงานจริงได้เลย
                </p>

                {/* Template category cards */}
                {tmplCats.map(cat => (
                  <div key={cat.id} className="rounded-xl border border-indigo-200 overflow-hidden bg-white">
                    <div className={`flex items-center gap-2 px-4 py-3 transition-colors ${openTmplId === cat.id ? "border-b border-indigo-100 bg-indigo-50" : ""}`}>
                      <button onClick={() => setOpenTmplId(openTmplId === cat.id ? null : cat.id)}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left">
                        {openTmplId === cat.id
                          ? <ChevronDown size={15} className="text-indigo-500 flex-shrink-0" />
                          : <ChevronRight size={15} className="text-gray-400 flex-shrink-0" />}
                        {editTmplId === cat.id ? (
                          <input autoFocus value={editTmplVal} onChange={e => setEditTmplVal(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") saveEditTmpl(cat.id); if (e.key === "Escape") setEditTmplId(null); }}
                            onClick={e => e.stopPropagation()}
                            className="flex-1 text-sm font-semibold border rounded px-2 py-0.5 focus:outline-none focus:ring-1 border-indigo-400" />
                        ) : (
                          <span className="font-semibold text-indigo-800 text-sm truncate">{cat.label}</span>
                        )}
                      </button>
                      <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        {editTmplId === cat.id ? (
                          <>
                            <button onClick={() => saveEditTmpl(cat.id)}
                              className="p-1.5 text-white rounded-lg bg-indigo-500 hover:bg-indigo-600">
                              <Check size={13} />
                            </button>
                            <button onClick={() => setEditTmplId(null)} className="p-1.5 border rounded-lg text-gray-400 hover:bg-gray-100">
                              <X size={13} />
                            </button>
                            <button onClick={() => { setEditTmplId(null); deleteTmplCategory(cat); }}
                              title="ลบแม่แบบ"
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </>
                        ) : (
                          <button onClick={() => { setEditTmplId(cat.id); setEditTmplVal(cat.label); }}
                            title="เปลี่ยนชื่อแม่แบบ"
                            className="p-1.5 text-indigo-300 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors">
                            <Pencil size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    {openTmplId === cat.id && (
                      <div className="p-4">
                        {editingTmplId === cat.id ? (
                          <DraftSubEditor
                            rootPath={[cat.label]}
                            prefix="tmpl"
                            onDone={() => setEditingTmplId(null)}
                          />
                        ) : (
                          <div className="flex items-center gap-3">
                            <Layers size={12} className="text-indigo-400 flex-shrink-0" />
                            <p className="text-xs text-indigo-500 flex-1">
                              ออกแบบ dropdown สำหรับแม่แบบ <strong>{cat.label}</strong>
                            </p>
                            <button
                              onClick={() => setEditingTmplId(cat.id)}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium border-indigo-300 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors flex-shrink-0">
                              <Pencil size={11} /> แก้ไขตัวเลือก
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Add new template */}
                {addingTmpl ? (
                  <div className="flex gap-2 p-3 rounded-xl border-2 border-dashed border-indigo-300">
                    <input autoFocus value={newTmplInput} onChange={e => setNewTmplInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addTmplCategory(); if (e.key === "Escape") setAddingTmpl(false); }}
                      placeholder="ชื่อแม่แบบใหม่..."
                      className="flex-1 border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    <button onClick={addTmplCategory}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm text-white rounded-lg bg-indigo-500 hover:bg-indigo-600 transition-colors">
                      <Plus size={14} /> เพิ่ม
                    </button>
                    <button onClick={() => setAddingTmpl(false)} className="px-3 py-2 text-sm text-gray-500 border rounded-lg hover:bg-gray-50">
                      ยกเลิก
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setAddingTmpl(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-indigo-200 text-sm text-indigo-400 hover:bg-indigo-50 hover:border-indigo-300 transition-colors">
                    <Plus size={14} /> เพิ่มแม่แบบใหม่
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ══ Military form dropdowns (collapsible — ไม่แสดงในปฏิทิน) ══ */}
          <div className="mt-4 rounded-xl border border-gray-200 overflow-hidden">
            <button onClick={() => setShowFormGroups(v => !v)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-semibold text-gray-700 text-sm flex-shrink-0">ดรอปดาวน์แบบฟอร์มกิจกรรมราชการ</span>
                <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full flex-shrink-0">ไม่แสดงในปฏิทิน</span>
              </div>
              {showFormGroups
                ? <ChevronDown size={15} className="text-gray-400 flex-shrink-0" />
                : <ChevronRight size={15} className="text-gray-400 flex-shrink-0" />}
            </button>

            {showFormGroups && (
              <div className="bg-white divide-y divide-gray-100">
                {FORM_GROUPS.map(g => (
                  <div key={g.key}>
                    <button onClick={() => setOpenFormGroupKey(openFormGroupKey === g.key ? null : g.key)}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                      <span className="text-sm text-gray-700">{g.label}</span>
                      {openFormGroupKey === g.key
                        ? <ChevronDown size={14} className="text-gray-400" />
                        : <ChevronRight size={14} className="text-gray-400" />}
                    </button>
                    {openFormGroupKey === g.key && (
                      <div className="px-5 pb-4 bg-gray-50">
                        <FlatGroupManager groupKey={g.key} defaults={g.defaults} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
        </ClipboardContext.Provider>
      )}

      {/* ── Theme Tab ── */}
      {tab === "theme" && (
        <div>
          <p className="text-sm text-gray-500 mb-4">เลือกโทนสีหลักของระบบ (20 โทนสี)</p>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
            {THEMES.map(theme => {
              const active = currentTheme === theme.id;
              return (
                <button key={theme.id} onClick={() => handleTheme(theme.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${active ? "shadow-md scale-105" : "border-gray-200 hover:border-gray-300"}`}
                  style={active ? { borderColor: theme.primary, backgroundColor: theme.primaryLight } : {}}>
                  <div className="w-10 h-10 rounded-full shadow-sm flex items-center justify-center"
                    style={{ backgroundColor: theme.primary }}>
                    {active && <Check size={16} className="text-white" />}
                  </div>
                  <span className="text-xs font-medium text-gray-700 text-center leading-tight">{theme.name}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-6 p-4 rounded-xl border"
            style={{ backgroundColor: "var(--primary-light)", borderColor: "var(--primary)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--primary-text)" }}>
              โทนสีที่เลือก: <strong>{THEMES.find(t => t.id === currentTheme)?.name}</strong>
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--primary-text)", opacity: 0.7 }}>
              สีจะถูกบันทึกและใช้งานทุกครั้งที่เข้าใช้งาน
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
