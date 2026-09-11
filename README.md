# Ticket Report

เว็บแอปสำหรับบันทึก ticket งาน และดูสรุปงานที่ทำในแต่ละวัน

## ฟีเจอร์

- เพิ่ม / แก้ไข / ลบ ticket ผ่านฟอร์มบนเว็บ
- บันทึก note สิ่งที่ทำในแต่ละวันของแต่ละ ticket
- **แนบรูปภาพ** ในแต่ละ ticket (ปุ่ม "+ รูป")
- นำเข้า ticket จากไฟล์ CSV (ดูตัวอย่างที่ `data/sample-tickets.csv`)
- หน้าสรุปรายวัน: ticket ที่สร้างใหม่, ticket ที่ปิดแล้ว, บันทึกงานที่ทำ, และภาพรวมสถานะทั้งหมด
- **แจ้งเตือนงานค้าง**: แบนเนอร์แจ้งเตือนอัตโนมัติเมื่อมี ticket ที่ยังไม่ปิดและไม่มีความเคลื่อนไหวเกิน 2 วัน
- **หน้า AnyDesk Directory**: ค้นหา ID AnyDesk (Admin/Entry/Exit) ของแต่ละสาขาได้ในที่เดียว ไม่ต้องเปิดไฟล์ Excel แยก (seed ข้อมูลเริ่มต้นจาก `data/anydesk-directory.json`)

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
title,description,assignee,status,priority
แก้บั๊ก X,รายละเอียด,ชื่อผู้รับผิดชอบ,open,medium
```

- `status`: `open`, `in-progress`, `done`
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
| GET | `/api/anydesk?q=` | รายการสาขา + ID AnyDesk (ค้นหาด้วย `q`) |
| POST | `/api/anydesk` | เพิ่มสาขาใหม่ |
| PUT | `/api/anydesk/:id` | แก้ไขชื่อ/หมายเหตุสาขา |
| DELETE | `/api/anydesk/:id` | ลบสาขา |
| POST | `/api/anydesk/:id/devices` | เพิ่มอุปกรณ์ AnyDesk ให้สาขา |
| DELETE | `/api/anydesk/devices/:deviceId` | ลบอุปกรณ์ AnyDesk |
