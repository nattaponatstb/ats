"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  CalendarDays, CheckSquare, FileText, BarChart2,
  LogOut, Settings, LayoutDashboard,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "แดชบอร์ด" },
  { href: "/calendar",  icon: CalendarDays,    label: "ปฏิทิน" },
  { href: "/tasks",     icon: CheckSquare,     label: "งาน" },
  { href: "/documents", icon: FileText,        label: "เอกสาร" },
  { href: "/reports",   icon: BarChart2,       label: "รายงาน" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "admin";

  return (
    <aside className="w-60 flex flex-col h-screen sticky top-0 select-none"
      style={{ backgroundColor: "#0f172a" }}>

      {/* ── Logo ── */}
      <div className="px-5 py-5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "var(--primary)" }}>
          <CalendarDays size={16} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-white text-sm leading-tight">Work Calendar</p>
          <p className="text-xs" style={{ color: "#64748b" }}>ระบบจัดการกำหนดการ</p>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mx-4 mb-3" style={{ height: "1px", backgroundColor: "#1e293b" }} />

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative"
              style={active
                ? { backgroundColor: "rgba(255,255,255,0.08)", color: "#ffffff" }
                : { color: "#94a3b8" }
              }
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color = "#e2e8f0"; }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.backgroundColor = ""; (e.currentTarget as HTMLElement).style.color = "#94a3b8"; } }}
            >
              {/* Active indicator */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                  style={{ backgroundColor: "var(--primary)" }} />
              )}
              <Icon size={17} style={active ? { color: "var(--primary)" } : {}} />
              {label}
            </Link>
          );
        })}

        {isAdmin && (
          <Link href="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative"
            style={pathname.startsWith("/admin")
              ? { backgroundColor: "rgba(255,255,255,0.08)", color: "#ffffff" }
              : { color: "#94a3b8" }
            }
            onMouseEnter={e => { if (!pathname.startsWith("/admin")) { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color = "#e2e8f0"; } }}
            onMouseLeave={e => { if (!pathname.startsWith("/admin")) { (e.currentTarget as HTMLElement).style.backgroundColor = ""; (e.currentTarget as HTMLElement).style.color = "#94a3b8"; } }}
          >
            {pathname.startsWith("/admin") && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                style={{ backgroundColor: "var(--primary)" }} />
            )}
            <Settings size={17} style={pathname.startsWith("/admin") ? { color: "var(--primary)" } : {}} />
            ตั้งค่าระบบ
          </Link>
        )}
      </nav>

      {/* ── Divider ── */}
      <div className="mx-4 mt-2" style={{ height: "1px", backgroundColor: "#1e293b" }} />

      {/* ── User section ── */}
      <div className="p-3">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1"
          style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
          {/* Avatar */}
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
            style={{ backgroundColor: "var(--primary)" }}>
            {session?.user.name?.charAt(0)?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate leading-tight">
              {session?.user.name ?? "ผู้ใช้งาน"}
            </p>
            <p className="text-xs truncate" style={{ color: "#64748b" }}>
              {session?.user.email ?? ""}
            </p>
          </div>
          {isAdmin && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0"
              style={{ backgroundColor: "var(--primary)", color: "#fff", fontSize: "10px" }}>
              Admin
            </span>
          )}
        </div>

        <button onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-lg transition-all duration-150"
          style={{ color: "#94a3b8" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(239,68,68,0.12)"; (e.currentTarget as HTMLElement).style.color = "#fca5a5"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = ""; (e.currentTarget as HTMLElement).style.color = "#94a3b8"; }}
        >
          <LogOut size={15} />
          <span className="text-xs font-medium">ออกจากระบบ</span>
        </button>
      </div>
    </aside>
  );
}
