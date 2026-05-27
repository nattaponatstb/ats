"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Users, CalendarDays, CheckSquare, FileText } from "lucide-react";

interface Report {
  totals: { tasks: number; events: number; documents: number; users: number };
  tasksByStatus: { status: string; _count: number }[];
  tasksByPriority: { priority: string; _count: number }[];
  recentTasks: { id: string; title: string; status: string; dueDate?: string; assignee?: { name: string } }[];
}

const STATUS_COLORS: Record<string, string> = {
  todo: "#9CA3AF", in_progress: "#3B82F6", done: "#10B981",
};
const STATUS_LABELS: Record<string, string> = {
  todo: "รอดำเนินการ", in_progress: "กำลังดำเนินการ", done: "เสร็จแล้ว",
};
const PRIORITY_COLORS: Record<string, string> = {
  low: "#9CA3AF", medium: "#F59E0B", high: "#EF4444",
};
const PRIORITY_LABELS: Record<string, string> = {
  low: "ต่ำ", medium: "ปานกลาง", high: "สูง",
};

export default function ReportsPage() {
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    fetch("/api/reports").then((r) => r.json()).then(setReport);
  }, []);

  if (!report) return <div className="p-6 text-gray-400">กำลังโหลด...</div>;

  const totalTasks = report.totals.tasks || 1;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">รายงานสรุป</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "งานทั้งหมด", value: report.totals.tasks, icon: CheckSquare, color: "text-blue-600 bg-blue-50" },
          { label: "กำหนดการ", value: report.totals.events, icon: CalendarDays, color: "text-green-600 bg-green-50" },
          { label: "เอกสาร", value: report.totals.documents, icon: FileText, color: "text-purple-600 bg-purple-50" },
          { label: "สมาชิก", value: report.totals.users, icon: Users, color: "text-orange-600 bg-orange-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
              <Icon size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-4">งานตามสถานะ</h2>
          <div className="space-y-3">
            {report.tasksByStatus.map(({ status, _count }) => (
              <div key={status}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{STATUS_LABELS[status] ?? status}</span>
                  <span className="font-medium text-gray-800">{_count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(_count / totalTasks) * 100}%`, backgroundColor: STATUS_COLORS[status] ?? "#9CA3AF" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-4">งานตามความสำคัญ</h2>
          <div className="space-y-3">
            {report.tasksByPriority.map(({ priority, _count }) => (
              <div key={priority}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{PRIORITY_LABELS[priority] ?? priority}</span>
                  <span className="font-medium text-gray-800">{_count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(_count / totalTasks) * 100}%`, backgroundColor: PRIORITY_COLORS[priority] ?? "#9CA3AF" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-700 mb-4">งานล่าสุด</h2>
        <div className="space-y-2">
          {report.recentTasks.length === 0 && <p className="text-gray-400 text-sm">ยังไม่มีงาน</p>}
          {report.recentTasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-800">{task.title}</p>
                {task.assignee && <p className="text-xs text-gray-400">{task.assignee.name}</p>}
              </div>
              <div className="text-right">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: STATUS_COLORS[task.status] + "20", color: STATUS_COLORS[task.status] }}>
                  {STATUS_LABELS[task.status]}
                </span>
                {task.dueDate && <p className="text-xs text-gray-400 mt-1">{format(new Date(task.dueDate), "d MMM yyyy", { locale: th })}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
