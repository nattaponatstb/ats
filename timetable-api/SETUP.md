# ขั้นตอนติดตั้ง Timetable Military API

## สิ่งที่ต้องมีก่อน
- Node.js 18+ (https://nodejs.org)
- SQL Server Express (ติดตั้งแล้ว)
- SQL Server Management Studio (SSMS) หรือ sqlcmd

---

## ขั้นที่ 1 — สร้างฐานข้อมูล
เปิด SSMS แล้วรัน:
```
E:\Demo\timetable-api\sql\schema.sql
```

---

## ขั้นที่ 2 — ตั้งค่า .env
แก้ไขไฟล์ `E:\Demo\timetable-api\.env`:
```
DB_SERVER=localhost\SQLEXPRESS   ← ชื่อ instance ของคุณ
DB_USER=sa
DB_PASSWORD=รหัสผ่าน sa ของคุณ
JWT_SECRET=ตั้งค่าสุ่มยาวๆ ที่นี่
```

---

## ขั้นที่ 3 — ติดตั้ง package
```cmd
cd E:\Demo\timetable-api
npm install
```

---

## ขั้นที่ 4 — รัน Server
```cmd
npm start
```
หรือรัน dev mode (reload อัตโนมัติ):
```cmd
npm run dev
```

---

## ขั้นที่ 5 — เปิดโปรแกรม
เปิด browser ไปที่:
```
http://localhost:3000/timetable_military.html
```

---

## API Endpoints

| Method | URL | คำอธิบาย |
|--------|-----|----------|
| POST | /api/auth/login | เข้าสู่ระบบ |
| GET | /api/auth/me | ตรวจสอบ token |
| GET | /api/courses | ดึงหลักสูตรทั้งหมด |
| POST | /api/courses | สร้างหลักสูตร |
| PUT | /api/courses/:id | แก้ไขหลักสูตร |
| DELETE | /api/courses/:id | ลบหลักสูตร |
| GET | /api/entries?course_id= | ดึงรายการสอน |
| POST | /api/entries | เพิ่มรายการสอน |
| PUT | /api/entries/:id | แก้ไขรายการสอน |
| DELETE | /api/entries/:id | ลบรายการสอน |
| GET | /api/settings | ดึงค่าระบบ |
| PUT | /api/settings | บันทึกค่าระบบ |

---

## บัญชีเริ่มต้น
- username: `admin`
- password: `admin1234`

**เปลี่ยนรหัสผ่านหลังติดตั้งทันที!**
