# คู่มือการตั้งค่าความปลอดภัยสำหรับระบบตารางสอน (Weekly Timetable Security Guide)

เอกสารฉบับนี้รวบรวมแนวทางการตั้งค่าความปลอดภัยของระบบจัดการตารางสอนประจำสัปดาห์ เพื่อป้องกันจุดอ่อนในระบบฐานข้อมูล Firebase และระบบ API หลังบ้าน

---

## 1. การตั้งค่าสิทธิ์ฐานข้อมูล Firebase (Firebase Security Rules)
เพื่อที่จะไม่ต้องจัดเก็บคีย์ความลับ **Firebase Database Secret** ไว้บนเครื่องคอมพิวเตอร์ของบุคคลทั่วไป (Public Viewer) ให้เข้าไปตั้งค่ากฎความปลอดภัยบน Firebase Console ดังนี้:

1. เปิดหน้าคลาวด์ [Firebase Console](https://console.firebase.google.com/)
2. เลือกโปรเจกต์ตารางเรียนของคุณ ➡️ ไปที่เมนู **Realtime Database**
3. คลิกแท็บ **Rules** (กฎ)
4. ปรับเปลี่ยนกฎให้อนุญาตให้ดึงข้อมูลตารางเรียนได้โดยไม่ต้องใช้รหัสผ่าน (Public Read) แต่การเขียนแก้ไขต้องมีสิทธิ์ล็อกอิน (Authorized Write) ดังนี้:

```json
{
  "rules": {
    "data": {
      "settings": {
        ".read": true,
        ".write": "auth != null"
      },
      "courses": {
        ".read": true,
        ".write": "auth != null"
      },
      "entries": {
        ".read": true,
        ".write": "auth != null"
      },
      "users": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```
*หลังจากกรอกเสร็จแล้วให้กดปุ่ม **Publish** (เผยแพร่)*

---

## 2. การเก็บข้อมูลความลับของระบบหลังบ้าน (Environment Variables)
ย้ายการตั้งค่าข้อมูลลับ (เช่น GitHub Access Token หรือ Firebase Secret) จากหน้าบราวเซอร์ไปบันทึกไว้ในระบบหลังบ้าน (API Server Node.js) โดยสร้างและจัดเก็บไว้ในไฟล์ `.env` ที่โฟลเดอร์ `timetable-api/` ดังนี้:

```env
PORT=3000
DATABASE_URL=postgresql://username:password@localhost:5432/dbname
JWT_SECRET=your_jwt_secret_key_here
GITHUB_PAT=your_github_personal_access_token_here
FIREBASE_DB_URL=https://your-app-default-rtdb.firebaseio.com
FIREBASE_SECRET=your_firebase_database_secret_here
```
*หมายเหตุ: ไฟล์ `.env` นี้จะไม่ถูกส่งขึ้นระบบ Git/GitHub (ถูกใส่ไว้ใน `.gitignore` เรียบร้อยแล้ว) ทำให้ข้อมูลรหัสผ่านเหล่านี้ปลอดภัย 100%*

---

## 3. ความปลอดภัยฝั่งเว็บเบราว์เซอร์ (Client-Side XSS Protection)
เราได้ดำเนินการอัปเดตสคริปต์การแสดงผลตัวอักษรบนหน้าบราวเซอร์เพื่อความปลอดภัยเรียบร้อยแล้ว:

*   **อัปเดตฟังก์ชัน `esc(s)` ใน `timetable_military.html`**:
    เพื่อล้างอักขระ Single Quote (`'`) และ Forward Slash (`/`) ป้องกันการแฝงคำสั่งเจาะระบบ (Stored XSS)
    ```javascript
    function esc(s) { 
      return String(s||'')
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;')
        .replace(/'/g,'&#x27;')
        .replace(/\//g,'&#x2F;'); 
    }
    ```
*   **อัปเดตฟังก์ชัน `escHtml(s)` ใน `timetable.html`**:
    ```javascript
    const escHtml  = s => String(s||'')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#x27;')
      .replace(/\//g,'&#x2F;');
    ```

---

## 4. ข้อแนะนำสำหรับนักพัฒนาและผู้ดูแลระบบ
1. **ห้ามใช้รหัสผ่านที่เดาง่าย:** หลีกเลี่ยงการใช้รหัสผ่านประเภท `admin1234` ในบัญชีระดับ Super Admin
2. **จำกัดสิทธิ์คอมพิวเตอร์ที่ใช้แก้ไขตารางเรียน:** เครื่องที่ทำหน้าที่เป็น Admin ควรติดตั้งโปรแกรมป้องกันไวรัสและสปายแวร์ เพื่อป้องกันการถูกดึงข้อมูล JWT Token และประวัติเบราว์เซอร์ออกไป
