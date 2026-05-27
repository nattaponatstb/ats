"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Mail, Lock, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    else router.push("/calendar");
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#0f172a" }}>

      {/* ── Left panel (branding) ── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "#3B82F6" }}>
            <CalendarDays size={18} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg">Work Calendar</span>
        </div>

        <div>
          <h2 className="text-4xl font-bold text-white leading-snug mb-4">
            จัดการกำหนดการ<br />ได้ทุกที่ ทุกเวลา
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            ระบบปฏิทินและการจัดการกำหนดการสำหรับองค์กร<br />
            ครบครัน ใช้งานง่าย อัปเดตได้แบบ Real-time
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {["#3B82F6","#10B981","#F59E0B","#8B5CF6"].map((c,i) => (
              <div key={i} className="w-7 h-7 rounded-full border-2 border-slate-900 flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: c }}>
                {String.fromCharCode(65+i)}
              </div>
            ))}
          </div>
          <p className="text-slate-400 text-xs">ทีมงานใช้งานแล้ว</p>
        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex-1 flex items-center justify-center p-6"
        style={{ backgroundColor: "#f8fafc" }}>
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 justify-center mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#3B82F6" }}>
              <CalendarDays size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-800 text-lg">Work Calendar</span>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold text-gray-900">เข้าสู่ระบบ</h1>
            <p className="text-gray-500 text-sm mt-1">กรอกข้อมูลเพื่อเข้าใช้งาน</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                อีเมล
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="example@email.com"
                  className="w-full border border-gray-200 bg-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                รหัสผ่าน
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full border border-gray-200 bg-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 px-3 py-2.5 rounded-xl">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-xl text-sm transition-all disabled:opacity-60 mt-2"
              style={{ backgroundColor: "#3B82F6" }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = "#2563EB"; }}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#3B82F6"}
            >
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> กำลังเข้าสู่ระบบ...</>
                : <><LogIn size={15} /> เข้าสู่ระบบ</>
              }
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            ยังไม่มีบัญชี?{" "}
            <Link href="/register" className="font-semibold hover:underline"
              style={{ color: "#3B82F6" }}>
              สมัครสมาชิก
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
