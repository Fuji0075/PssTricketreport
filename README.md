# Ticket Report

เว็บแอปสำหรับบันทึก ticket งาน และดูสรุปงานที่ทำในแต่ละวัน

## ฟีเจอร์

- **Dashboard แบบ Kanban ที่คลิกได้**: การ์ด ticket แยกตามสถานะ Open / In Progress / **On Hold** / Done, คลิกการ์ดเพื่อดู/แก้ไขรายละเอียด, กดปุ่มลูกศรเพื่อเลื่อนสถานะเร็วๆ, กดปุ่ม "‖ พัก" เพื่อพักงาน (กรณีรอช่าง) และ "▶ กลับมาทำ" เพื่อกลับมาทำต่อ, กด stat card ด้านบนเพื่อกรองดูเฉพาะสถานะ
- เพิ่ม / แก้ไข / ลบ ticket ผ่านฟอร์มบนเว็บ, ปุ่ม "+ เพิ่ม Ticket" อยู่บน Dashboard ด้วย
- **แชทในตัว ticket**: ช่องแชทสำหรับบันทึกความคืบหน้า/งานเพิ่มเติมของแต่ละ ticket แบบข้อความ (แสดงเป็นบับเบิลแชทเรียงตามเวลา)
- **แนบรูปภาพ** ในแต่ละ ticket (ปุ่ม "+ รูป" หรือวางรูปสกรีนช็อตด้วย Ctrl+V ในหน้าต่างรายละเอียด ticket ได้เลย) — คลิกรูปเพื่อดูแบบเต็มจอในหน้าเดิม ไม่เปิดแท็บใหม่
- **แก้ไขวันที่สร้าง ticket ได้** ในหน้าต่างรายละเอียด (เผื่อกรณีต้องย้อนหลัง/แก้ไขวันที่ให้ตรง)
- **บันทึกอัตโนมัติ (Auto-save)**: ในหน้าต่างรายละเอียด ticket ไม่ต้องกดปุ่ม "บันทึก" อีกแล้ว — เปลี่ยน Status/Priority/วันที่ จะเซฟทันที ส่วนช่องข้อความ (ชื่อ/ผู้รับผิดชอบ/รายละเอียด) จะเซฟทันทีที่คลิกออกจากช่อง (เช่น ตอนจะปิดหน้าต่างเพื่อไปดู ticket อื่น) มีตัวขึ้น "✓ บันทึกแล้ว" ให้เห็นชัดเจน
- นำเข้า ticket จากไฟล์ CSV (ดูตัวอย่างที่ `data/sample-tickets.csv`)
- หน้าสรุปรายวัน: ticket ที่สร้างใหม่, ticket ที่ปิดแล้ว, บันทึกงานที่ทำ, และภาพรวมสถานะทั้งหมด
- **แจ้งเตือนงานค้าง**: แบนเนอร์แจ้งเตือนอัตโนมัติเมื่อมี ticket ที่ยังไม่ปิดและไม่มีความเคลื่อนไหวเกิน 2 วัน
- **หน้า AnyDesk Directory**: ค้นหา ID AnyDesk (Admin/Entry/Exit) ของแต่ละสาขาได้ในที่เดียว ไม่ต้องเปิดไฟล์ Excel แยก (seed ข้อมูลเริ่มต้นจาก `data/anydesk-directory.json`) พร้อม**เพิ่ม/แก้ไข/ลบสาขาและอุปกรณ์ได้ในหน้าเว็บ** และแท็กสี **"โปรแกรม"** (AnyDesk / PSS GO) บอกว่าสาขานั้นต้องเปิดโปรแกรมอะไรเพื่อรีโมทเข้า
- **ฟิลด์บริษัท/สาขา** ตอนเปิด ticket ใหม่ — พิมพ์แล้วมี autocomplete จากรายชื่อสาขาใน AnyDesk Directory ให้เลือก แสดงเป็นแท็กสีม่วงบนการ์ด Dashboard ด้วย
- **การ์ด Dashboard แสดงรูปภาพ**: ถ้า ticket มีรูปแนบ รูปแรกจะขึ้นเป็นภาพหน้าปกบนการ์ด คลิกดูแบบเต็มได้เลยโดยไม่ต้องเปิดหน้าต่างรายละเอียด
- **Knowledge Base**: บันทึกปัญหาที่เคยเจอและวิธีแก้ไว้เป็นบทความ ค้นหาได้ และในหน้าต่างรายละเอียด ticket มีปุ่ม "ค้นหาคำแนะนำ" ที่จะจับคู่คำในหัวข้อ/รายละเอียด ticket กับบทความที่ใกล้เคียงให้อัตโนมัติ — ถ้าตั้งค่า environment variable `ANTHROPIC_API_KEY` ไว้ ระบบจะเรียก Claude ให้ช่วยสรุปคำแนะนำเป็นภาษาที่อ่านง่ายด้วย (ถ้าไม่ตั้งค่าไว้ก็ยังใช้งานได้ปกติ แค่แสดงเฉพาะบทความที่ใกล้เคียง)

## เริ่มต้นใช้งาน

ต้องใช้ **Node.js เวอร์ชัน 22.5 ขึ้นไป** (ใช้ฐานข้อมูล SQLite ในตัวของ Node เอง ผ่าน `node:sqlite`
ไม่ต้องติดตั้ง native module หรือ Visual Studio Build Tools ใดๆ)

```bash
npm install
npm start
```

ตอนรันจะมี warning `ExperimentalWarning: SQLite is an experimental feature` ขึ้นมา ถือเป็นเรื่องปกติ ไม่ใช่ error

จากนั้นเปิดเบราว์เซอร์ไปที่ `http://localhost:3000`

ข้อมูลถูกเก็บในไฟล์ SQLite ที่ `data/tickets.db` (สร้างอัตโนมัติเมื่อรันครั้งแรก)

## รูปแบบไฟล์ CSV สำหรับนำเข้า

```csv
title,description,assignee,company,status,priority
แก้บั๊ก X,รายละเอียด,ชื่อผู้รับผิดชอบ,โรบินสัน ถลาง,open,medium
```

- `status`: `open`, `in-progress`, `on-hold`, `done`
- `priority`: `low`, `medium`, `high`, `urgent`

## API หลัก

| Method | Path | คำอธิบาย |
| --- | --- | --- |
| GET | `/api/tickets` | รายการ ticket ทั้งหมด (filter ด้วย `?status=`) |
| POST | `/api/tickets` | สร้าง ticket ใหม่ |
| GET | `/api/tickets/:id` | ดูรายละเอียด ticket พร้อม note |
| PUT | `/api/tickets/:id` | แก้ไข ticket |
| DELETE | `/api/tickets/:id` | ลบ ticket |
| POST | `/api/tickets/:id/notes` | เพิ่มบันทึกงานที่ทำสำหรับ ticket |
| POST | `/api/tickets/:id/attachments` | แนบรูปภาพให้ ticket (multipart field: `image`) |
| DELETE | `/api/tickets/:id/attachments/:attachmentId` | ลบรูปที่แนบไว้ |
| POST | `/api/tickets/import` | นำเข้า ticket จากไฟล์ CSV (multipart field: `file`) |
| GET | `/api/summary/daily?date=YYYY-MM-DD` | สรุปงานประจำวัน |
| GET | `/api/summary/pending?staleDays=2` | รายการ ticket ที่ค้าง (ยังไม่ปิด และไม่มีความเคลื่อนไหวเกิน `staleDays` วัน) |
| GET | `/api/anydesk?q=` | รายการสาขา + ID AnyDesk + โปรแกรม (ค้นหาด้วย `q`) |
| POST | `/api/anydesk` | เพิ่มสาขาใหม่ (`name`, `program`, `note`) |
| PUT | `/api/anydesk/:id` | แก้ไขชื่อ/หมายเหตุ/โปรแกรมของสาขา |
| DELETE | `/api/anydesk/:id` | ลบสาขา |
| POST | `/api/anydesk/:id/devices` | เพิ่มอุปกรณ์ AnyDesk ให้สาขา |
| PUT | `/api/anydesk/devices/:deviceId` | แก้ไขชื่อ/ID อุปกรณ์ |
| DELETE | `/api/anydesk/devices/:deviceId` | ลบอุปกรณ์ AnyDesk |
| GET | `/api/kb?q=` | รายการบทความ Knowledge Base (ค้นหาด้วย `q`) |
| POST | `/api/kb` | เพิ่มบทความใหม่ (`title`, `problem`, `solution`, `tags`) |
| PUT | `/api/kb/:id` | แก้ไขบทความ |
| DELETE | `/api/kb/:id` | ลบบทความ |
| POST | `/api/kb/recommend` | หาคำแนะนำจาก `title`/`description` — จับคู่คำกับ Knowledge Base และเรียก Claude API (ถ้าตั้งค่า `ANTHROPIC_API_KEY`) เพื่อสรุปคำแนะนำ |

### เปิดใช้ AI ช่วยแนะนำใน Knowledge Base (ไม่บังคับ)

ตั้งค่า environment variable ก่อนรัน `npm start`:

```bash
# Windows (Command Prompt)
set ANTHROPIC_API_KEY=your-api-key-here
npm start

# Windows (PowerShell)
$env:ANTHROPIC_API_KEY="your-api-key-here"
npm start
```

ถ้าไม่ตั้งค่าไว้ ปุ่ม "ค้นหาคำแนะนำ" จะยังทำงานได้ปกติ แค่แสดงเฉพาะบทความที่ใกล้เคียงจาก Knowledge Base โดยไม่มีสรุปจาก AI
