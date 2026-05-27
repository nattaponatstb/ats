"use client";

import { useEffect, useMemo, useState } from "react";
import { format, isToday, isThisWeek, isThisMonth } from "date-fns";
import { th } from "date-fns/locale";
import {
  Search, Clock, Tag, StickyNote, List,
  CalendarDays, ChevronDown, ChevronUp,
  Eye, X, MapPin, ChevronRight, Download, FileText,
  RefreshCw, BarChart2, ChevronLeft,
} from "lucide-react";
import { EVENT_STATUSES } from "@/components/EventFormModal";

// ─── Types ────────────────────────────────────────────────────────────────────
interface EventFile {
  id: string; eventId: string; section: string;
  fileType: string; fileName: string; filePath: string; createdAt: string;
}
interface CustomField { key: string; value: string }
interface RawEvent {
  id: string; title: string;
  startDate: string; endDate: string;
  allDay: boolean; color: string;
  location?: string; metadata?: string;
  user?: { id: string; name: string };
}
interface ParsedEvent extends RawEvent {
  status: string;
  workCategory: string;
  subValues: string[];
  generalNotes: string;
  customFields: CustomField[];
}
interface CatStat {
  cat: string; total: number;
  pending: number; in_progress: number; done: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseMeta(raw?: string) {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
function parseEvent(e: RawEvent): ParsedEvent {
  const m = parseMeta(e.metadata);
  return {
    ...e,
    status:       m.status       ?? "pending",
    workCategory: m.workCategory ?? "",
    subValues:    m.subValues    ?? [],
    generalNotes: m.generalNotes ?? "",
    customFields: m.customFields ?? [],
  };
}
function buildCatStats(evs: ParsedEvent[]): CatStat[] {
  const map = new Map<string, CatStat>();
  evs.forEach(e => {
    const cat = e.workCategory || "(ไม่ระบุหมวด)";
    if (!map.has(cat)) map.set(cat, { cat, total: 0, pending: 0, in_progress: 0, done: 0 });
    const s = map.get(cat)!;
    s.total++;
    if (e.status === "pending") s.pending++;
    else if (e.status === "in_progress") s.in_progress++;
    else if (e.status === "done") s.done++;
  });
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

const STATUS_DOT: Record<string, string> = {
  pending: "#f87171", in_progress: "#facc15", done: "#4ade80",
};
const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  pending:     { bg: "bg-red-100",    text: "text-red-600",    label: "รอดำเนินการ" },
  in_progress: { bg: "bg-yellow-100", text: "text-yellow-700", label: "กำลังดำเนินการ" },
  done:        { bg: "bg-green-100",  text: "text-green-700",  label: "เสร็จแล้ว" },
};
const DATE_FILTERS = [
  { key: "all",   label: "ทั้งหมด" },
  { key: "today", label: "วันนี้" },
  { key: "week",  label: "สัปดาห์นี้" },
  { key: "month", label: "เดือนนี้" },
] as const;

// ─── EventCard ────────────────────────────────────────────────────────────────
function EventCard({ event, onStatusChange, onView }: {
  event: ParsedEvent;
  onStatusChange: (id: string, status: string) => void;
  onView: (event: ParsedEvent) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const start = new Date(event.startDate);
  const end   = new Date(event.endDate);
  const badge = STATUS_BADGE[event.status] ?? STATUS_BADGE.pending;
  const chain = [event.workCategory, ...event.subValues].filter(Boolean);
  const hasExtra = event.generalNotes || event.customFields.length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex">
        <div className="w-1 flex-shrink-0" style={{ backgroundColor: event.color }} />
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <span className={`flex-shrink-0 mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_DOT[event.status] }} />
                {badge.label}
              </span>
              <h3 className="font-semibold text-gray-800 text-sm leading-snug">{event.title}</h3>
            </div>
            {hasExtra && (
              <button onClick={() => setExpanded(v => !v)}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
            <Clock size={12} className="text-gray-400 flex-shrink-0" />
            <span>{event.allDay ? "ทั้งวัน" : `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`}</span>
            {event.user && <span className="ml-2 text-gray-400">· {event.user.name}</span>}
          </div>
          {chain.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
              <Tag size={11} className="text-gray-400 flex-shrink-0" />
              <span className="truncate">{chain.join(" › ")}</span>
            </div>
          )}
          {hasExtra && expanded && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2.5">
              {event.generalNotes && (
                <div className="flex gap-2">
                  <StickyNote size={12} className="text-gray-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{event.generalNotes}</p>
                </div>
              )}
              {event.customFields.length > 0 && (
                <div className="flex gap-2">
                  <List size={12} className="text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1 flex-1">
                    {event.customFields.map((cf, i) => cf.key && (
                      <div key={i} className="flex gap-2 text-xs">
                        <span className="font-medium text-gray-600 flex-shrink-0">{cf.key}:</span>
                        <span className="text-gray-500">{cf.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-100">
            <div className="flex gap-1.5 flex-wrap">
              {EVENT_STATUSES.map(s => (
                <button key={s.value} onClick={() => onStatusChange(event.id, s.value)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${
                    event.status === s.value
                      ? `${s.activeBorder} ${s.activeBg} ${s.activeText}`
                      : "border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600"
                  }`}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.dot }} />
                  {s.label}
                </button>
              ))}
            </div>
            <button onClick={() => onView(event)}
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors">
              <Eye size={12} /> ดู
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Category summary bar ─────────────────────────────────────────────────────
function CatBar({ total, pending, in_progress, done }: { total: number; pending: number; in_progress: number; done: number }) {
  if (total === 0) return <div className="h-1.5 rounded-full bg-gray-100 w-full" />;
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden w-full gap-px">
      {pending > 0     && <div className="rounded-l-full" style={{ width: `${(pending / total) * 100}%`, backgroundColor: "#f87171" }} />}
      {in_progress > 0 && <div style={{ width: `${(in_progress / total) * 100}%`, backgroundColor: "#facc15" }} />}
      {done > 0        && <div className="rounded-r-full" style={{ width: `${(done / total) * 100}%`, backgroundColor: "#4ade80" }} />}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [rawEvents,    setRawEvents]    = useState<RawEvent[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [search,       setSearch]       = useState("");
  const [dateFilter,   setDateFilter]   = useState<"all" | "today" | "week" | "month">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "in_progress" | "done">("all");
  const [catFilter,    setCatFilter]    = useState("");
  const [subFilter,    setSubFilter]    = useState("");
  const [showSummary,  setShowSummary]  = useState(true);
  const [detailEvent,  setDetailEvent]  = useState<ParsedEvent | null>(null);
  const [detailFiles,  setDetailFiles]  = useState<EventFile[]>([]);

  useEffect(() => {
    if (!detailEvent) { setDetailFiles([]); return; }
    fetch(`/api/event-files?eventId=${detailEvent.id}`)
      .then(r => r.ok ? r.json() : []).then(setDetailFiles).catch(() => setDetailFiles([]));
  }, [detailEvent?.id]);

  useEffect(() => { fetchEvents(); }, []);

  async function fetchEvents(showRefresh = false) {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    const res = await fetch("/api/events");
    if (res.ok) setRawEvents(await res.json());
    if (showRefresh) setRefreshing(false); else setLoading(false);
  }

  async function handleStatusChange(eventId: string, newStatus: string) {
    const ev = rawEvents.find(e => e.id === eventId);
    if (!ev) return;
    const meta = parseMeta(ev.metadata);
    meta.status = newStatus;
    const newMeta = JSON.stringify(meta);
    await fetch(`/api/events/${eventId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: ev.title, description: "",
        startDate: ev.startDate, endDate: ev.endDate,
        allDay: ev.allDay, color: ev.color, location: ev.location ?? "", metadata: newMeta,
      }),
    });
    setRawEvents(prev => prev.map(e => e.id === eventId ? { ...e, metadata: newMeta } : e));
  }

  const parsed = useMemo(() => rawEvents.map(parseEvent), [rawEvents]);

  // ── Filter cascade ──────────────────────────────────────────────────────────
  // 1) base: date + status + search (used for category chip counts)
  const base = useMemo(() => parsed.filter(e => {
    const d = new Date(e.startDate);
    if (dateFilter === "today" && !isToday(d)) return false;
    if (dateFilter === "week"  && !isThisWeek(d, { weekStartsOn: 1 })) return false;
    if (dateFilter === "month" && !isThisMonth(d)) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const inTitle = e.title.toLowerCase().includes(q);
      const inCat   = e.workCategory.toLowerCase().includes(q);
      const inSub   = e.subValues.some(s => s.toLowerCase().includes(q));
      if (!inTitle && !inCat && !inSub) return false;
    }
    return true;
  }), [parsed, dateFilter, statusFilter, search]);

  // 2) filtered: base + catFilter + subFilter (event list + stats)
  const filtered = useMemo(() => base.filter(e => {
    if (catFilter && e.workCategory !== catFilter) return false;
    if (subFilter && !e.subValues.includes(subFilter)) return false;
    return true;
  }), [base, catFilter, subFilter]);

  // ── Category chips data ─────────────────────────────────────────────────────
  const catStats = useMemo(() => buildCatStats(base), [base]);

  // ── Sub-value chips (level 1 under selected category) ──────────────────────
  const subStats = useMemo((): CatStat[] => {
    if (!catFilter) return [];
    const evs = base.filter(e => e.workCategory === catFilter);
    const map = new Map<string, CatStat>();
    evs.forEach(e => {
      const sub = e.subValues[0] || "(ไม่ระบุ)";
      if (!map.has(sub)) map.set(sub, { cat: sub, total: 0, pending: 0, in_progress: 0, done: 0 });
      const s = map.get(sub)!;
      s.total++;
      if (e.status === "pending") s.pending++;
      else if (e.status === "in_progress") s.in_progress++;
      else if (e.status === "done") s.done++;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [base, catFilter]);

  // ── Deep sub-value chips (level 2) ─────────────────────────────────────────
  const deepSubStats = useMemo((): CatStat[] => {
    if (!catFilter || !subFilter) return [];
    const evs = base.filter(e => e.workCategory === catFilter && e.subValues[0] === subFilter);
    const map = new Map<string, CatStat>();
    evs.forEach(e => {
      const sub = e.subValues[1] || "(ไม่ระบุ)";
      if (!map.has(sub)) map.set(sub, { cat: sub, total: 0, pending: 0, in_progress: 0, done: 0 });
      const s = map.get(sub)!;
      s.total++;
      if (e.status === "pending") s.pending++;
      else if (e.status === "in_progress") s.in_progress++;
      else if (e.status === "done") s.done++;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [base, catFilter, subFilter]);

  // ── Stats from filtered ─────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:       filtered.length,
    pending:     filtered.filter(e => e.status === "pending").length,
    in_progress: filtered.filter(e => e.status === "in_progress").length,
    done:        filtered.filter(e => e.status === "done").length,
  }), [filtered]);

  // ── Grouped list ────────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map = new Map<string, ParsedEvent[]>();
    filtered.forEach(e => {
      const key = e.startDate.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  // ── Active filter label ─────────────────────────────────────────────────────
  const activeLabel = [catFilter, subFilter].filter(Boolean).join(" › ") || "ทั้งหมด";

  return (
    <div className="p-6 max-w-5xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">แดชบอร์ด</h1>
          <p className="text-sm text-gray-400 mt-0.5">ภาพรวมกำหนดการทั้งหมด</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ / หมวดงาน..."
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 w-60 bg-white" />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>
          <button onClick={() => fetchEvents(true)} disabled={refreshing}
            title="รีเฟรช"
            className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50">
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Stats cards (react to all filters) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "ทั้งหมด",         count: stats.total,       color: "bg-blue-50  text-blue-700  border-blue-200",   dot: null },
          { label: "รอดำเนินการ",     count: stats.pending,     color: "bg-red-50   text-red-600   border-red-200",    dot: "#f87171" },
          { label: "กำลังดำเนินการ", count: stats.in_progress, color: "bg-yellow-50 text-yellow-700 border-yellow-200", dot: "#facc15" },
          { label: "เสร็จแล้ว",       count: stats.done,        color: "bg-green-50  text-green-700  border-green-200",  dot: "#4ade80" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 flex items-center gap-3 ${s.color}`}>
            <div>
              <p className="text-2xl font-bold leading-none">{s.count}</p>
              <p className="text-xs font-medium mt-1 opacity-80">{s.label}</p>
              {(catFilter || subFilter) && (
                <p className="text-xs mt-0.5 opacity-50 truncate max-w-20">{activeLabel}</p>
              )}
            </div>
            {s.dot
              ? <div className="ml-auto w-8 h-8 rounded-full flex items-center justify-center bg-white/60"><div className="w-4 h-4 rounded-full" style={{ backgroundColor: s.dot }} /></div>
              : <div className="ml-auto"><CalendarDays size={22} className="opacity-30" /></div>
            }
          </div>
        ))}
      </div>

      {/* ── Category summary section ── */}
      <div className="mb-5 rounded-xl border border-gray-200 bg-white overflow-hidden">
        <button
          onClick={() => setShowSummary(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-2">
            <BarChart2 size={15} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">สรุปตามหมวดงาน</span>
            {(catFilter || subFilter) && (
              <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: "var(--primary)" }}>
                {activeLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{catStats.length} หมวด · {base.length} รายการ</span>
            {showSummary ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </div>
        </button>

        {showSummary && (
          <div className="border-t border-gray-100 p-4">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_4rem_4rem_4rem_4rem_8rem] gap-x-3 px-2 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <div>หมวดงาน</div>
              <div className="text-center">ทั้งหมด</div>
              <div className="text-center text-red-400">รอ</div>
              <div className="text-center text-yellow-500">กำลัง</div>
              <div className="text-center text-green-500">เสร็จ</div>
              <div>สัดส่วน</div>
            </div>
            <div className="space-y-1.5">
              {catStats.map(s => (
                <button key={s.cat}
                  onClick={() => {
                    setCatFilter(prev => prev === s.cat ? "" : s.cat);
                    setSubFilter("");
                  }}
                  className={`w-full grid grid-cols-[1fr_4rem_4rem_4rem_4rem_8rem] gap-x-3 px-2 py-2 rounded-lg text-sm transition-colors items-center text-left ${
                    catFilter === s.cat
                      ? "text-white"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                  style={catFilter === s.cat ? { backgroundColor: "var(--primary)" } : {}}>
                  <span className="font-medium truncate">{s.cat}</span>
                  <span className={`text-center font-semibold ${catFilter === s.cat ? "text-white" : "text-gray-700"}`}>{s.total}</span>
                  <span className={`text-center ${catFilter === s.cat ? "text-white/80" : "text-red-500"}`}>{s.pending || "-"}</span>
                  <span className={`text-center ${catFilter === s.cat ? "text-white/80" : "text-yellow-600"}`}>{s.in_progress || "-"}</span>
                  <span className={`text-center ${catFilter === s.cat ? "text-white/80" : "text-green-600"}`}>{s.done || "-"}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1"><CatBar total={s.total} pending={s.pending} in_progress={s.in_progress} done={s.done} /></div>
                    <span className={`text-xs flex-shrink-0 ${catFilter === s.cat ? "text-white/70" : "text-gray-400"}`}>
                      {s.total > 0 ? Math.round((s.done / s.total) * 100) : 0}%
                    </span>
                  </div>
                </button>
              ))}
              {catStats.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-3">ไม่มีข้อมูลในช่วงที่เลือก</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Date filters */}
        <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1">
          {DATE_FILTERS.map(f => (
            <button key={f.key} onClick={() => setDateFilter(f.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${dateFilter === f.key ? "text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
              style={dateFilter === f.key ? { backgroundColor: "var(--primary)" } : {}}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Status filters */}
        <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1">
          {([
            { key: "all",         label: "ทุกสถานะ",       dot: null },
            { key: "pending",     label: "รอดำเนินการ",    dot: "#f87171" },
            { key: "in_progress", label: "กำลังดำเนินการ", dot: "#facc15" },
            { key: "done",        label: "เสร็จแล้ว",      dot: "#4ade80" },
          ] as const).map(f => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === f.key ? "text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
              style={statusFilter === f.key ? { backgroundColor: "var(--primary)" } : {}}>
              {f.dot && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: f.dot }} />}
              {f.label}
            </button>
          ))}
        </div>

        {/* Clear all */}
        {(catFilter || subFilter || statusFilter !== "all" || dateFilter !== "all" || search) && (
          <button onClick={() => { setCatFilter(""); setSubFilter(""); setStatusFilter("all"); setDateFilter("all"); setSearch(""); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors">
            <X size={11} /> ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* ── Category chips ── */}
      {catStats.length > 0 && (
        <div className="mb-3">
          {/* Category level */}
          <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-hide">
            <button
              onClick={() => { setCatFilter(""); setSubFilter(""); }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!catFilter ? "text-white border-transparent" : "border-gray-200 text-gray-500 bg-white hover:border-gray-300"}`}
              style={!catFilter ? { backgroundColor: "var(--primary)" } : {}}>
              ทุกหมวด
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${!catFilter ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                {base.length}
              </span>
            </button>
            {catStats.map(s => (
              <button key={s.cat}
                onClick={() => { setCatFilter(prev => prev === s.cat ? "" : s.cat); setSubFilter(""); }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${catFilter === s.cat ? "text-white border-transparent" : "border-gray-200 text-gray-600 bg-white hover:border-gray-300"}`}
                style={catFilter === s.cat ? { backgroundColor: "var(--primary)" } : {}}>
                {s.cat}
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${catFilter === s.cat ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                  {s.total}
                </span>
                <span className="flex gap-0.5 ml-0.5">
                  {s.pending > 0     && <span className="w-1.5 h-1.5 rounded-full bg-red-400    inline-block" />}
                  {s.in_progress > 0 && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />}
                  {s.done > 0        && <span className="w-1.5 h-1.5 rounded-full bg-green-400  inline-block" />}
                </span>
              </button>
            ))}
          </div>

          {/* Sub-category level (appears when category selected) */}
          {catFilter && subStats.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 mt-2 pl-4 scrollbar-hide">
              <div className="flex-shrink-0 flex items-center text-gray-300 mr-1">
                <ChevronRight size={12} />
              </div>
              <button
                onClick={() => setSubFilter("")}
                className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${!subFilter ? "text-white border-transparent" : "border-gray-200 text-gray-500 bg-white hover:border-gray-300"}`}
                style={!subFilter ? { backgroundColor: "var(--primary)", opacity: 0.85 } : {}}>
                ทั้งหมดใน {catFilter}
              </button>
              {subStats.map(s => (
                <button key={s.cat}
                  onClick={() => setSubFilter(prev => prev === s.cat ? "" : s.cat)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${subFilter === s.cat ? "text-white border-transparent" : "border-gray-200 text-gray-600 bg-white hover:border-gray-300"}`}
                  style={subFilter === s.cat ? { backgroundColor: "var(--primary)", opacity: 0.85 } : {}}>
                  {s.cat}
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${subFilter === s.cat ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                    {s.total}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Deep sub level (level 2) */}
          {subFilter && deepSubStats.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 mt-2 pl-9 scrollbar-hide">
              <div className="flex-shrink-0 flex items-center text-gray-300 mr-1">
                <ChevronRight size={12} />
              </div>
              {deepSubStats.map(s => (
                <span key={s.cat}
                  className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border border-gray-200 text-gray-500 bg-gray-50">
                  {s.cat}
                  <span className="bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full text-xs">{s.total}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active filter breadcrumb */}
      {(catFilter || subFilter) && (
        <div className="flex items-center gap-1.5 mb-4 text-xs text-gray-500">
          <button onClick={() => { setCatFilter(""); setSubFilter(""); }}
            className="flex items-center gap-1 hover:text-gray-700 transition-colors">
            <ChevronLeft size={12} /> ทุกหมวด
          </button>
          {catFilter && (
            <>
              <ChevronRight size={11} className="text-gray-300" />
              <button onClick={() => setSubFilter("")}
                className={`hover:underline transition-colors ${!subFilter ? "font-semibold" : "hover:text-gray-700"}`}
                style={!subFilter ? { color: "var(--primary)" } : {}}>
                {catFilter}
              </button>
            </>
          )}
          {subFilter && (
            <>
              <ChevronRight size={11} className="text-gray-300" />
              <span className="font-semibold" style={{ color: "var(--primary)" }}>{subFilter}</span>
            </>
          )}
          <span className="ml-1 text-gray-400">({filtered.length} รายการ)</span>
        </div>
      )}

      {/* ── Event list ── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">ไม่มีกำหนดการในช่วงที่เลือก</p>
          {(catFilter || subFilter) && (
            <button onClick={() => { setCatFilter(""); setSubFilter(""); }}
              className="mt-3 text-xs hover:underline" style={{ color: "var(--primary)" }}>
              ล้างตัวกรองหมวดงาน
            </button>
          )}
        </div>
      )}

      <div className="space-y-6">
        {grouped.map(([dateKey, evs]) => {
          const date  = new Date(dateKey + "T00:00:00");
          const today = isToday(date);
          const label = format(date, "EEEE d MMMM yyyy", { locale: th });
          return (
            <div key={dateKey}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${today ? "text-white" : "bg-gray-100 text-gray-500"}`}
                  style={today ? { backgroundColor: "var(--primary)" } : {}}>
                  {today ? "วันนี้" : label}
                </div>
                {!today && <span className="text-xs text-gray-400">{label.split(" ").slice(1).join(" ")}</span>}
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400">{evs.length} รายการ</span>
              </div>
              <div className="space-y-2 pl-2">
                {evs.map(ev => (
                  <EventCard key={ev.id} event={ev} onStatusChange={handleStatusChange} onView={setDetailEvent} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Detail side panel ── */}
      {detailEvent && (() => {
        const chain = [detailEvent.workCategory, ...detailEvent.subValues].filter(Boolean);
        const badge = STATUS_BADGE[detailEvent.status] ?? STATUS_BADGE.pending;
        return (
          <>
            <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setDetailEvent(null)} />
            <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: detailEvent.color }} />
                  <h2 className="font-bold text-gray-800 text-base truncate">{detailEvent.title}</h2>
                </div>
                <button onClick={() => setDetailEvent(null)} className="ml-2 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">สถานะ</p>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_DOT[detailEvent.status] }} />
                    {badge.label}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">วันและเวลา</p>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Clock size={15} className="text-gray-400 flex-shrink-0" />
                    <span>{format(new Date(detailEvent.startDate), "EEEE d MMMM yyyy", { locale: th })}</span>
                  </div>
                  {!detailEvent.allDay && (
                    <div className="flex items-center gap-2 text-sm text-gray-700 mt-1 ml-5">
                      <span>{format(new Date(detailEvent.startDate), "HH:mm")} — {format(new Date(detailEvent.endDate), "HH:mm")} น.</span>
                    </div>
                  )}
                </div>
                {detailEvent.location && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">สถานที่</p>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <MapPin size={15} className="text-gray-400 flex-shrink-0" />
                      <span>{detailEvent.location}</span>
                    </div>
                  </div>
                )}
                {chain.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">หมวดงาน</p>
                    <div className="flex items-center flex-wrap gap-1">
                      {chain.map((item, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <ChevronRight size={12} className="text-gray-300" />}
                          <span className={`text-xs px-2 py-1 rounded-md ${i === 0 ? "bg-blue-50 text-blue-700 font-medium" : "bg-gray-100 text-gray-600"}`}>{item}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {detailEvent.generalNotes && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">บันทึก</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 leading-relaxed">{detailEvent.generalNotes}</p>
                  </div>
                )}
                {detailEvent.customFields.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">ข้อมูลเพิ่มเติม</p>
                    <div className="space-y-2">
                      {detailEvent.customFields.map((cf, i) => cf.key && (
                        <div key={i} className="flex gap-2 text-sm">
                          <span className="text-gray-400 min-w-24 flex-shrink-0">{cf.key}</span>
                          <span className="text-gray-700 font-medium">{cf.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {detailEvent.user?.name && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">ผู้สร้าง</p>
                    <p className="text-sm text-gray-700">{detailEvent.user.name}</p>
                  </div>
                )}
                {detailFiles.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">ไฟล์แนบ</p>
                    <div className="space-y-2">
                      {detailFiles.map(f => (
                        <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                          {f.fileType === "image"
                            ? <img src={f.filePath} alt={f.fileName} className="w-10 h-10 rounded object-cover flex-shrink-0 border border-gray-200" />
                            : <div className="w-10 h-10 rounded flex-shrink-0 bg-blue-50 border border-blue-100 flex items-center justify-center"><FileText size={18} className="text-blue-400" /></div>
                          }
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-700 truncate">{f.fileName}</p>
                            <p className="text-xs text-gray-400">{f.section !== "general" ? f.section : f.fileType}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <a href={f.filePath} target="_blank" rel="noopener noreferrer"
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="เปิดไฟล์">
                              <Eye size={14} />
                            </a>
                            <a href={f.filePath} download={f.fileName}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="ดาวน์โหลด">
                              <Download size={14} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="px-5 py-4 border-t border-gray-200">
                <button onClick={() => setDetailEvent(null)}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 py-2 rounded-lg transition-colors">
                  ปิด
                </button>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
