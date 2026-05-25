-- ============================================================
--  Timetable Military — SQL Server Express Schema
--  สร้างฐานข้อมูลสำหรับระบบตารางสอนทหาร
-- ============================================================

USE master;
GO

-- สร้าง Database ถ้ายังไม่มี
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'TimetableMilitary')
BEGIN
  CREATE DATABASE TimetableMilitary;
END
GO

USE TimetableMilitary;
GO

-- ============================================================
--  ตาราง Settings — ค่าตั้งต้นระบบ (เช่น ชื่อโรงเรียน)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Settings' AND xtype='U')
CREATE TABLE Settings (
  [key]   NVARCHAR(100) NOT NULL PRIMARY KEY,
  [value] NVARCHAR(MAX)
);
GO

-- ค่าเริ่มต้น
IF NOT EXISTS (SELECT 1 FROM Settings WHERE [key] = 'schoolName')
  INSERT INTO Settings([key],[value]) VALUES ('schoolName', N'โรงเรียนขนส่งทหารบก');
GO

-- ============================================================
--  ตาราง Users — ผู้ใช้งานระบบ
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
CREATE TABLE Users (
  id         INT           IDENTITY(1,1) PRIMARY KEY,
  username   NVARCHAR(50)  NOT NULL UNIQUE,
  password   NVARCHAR(255) NOT NULL,          -- bcrypt hash
  role       NVARCHAR(20)  NOT NULL DEFAULT 'user',  -- 'admin' | 'user'
  full_name  NVARCHAR(100),
  created_at DATETIME      NOT NULL DEFAULT GETDATE(),
  updated_at DATETIME      NOT NULL DEFAULT GETDATE()
);
GO

-- Admin เริ่มต้น (password: admin1234 — เปลี่ยนหลังติดตั้ง)
IF NOT EXISTS (SELECT 1 FROM Users WHERE username = 'admin')
  INSERT INTO Users(username, password, role, full_name)
  VALUES ('admin',
          '$2b$10$rQZ9uAVUiHELMsGjXfq7OeRVRb1xqHfZ.8nL5YkF6vBpUMDaJvRBu',
          'admin', N'ผู้ดูแลระบบ');
GO

-- ============================================================
--  ตาราง Courses — หลักสูตร
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Courses' AND xtype='U')
CREATE TABLE Courses (
  id           NVARCHAR(50)  NOT NULL PRIMARY KEY,   -- UUID จาก client
  name         NVARCHAR(255) NOT NULL,
  run_number   NVARCHAR(50),
  start_date   DATE,
  end_date     DATE,
  total_hours  INT,
  -- ข้อมูลผู้รับรองตาราง
  signer_label NVARCHAR(100),
  signer_rank  NVARCHAR(50),
  signer_name  NVARCHAR(100),
  signer_pos1  NVARCHAR(255),
  signer_pos2  NVARCHAR(255),
  signer_date  NVARCHAR(50),
  created_at   DATETIME      NOT NULL DEFAULT GETDATE(),
  updated_at   DATETIME      NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
--  ตาราง Entries — รายการสอน + วันหยุด
--  type: 'lesson' | 'holiday'
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Entries' AND xtype='U')
CREATE TABLE Entries (
  id          NVARCHAR(50)   NOT NULL PRIMARY KEY,   -- UUID จาก client
  course_id   NVARCHAR(50)   NOT NULL
                REFERENCES Courses(id) ON DELETE CASCADE ON UPDATE CASCADE,
  type        NVARCHAR(20)   NOT NULL DEFAULT 'lesson',
  entry_date  DATE,
  week        INT,
  -- สำหรับ lesson
  start_time  NVARCHAR(10),
  end_time    NVARCHAR(10),
  subject     NVARCHAR(255),
  teacher1    NVARCHAR(100),
  teacher2    NVARCHAR(100),
  teacher3    NVARCHAR(100),
  rank1       NVARCHAR(50),
  rank2       NVARCHAR(50),
  rank3       NVARCHAR(50),
  method      NVARCHAR(100),
  location    NVARCHAR(100),
  evidence    NVARCHAR(100),
  uniform     NVARCHAR(100),
  notes       NVARCHAR(500),
  cum_hours   DECIMAL(6,1),
  total_hours DECIMAL(6,1),
  -- สำหรับ holiday
  label       NVARCHAR(255),
  created_at  DATETIME       NOT NULL DEFAULT GETDATE(),
  updated_at  DATETIME       NOT NULL DEFAULT GETDATE()
);
GO

-- Index เพื่อเพิ่มความเร็วในการค้นหาตาม course + วันที่
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Entries_Course_Date' AND object_id = OBJECT_ID('Entries'))
  CREATE INDEX IX_Entries_Course_Date ON Entries(course_id, entry_date);
GO

-- ============================================================
--  Trigger: อัปเดต updated_at อัตโนมัติ
-- ============================================================
-- Courses
IF OBJECT_ID('trg_Courses_Updated', 'TR') IS NOT NULL DROP TRIGGER trg_Courses_Updated;
GO
CREATE TRIGGER trg_Courses_Updated ON Courses AFTER UPDATE AS
  UPDATE Courses SET updated_at = GETDATE()
  WHERE id IN (SELECT id FROM inserted);
GO

-- Entries
IF OBJECT_ID('trg_Entries_Updated', 'TR') IS NOT NULL DROP TRIGGER trg_Entries_Updated;
GO
CREATE TRIGGER trg_Entries_Updated ON Entries AFTER UPDATE AS
  UPDATE Entries SET updated_at = GETDATE()
  WHERE id IN (SELECT id FROM inserted);
GO

PRINT N'Schema created successfully.';
GO
