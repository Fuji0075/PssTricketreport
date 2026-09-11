# Ticket Report

เว็บแอปสำหรับบันทึก ticket งาน และดูสรุปงานที่ทำในแต่ละวัน

## ฟีเจอร์

- เพิ่ม / แก้ไข / ลบ ticket ผ่านฟอร์มบนเว็บ
- บันทึก note สิ่งที่ทำในแต่ละวันของแต่ละ ticket
- นำเข้า ticket จากไฟล์ CSV (ดูตัวอย่างที่ `data/sample-tickets.csv`)
- หน้าสรุปรายวัน: ticket ที่สร้างใหม่, ticket ที่ปิดแล้ว, บันทึกงานที่ทำ, และภาพรวมสถานะทั้งหมด

## เริ่มต้นใช้งาน

```bash
npm install
npm start
```

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
| POST | `/api/tickets/import` | นำเข้า ticket จากไฟล์ CSV (multipart field: `file`) |
| GET | `/api/summary/daily?date=YYYY-MM-DD` | สรุปงานประจำวัน |
