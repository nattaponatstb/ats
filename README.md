# ⚔️ระบบตารางสอน โรงเรียนทหารขนส่ง (รร.ขส.ขส.ทบ.)
## Weekly Timetable & Academic Management System

[**English Version Below**]

---

## 🇹🇭 ภาษาไทย

เว็บแอปพลิเคชันระบบบริหารจัดการตารางสอนประจำสัปดาห์ของ **โรงเรียนทหารขนส่ง กรมการขนส่งทหารบก** พัฒนาขึ้นในรูปแบบ Single Page Application (SPA) เพื่อการทำงานร่วมกันแบบ Real-time ของเจ้าหน้าที่แผนกการศึกษา และเปิดช่องทางสาธารณะให้นักเรียนหรือบุคคลภายนอกเข้ามาตรวจสอบตารางเรียนได้สะดวกสบาย

### 🌟 คุณสมบัติเด่น (Features)
- 📋 **การจัดการหลักสูตรและตารางสอน:** เพิ่ม แก้ไข ลบ คัดลอกหลักสูตร และตารางสอนประจำสัปดาห์ได้อย่างรวดเร็ว
- ☁️ **ข้อมูลซิงค์แบบ Real-time:** ใช้ Firebase Realtime Database ทำให้ผู้ใช้อุปกรณ์อื่นๆ เห็นข้อมูลล่าสุดทันทีโดยไม่ต้องรีเฟรชหน้าจอ
- 🛡️ **ระบบจำกัดสิทธิ์ใช้งาน (Role-Based Access Control):**
  - `Super Admin` (ผบ.ระบบ): มีสิทธิ์แก้ไขตาราง ตั้งค่าระบบ จัดการแอดมินคนอื่น ซิงค์ข้อมูลข้ามระบบ และดึงข้อมูล Backup
  - `Admin` (เจ้าหน้าที่): จัดการแก้ไขตารางสอนหลักสูตรตนเองได้ แต่ไม่สามารถจัดการระบบหลักหรือแอดมินอื่นได้
  - `Public Mode` (ผู้เข้าชม): ดูตารางเรียนเฉพาะหลักสูตรที่เปิดสาธารณะได้ พิมพ์ตารางสอนหรือเซฟ PDF ได้ แต่ไม่มีสิทธิ์แก้ไขข้อมูล
- 🖨️ **จัดทำและพิมพ์ตารางสอน A4 Landscape:** จัดรูปแบบตารางสอนสวยงามตามมาตรฐานกองทัพบก ใช้ฟอนต์ Sarabun สวยงามเท่ากันทุกอุปกรณ์
- 📊 **สรุปสถิติชั่วโมงการสอน:** รายงานผลสรุปชั่วโมงเรียนสะสมและคงเหลือจำแนกตามรายวิชา/รายครูผู้สอน พร้อมส่งออก (Export) เป็นไฟล์ Excel (.xlsx)

### 🏗️ สถาปัตยกรรมระบบ (System Architecture)
1. **Frontend (Browser Client):** ใช้ `timetable_military.html` (และ `index.html` สำหรับหน้า Redirect) พัฒนาด้วย Vanilla HTML/JS/CSS ทำงานแบบ Standalone และเรียกใช้ Local Storage แคชข้อมูลในตัว
2. **Database Cloud (Firebase RTDB):** สำหรับเก็บข้อมูลประสานงานแบบ real-time มีระบบ Auto-Sync และ Real-time Stream (SSE)
3. **Backup Fallback Storage (GitHub Pages):** ทำหน้าที่เป็น Hosting ของแอปพลิเคชัน และเก็บไฟล์สำรองข้อมูล `data.json` ที่บันทึกผ่าน API ของ GitHub เพื่อสำรองข้อมูลโดยอัตโนมัติ

---

## 🇺🇸 English

A lightweight and responsive Single Page Application (SPA) for managing the weekly military training timetable at the **Military Transportation School (Army Transportation Department)**. Designed for administrators to coordinate academic schedules in real-time, while offering a public viewer mode for students.

### 🌟 Key Features
- 📋 **Course & Schedule Management:** Easily create, edit, delete, and duplicate courses and weekly schedule slots.
- ☁️ **Real-time Synchronisation:** Utilises Firebase Realtime Database. Any edits appear instantly on all logged-in devices without page reloads.
- 🛡️ **Role-Based Access Control (RBAC):**
  - `Super Admin`: Full privileges (edit schedule, manage users, modify system master lists, and backup data to GitHub).
  - `Admin`: Can modify schedules, courses, and settings, but cannot access admin management or trigger GitHub deployment settings.
  - `Public Viewer`: Ready-only access to published courses. No login required. Can print tables or save to PDF.
- 🖨️ **Print A4 Landscape Timetable:** Beautiful layout tailored to military standards. Renders perfectly on any screen or paper using Google Fonts' Sarabun.
- 📊 **Hour & Teacher Statistics:** Summary of accumulated and remaining hours per subject and instructor, with client-side Export to Excel (.xlsx).

### 🏗️ System Architecture
1. **Frontend Client:** `timetable_military.html` (with redirect via `index.html`) using Vanilla HTML5, CSS3, and JavaScript. Cache logic handled via `localStorage` for instant performance.
2. **Cloud Synchronization:** Firebase Realtime Database REST API and Server-Sent Events (SSE) stream updates instantly.
3. **Redundant Storage & Hosting:** Deployed on GitHub Pages. Updates trigger a push request to store a master backup in `data.json` in the repository as a database fallback.

---

## 📂 โครงสร้างโฟลเดอร์ในโปรเจกต์ (Folder Structure)

```files
├── index.html                   # ไฟล์หน้าแรก (Redirect to timetable_military.html)
├── timetable_military.html       # ระบบตารางสอน รร.ขส.ขส.ทบ. (แอปพลิเคชันหลัก / Main App)
├── teaching-distribution.html    # ระบบกระจายภาระงานสอนรายวิชา/อาจารย์ (Teaching Load App)
├── timetable.html               # ระบบตารางสอนย่อย (ลากวางได้ / Draggable Grid Scheduler)
├── data.json                    # ข้อมูลสำรองของระบบตารางสอนกลาง (GitHub Sync Backup file)
│
├── docs/                        # คู่มือการใช้งาน (Manuals & Documents)
│   ├── timetable_system_manual.docx          # คู่มือการเขียนระบบและคำสั่งใช้งานแบบสมบูรณ์
│   └── ระบบตารางสอน_คู่มือแนะนำโปรแกรม.docx    # คู่มือแบบย่อและแนะนำสิทธิ์ผู้ใช้งาน
│
├── tools/                       # สคริปต์เสริมในการพัฒนาระบบ (Utility Scripts)
│   ├── create_doc.py            # สคริปต์ Python ในการสร้างไฟล์คู่มือ Word (.docx)
│   └── push_users.ps1           # สคริปต์ PowerShell สำหรับ seeding บัญชีผู้ใช้เริ่มต้น
│
├── fonts/                       # ฟอนต์ที่จำเป็นในการประมวลผลเอกสาร
│   ├── THSarabunIT9.ttf         # ฟอนต์มาตรฐานสารบรรณ ๙
│   └── THSarabunIT9-Bold.ttf    # ฟอนต์สารบรรณ ๙ ตัวหนา
│
├── timetable-api/               # ส่วนเสริม: Backend API Server (Node.js & Express / PostgreSQL)
│   ├── server.js                # ตัวรันเซิร์ฟเวอร์ Express
│   ├── SETUP.md                 # คู่มือการติดตั้งเซิร์ฟเวอร์
│   ├── config/                  # ส่วนจัดการฐานข้อมูล
│   ├── routes/                  # API Endpoints (auth, courses, entries, settings)
│   └── sql/                     # สคริปต์ Schema ของ SQL Server / PostgreSQL
│
└── work-calendar/               # ส่วนเสริม: Next.js & Prisma Project (ตารางปฏิทินงาน)
```

---

## 🛠️ วิธีการติดตั้งและการเข้าใช้งาน (Getting Started)

### 1. วิธีเข้าใช้งานแบบทั่วไป (Offline & Cloud mode)
คุณไม่จำเป็นต้องรันเซิร์ฟเวอร์เพื่อใช้งานระบบตารางสอนกลาง เพียงแค่เปิดไฟล์ `index.html` หรือ `timetable_military.html` บนบราวเซอร์ของคุณ:
1. ดับเบิ้ลคลิกไฟล์ `index.html` หรือเปิดผ่าน **GitHub Pages URL** ที่ท่านติดตั้งไว้
2. เข้าสู่ระบบด้วยบัญชีผู้ใช้ หรือกดปุ่ม **"ดูตารางสอน"** เพื่อเข้าชมโหมดสาธารณะ
3. ข้อมูลจำลองและประวัติจะบันทึกอยู่ใน Browser Cache (`localStorage`) ของคุณ และเชื่อมโยงไปที่ Firebase RTDB (หากทำการกำหนดค่าไว้)

### 2. วิธีใช้งานและติดตั้ง Backend API (สำหรับ Local Database)
หากต้องการใช้ Express API ร่วมกับฐานข้อมูล SQL Server หรือ PostgreSQL:
1. เข้าไปยังโฟลเดอร์ API: `cd timetable-api`
2. ศึกษาขั้นตอนการติดตั้งใน [timetable-api/SETUP.md](file:///e:/Project%20webtable/timetable-api/SETUP.md)
3. กำหนดค่าการเชื่อมต่อฐานข้อมูลใน `.env`
4. ติดตั้งโมดูลและเริ่มทำงาน:
   ```bash
   npm install
   npm start
   ```

### 3. การสร้างไฟล์คู่มือ Word อัตโนมัติ (Python Script)
มีสคริปต์ช่วยอัปเดตไฟล์คู่มือการใช้งาน `.docx` อัตโนมัติเมื่อเกิดการเปลี่ยนสเปกเครื่อง:
1. ติดตั้ง Library ที่จำเป็น:
   ```bash
   pip install python-docx
   ```
2. รันสคริปต์ในโฟลเดอร์โปรเจกต์:
   ```bash
   python tools/create_doc.py
   ```
   *สคริปต์จะบันทึกไฟล์คู่มือใหม่ไปยังโฟลเดอร์ `docs/` โดยอัตโนมัติ*