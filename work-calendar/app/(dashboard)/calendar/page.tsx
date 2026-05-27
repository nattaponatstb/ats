"use client";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import multiMonthPlugin from "@fullcalendar/multimonth";
import { Plus, X, Pencil, MapPin, Clock, Eye, ChevronRight, Download, FileText } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { isThaiHoliday, getHolidayName } from "@/lib/thaiHolidays";
import EventFormModal, { EVENT_STATUSES } from "@/components/EventFormModal";

interface EventFile {
  id: string;
  eventId: string;
  section: string;
  fileType: string;
  fileName: string;
  filePath: string;
  createdAt: string;
}

interface CalEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  color: string;
  location?: string;
  metadata?: string;
  user?: { name: string };
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [initDate, setInitDate] = useState<string>("");
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState<CalEvent | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailEvent, setDetailEvent] = useState<CalEvent | null>(null);
  const [detailFiles, setDetailFiles] = useState<EventFile[]>([]);

  useEffect(() => { fetchEvents(); }, []);

  useEffect(() => {
    if (!detailEvent) { setDetailFiles([]); return; }
    fetch(`/api/event-files?eventId=${detailEvent.id}`)
      .then(r => r.ok ? r.json() : [])
      .then(setDetailFiles)
      .catch(() => setDetailFiles([]));
  }, [detailEvent?.id]);

  async function fetchEvents() {
    const res = await fetch("/api/events");
    if (res.ok) setEvents(await res.json());
  }

  function openCreate(dateStr?: string) {
    setInitDate(dateStr ?? new Date().toISOString().split("T")[0]);
    setSelected(null);
    setShowPopover(false);
    setShowForm(true);
  }

  function openPopover(event: CalEvent, jsEvent: MouseEvent) {
    const x = Math.min(jsEvent.clientX, window.innerWidth - 280);
    const y = Math.min(jsEvent.clientY + 8, window.innerHeight - 220);
    setPopoverPos({ x, y });
    setSelected(event);
    setShowPopover(true);
  }

  function openEdit(event: CalEvent) {
    setSelected(event);
    setShowPopover(false);
    setShowDetail(false);
    setShowForm(true);
  }

  function openDetail(event: CalEvent) {
    setDetailEvent(event);
    setShowPopover(false);
    setShowDetail(true);
  }

  async function handleSave(formData: any, id?: string) {
    const startDate = `${formData.date}T${formData.startTime}:00`;
    const endDate = `${formData.date}T${formData.endTime}:00`;
    const metadata = JSON.stringify({
      status:       formData.status       ?? "pending",
      workCategory: formData.workCategory,
      subValues:    formData.subValues    ?? [],
      generalNotes: formData.generalNotes ?? "",
      customFields: formData.customFields ?? [],
    });

    const body = {
      title: formData.title,
      description: "",
      startDate,
      endDate,
      allDay: false,
      color: formData.color,
      location: "",
      metadata,
    };

    if (id) {
      await fetch(`/api/events/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setShowForm(false);
    fetchEvents();
  }

  async function handleDelete(targetEvent?: CalEvent) {
    const ev = targetEvent ?? selected;
    if (!ev) return;
    if (!confirm(`ลบ "${ev.title}" ใช่ไหม?`)) return;
    await fetch(`/api/events/${ev.id}`, { method: "DELETE" });
    setShowForm(false);
    setShowPopover(false);
    setShowDetail(false);
    fetchEvents();
  }

  async function quickUpdateStatus(eventId: string, newStatus: string) {
    const ev = events.find(e => e.id === eventId);
    if (!ev) return;
    const meta = ev.metadata ? JSON.parse(ev.metadata) : {};
    meta.status = newStatus;
    const newMeta = JSON.stringify(meta);
    await fetch(`/api/events/${eventId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: ev.title, description: "",
        startDate: ev.startDate, endDate: ev.endDate,
        allDay: ev.allDay, color: ev.color, location: ev.location ?? "",
        metadata: newMeta,
      }),
    });
    // Optimistic update so popover / detail panel reflect change immediately
    setSelected(prev => prev?.id === eventId ? { ...prev, metadata: newMeta } : prev);
    setDetailEvent(prev => prev?.id === eventId ? { ...prev, metadata: newMeta } : prev);
    fetchEvents();
  }

  function getInitialForm() {
    if (!selected) {
      return { date: initDate, startTime: "09:00", endTime: "10:00" };
    }
    const meta = (() => { try { return selected.metadata ? JSON.parse(selected.metadata) : {}; } catch { return {}; } })();
    return {
      id: selected.id,
      title: selected.title,
      date: selected.startDate.split("T")[0],
      startTime: selected.startDate.split("T")[1]?.slice(0, 5) ?? "09:00",
      endTime:   selected.endDate.split("T")[1]?.slice(0, 5)   ?? "10:00",
      color: selected.color,
      status:       meta.status       ?? "pending",
      workCategory: meta.workCategory ?? "",
      subValues:    meta.subValues    ?? [],
      generalNotes: meta.generalNotes ?? "",
      customFields: meta.customFields ?? [],
    };
  }

  const fcEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.startDate,
    end: e.endDate,
    allDay: e.allDay,
    backgroundColor: e.color,
    borderColor: e.color,
    extendedProps: e,
  }));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ปฏิทิน</h1>
          <p className="text-sm text-gray-400 mt-0.5">จัดการและติดตามกำหนดการ</p>
        </div>
        <button onClick={() => openCreate()}
          className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md"
          style={{ backgroundColor: "var(--primary)" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "var(--primary-dark)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "var(--primary)"}>
          <Plus size={16} /> เพิ่มกำหนดการ
        </button>
      </div>

      <div className="bg-white rounded-2xl p-5" style={{ boxShadow: "var(--card-shadow-md)", border: "1px solid #f1f5f9" }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, multiMonthPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: "prev,next today", center: "title", right: "multiMonthYear,dayGridMonth,timeGridWeek,timeGridDay" }}
          locale="th"
          firstDay={1}
          events={fcEvents}
          dateClick={(info) => openCreate(info.dateStr)}
          eventClick={(info) => openPopover(info.event.extendedProps as CalEvent, info.jsEvent)}
          eventContent={(info) => {
            const cal = info.event.extendedProps as CalEvent;
            const meta = (() => { try { return cal.metadata ? JSON.parse(cal.metadata) : {}; } catch { return {}; } })();
            const status = meta.status ?? "pending";
            const dotColor = EVENT_STATUSES.find(s => s.value === status)?.dot ?? "#f87171";
            const isTimeGrid = info.view.type.startsWith("timeGrid");
            return (
              <div style={{ display: "flex", flexDirection: "column", padding: "0 3px", overflow: "hidden", width: "100%", height: "100%" }}>
                {isTimeGrid && info.timeText && (
                  <span style={{ fontSize: "10px", opacity: 0.85, lineHeight: 1.2, marginBottom: 1 }}>{info.timeText}</span>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: dotColor, flexShrink: 0, border: "1.5px solid rgba(255,255,255,0.6)" }} />
                  <span style={{ fontSize: "12px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {info.event.title}
                  </span>
                </div>
              </div>
            );
          }}
          height="auto"
          buttonText={{ today: "วันนี้", year: "ปี", month: "เดือน", week: "สัปดาห์", day: "วัน" }}
          multiMonthMaxColumns={3}
          dayCellClassNames={(arg) => {
            const day = arg.date.getDay();
            if (isThaiHoliday(arg.date)) return ["fc-thai-holiday"];
            if (day === 0 || day === 6) return ["fc-weekend-day"];
            return [];
          }}
          dayCellContent={(arg) => {
            const holidayName = getHolidayName(arg.date);
            return (
              <div className="fc-daygrid-day-number" title={holidayName ?? ""}>
                {arg.dayNumberText}
              </div>
            );
          }}
          views={{ multiMonthYear: { showNonCurrentDates: true, fixedWeekCount: true } }}
        />
      </div>

      {/* Event popover */}
      {showPopover && selected && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPopover(false)} />
          <div className="fixed z-50 bg-white rounded-xl shadow-xl border border-gray-200 w-72"
            style={{ left: popoverPos.x, top: popoverPos.y }}>
            <div className="flex items-start justify-between p-4 pb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selected.color }} />
                <h3 className="font-semibold text-gray-800 truncate">{selected.title}</h3>
              </div>
              <button onClick={() => setShowPopover(false)} className="p-1 text-gray-400 hover:text-gray-600 ml-2">
                <X size={16} />
              </button>
            </div>
            <div className="px-4 pb-3 space-y-1.5 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-gray-400 flex-shrink-0" />
                <span>
                  {format(new Date(selected.startDate), "d MMM yyyy HH:mm", { locale: th })}
                  {" — "}
                  {format(new Date(selected.endDate), "HH:mm", { locale: th })}
                </span>
              </div>
              {selected.location && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                  <span>{selected.location}</span>
                </div>
              )}
              {selected.metadata && (() => {
                const m = JSON.parse(selected.metadata);
                const chain = [m.workCategory, ...(m.subValues ?? [])].filter(Boolean);
                if (chain.length === 0) return null;
                return (
                  <>
                    <p className="text-xs text-gray-400">{chain.join(" › ")}</p>
                    {m.generalNotes && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{m.generalNotes}</p>
                    )}
                  </>
                );
              })()}
            </div>
            {/* Quick status change */}
            <div className="px-4 py-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1.5">สถานะ</p>
              <div className="flex gap-1.5">
                {EVENT_STATUSES.map(s => {
                  const curMeta = selected.metadata ? JSON.parse(selected.metadata) : {};
                  const current = curMeta.status ?? "pending";
                  return (
                    <button key={s.value}
                      onClick={() => quickUpdateStatus(selected.id, s.value)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-all ${
                        current === s.value
                          ? `${s.activeBorder} ${s.activeBg} ${s.activeText}`
                          : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                      }`}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.dot }} />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5 px-4 py-2 border-t border-gray-100">
              <button onClick={() => openDetail(selected)}
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors">
                <Eye size={13} /> ดู
              </button>
              <button onClick={() => openEdit(selected)}
                className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                <Pencil size={13} /> แก้ไข
              </button>
            </div>
          </div>
        </>
      )}

      {/* Form modal */}
      {showForm && (
        <EventFormModal
          initial={getInitialForm()}
          onSave={handleSave}
          onDelete={selected ? () => handleDelete() : undefined}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Detail side panel */}
      {showDetail && detailEvent && (() => {
        const meta = (() => { try { return detailEvent.metadata ? JSON.parse(detailEvent.metadata) : {}; } catch { return {}; } })();
        const status = meta.status ?? "pending";
        const chain = [meta.workCategory, ...(meta.subValues ?? [])].filter(Boolean);
        return (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowDetail(false)} />
            {/* Panel */}
            <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: detailEvent.color }} />
                  <h2 className="font-bold text-gray-800 text-base truncate">{detailEvent.title}</h2>
                </div>
                <button onClick={() => setShowDetail(false)} className="ml-2 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

                {/* Status */}
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">สถานะ</p>
                  <div className="flex gap-2 flex-wrap">
                    {EVENT_STATUSES.map(s => (
                      <button key={s.value}
                        onClick={() => quickUpdateStatus(detailEvent.id, s.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          status === s.value
                            ? `${s.activeBorder} ${s.activeBg} ${s.activeText}`
                            : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                        }`}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.dot }} />
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date & Time */}
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">วันและเวลา</p>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Clock size={15} className="text-gray-400 flex-shrink-0" />
                    <span>
                      {format(new Date(detailEvent.startDate), "EEEE d MMMM yyyy", { locale: th })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700 mt-1 ml-5">
                    <span>
                      {format(new Date(detailEvent.startDate), "HH:mm", { locale: th })}
                      {" — "}
                      {format(new Date(detailEvent.endDate), "HH:mm", { locale: th })}
                      {" น."}
                    </span>
                  </div>
                </div>

                {/* Location */}
                {detailEvent.location && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">สถานที่</p>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <MapPin size={15} className="text-gray-400 flex-shrink-0" />
                      <span>{detailEvent.location}</span>
                    </div>
                  </div>
                )}

                {/* Category chain */}
                {chain.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">หมวดงาน</p>
                    <div className="flex items-center flex-wrap gap-1">
                      {chain.map((item, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <ChevronRight size={12} className="text-gray-300" />}
                          <span className={`text-xs px-2 py-1 rounded-md ${
                            i === 0 ? "bg-blue-50 text-blue-700 font-medium" : "bg-gray-100 text-gray-600"
                          }`}>{item}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* General notes */}
                {meta.generalNotes && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">บันทึก</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 leading-relaxed">{meta.generalNotes}</p>
                  </div>
                )}

                {/* Custom fields */}
                {meta.customFields && meta.customFields.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">ข้อมูลเพิ่มเติม</p>
                    <div className="space-y-2">
                      {meta.customFields.map((cf: { label: string; value: string }, i: number) => (
                        <div key={i} className="flex gap-2 text-sm">
                          <span className="text-gray-400 min-w-24 flex-shrink-0">{cf.label}</span>
                          <span className="text-gray-700 font-medium">{cf.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Creator */}
                {detailEvent.user?.name && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">ผู้สร้าง</p>
                    <p className="text-sm text-gray-700">{detailEvent.user.name}</p>
                  </div>
                )}

                {/* File attachments */}
                {detailFiles.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">ไฟล์แนบ</p>
                    <div className="space-y-2">
                      {detailFiles.map(f => (
                        <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
                          {f.fileType === "image" ? (
                            <img src={f.filePath} alt={f.fileName}
                              className="w-10 h-10 rounded object-cover flex-shrink-0 border border-gray-200" />
                          ) : (
                            <div className="w-10 h-10 rounded flex-shrink-0 bg-blue-50 border border-blue-100 flex items-center justify-center">
                              <FileText size={18} className="text-blue-400" />
                            </div>
                          )}
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

              {/* Footer actions */}
              <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end">
                <button
                  onClick={() => openEdit(detailEvent)}
                  className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                  <Pencil size={15} /> แก้ไข
                </button>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
